import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getActivePersona } from '@/lib/auth/context-service';
import type { BulkJobType, BulkValidationError, BulkValidationSummary } from '@/lib/types/layer7';
import { JOB_TYPE_SCHEMA } from '@/lib/types/layer7';

const MAX_ROWS = 1000;

// ── التحقق من student_enrollment
function validateStudentEnrollmentRows(
  rows: Record<string, string>[],
): { errors: BulkValidationError[]; validRows: Record<string, string>[] } {
  const errors: BulkValidationError[] = [];
  const seenNationalIds = new Set<string>();
  const validRows: Record<string, string>[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 لأن الصف 1 هو الـ header
    let rowValid = true;

    // التحقق من الاسم
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, column: 'name', message: 'الاسم مطلوب' });
      rowValid = false;
    }

    // التحقق من الهوية الوطنية
    const nid = row.national_id?.trim();
    if (!nid) {
      errors.push({ row: rowNum, column: 'national_id', message: 'رقم الهوية مطلوب' });
      rowValid = false;
    } else if (!/^\d{10}$/.test(nid)) {
      errors.push({ row: rowNum, column: 'national_id', message: 'رقم الهوية يجب أن يكون 10 أرقام' });
      rowValid = false;
    } else if (seenNationalIds.has(nid)) {
      errors.push({ row: rowNum, column: 'national_id', message: `رقم الهوية ${nid} مكرر في الملف` });
      rowValid = false;
    } else {
      seenNationalIds.add(nid);
    }

    // التحقق من grade_level إذا وُجد
    const gl = row.grade_level?.trim();
    if (gl && (isNaN(Number(gl)) || Number(gl) < 1 || Number(gl) > 12)) {
      errors.push({ row: rowNum, column: 'grade_level', message: 'المستوى الدراسي يجب أن يكون رقماً من 1 إلى 12' });
      rowValid = false;
    }

    if (rowValid) validRows.push(row);
  });

  return { errors, validRows };
}

export async function POST(request: NextRequest) {
  // التحقق من الـ auth
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return NextResponse.json({ ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' }, { status: 401 });
  }

  const allowedRoles = ['school_principal', 'school_admin', 'school_secretary', 'system_owner'];
  if (!allowedRoles.includes(persona.role) && !persona.isSystemOwner) {
    return NextResponse.json({ ok: false, error: 'ليس لديك صلاحية رفع الملفات' }, { status: 403 });
  }

  // قراءة الـ multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'تعذّر قراءة الملف المرفق' }, { status: 400 });
  }

  const file    = formData.get('file')     as File   | null;
  const jobType = formData.get('job_type') as BulkJobType | null;

  if (!file)    return NextResponse.json({ ok: false, error: 'لم يُرفق أي ملف' }, { status: 400 });
  if (!jobType) return NextResponse.json({ ok: false, error: 'نوع المهمة مطلوب' }, { status: 400 });

  const schema = JOB_TYPE_SCHEMA[jobType];
  if (!schema) {
    return NextResponse.json({ ok: false, error: `نوع المهمة "${jobType}" غير مدعوم` }, { status: 400 });
  }

  // قراءة محتوى الملف
  let csvText: string;
  try {
    csvText = await file.text();
  } catch {
    return NextResponse.json({ ok: false, error: 'تعذّر قراءة محتوى الملف' }, { status: 400 });
  }

  // تحليل CSV
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header:          true,
    skipEmptyLines:  true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return NextResponse.json({
      ok:    false,
      error: `خطأ في تنسيق الملف: ${parseResult.errors[0]?.message}`,
    }, { status: 400 });
  }

  const allRows = parseResult.data.slice(0, MAX_ROWS);

  if (allRows.length === 0) {
    return NextResponse.json({ ok: false, error: 'الملف فارغ أو لا يحتوي على بيانات صالحة' }, { status: 400 });
  }

  // التحقق من الأعمدة المطلوبة
  const headers     = Object.keys(allRows[0] ?? {});
  const missingCols = schema.required.filter((col) => !headers.includes(col));
  if (missingCols.length > 0) {
    return NextResponse.json({
      ok:    false,
      error: `الملف يفتقر إلى الأعمدة التالية: ${missingCols.join(', ')}`,
    }, { status: 400 });
  }

  // التحقق من الصفوف
  let errors: BulkValidationError[]        = [];
  let validRows: Record<string, string>[]  = [];

  if (jobType === 'student_enrollment') {
    const result = validateStudentEnrollmentRows(allRows);
    errors    = result.errors;
    validRows = result.validRows;
  }

  const summary: BulkValidationSummary = {
    total_rows: allRows.length,
    valid_rows: validRows.length,
    error_rows: allRows.length - validRows.length,
    errors:     errors.slice(0, 50), // أول 50 خطأ فقط في الاستجابة
    preview:    allRows.slice(0, 5),
  };

  return NextResponse.json({
    ok:          true,
    summary,
    parsed_rows: validRows,
    file_name:   file.name,
  });
}
