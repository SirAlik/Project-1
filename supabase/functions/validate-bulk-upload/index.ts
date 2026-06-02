// Supabase Edge Function — validate-bulk-upload
// يُستدعى من نظام الرفع المجمّع قبل معالجة ملف CSV
// يتحقق من: الأعمدة المطلوبة + تنسيق البيانات + وجود class_id في DB + تكرار الرقم الوطني
//
// متغيرات البيئة المطلوبة:
//   SUPABASE_URL                — رابط مشروع Supabase
//   SUPABASE_SERVICE_ROLE_KEY   — مفتاح service role
//
// الاستدعاء:
//   POST /functions/v1/validate-bulk-upload
//   Authorization: Bearer <user-jwt>
//   Content-Type: application/json
//   Body: { rows: CsvRow[], school_id: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REQUIRED_COLUMNS = ['name', 'national_id', 'grade_level'] as const;

interface CsvRow {
  name?:         string;
  national_id?:  string;
  grade_level?:  string;
  class_id?:     string;
  parent_phone?: string;
  [key: string]: string | undefined;
}

interface ValidationIssue {
  row:     number;
  field:   string;
  message: string;
}

interface ValidationResult {
  valid:         boolean;
  total_rows:    number;
  error_count:   number;
  warning_count: number;
  errors:        ValidationIssue[];
  warnings:      ValidationIssue[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST فقط' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'غير مصرح' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { rows: CsvRow[]; school_id: string };
  try {
    body = await req.json() as { rows: CsvRow[]; school_id: string };
  } catch {
    return new Response(JSON.stringify({ error: 'JSON غير صالح' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { rows, school_id } = body ?? {};
  if (!Array.isArray(rows) || !rows.length || !school_id) {
    return new Response(JSON.stringify({ error: 'rows و school_id مطلوبان' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // التحقق من صلاحية الـ JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token    = authHeader.slice(7);
  const { error: authErr } = await supabase.auth.getUser(token);
  if (authErr) {
    return new Response(JSON.stringify({ error: 'رمز المصادقة غير صالح' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // جلب الفصول الموجودة في هذه المدرسة دفعةً واحدة
  const uniqueClassIds = [...new Set(rows.map(r => r.class_id).filter(Boolean))] as string[];
  const classIdSet     = new Set<string>();

  if (uniqueClassIds.length > 0) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', school_id)
      .in('id', uniqueClassIds);
    (classes ?? []).forEach((c: { id: string }) => classIdSet.add(c.id));
  }

  // ──────────────────────── فحص كل صف ─────────────────────────
  const errors:   ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seenNids  = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // الصف 1 = الرأس

    // الأعمدة المطلوبة
    for (const col of REQUIRED_COLUMNS) {
      if (!row[col]?.trim()) {
        errors.push({ row: rowNum, field: col, message: `الحقل مطلوب` });
      }
    }

    // تنسيق الرقم الوطني — 10 أرقام
    const nid = row.national_id?.trim() ?? '';
    if (nid) {
      if (!/^\d{10}$/.test(nid)) {
        errors.push({ row: rowNum, field: 'national_id', message: 'يجب أن يكون 10 أرقام' });
      } else if (seenNids.has(nid)) {
        errors.push({ row: rowNum, field: 'national_id', message: `مكرر داخل الملف (${nid})` });
      } else {
        seenNids.add(nid);
      }
    }

    // وجود class_id في DB
    const cid = row.class_id?.trim();
    if (cid && !classIdSet.has(cid)) {
      errors.push({ row: rowNum, field: 'class_id', message: `الفصل غير موجود في هذه المدرسة` });
    }

    // تحذيرات — غير مانعة
    if (!row.parent_phone?.trim()) {
      warnings.push({ row: rowNum, field: 'parent_phone', message: 'رقم هاتف ولي الأمر فارغ' });
    }
    const grade = parseInt(row.grade_level ?? '', 10);
    if (!isNaN(grade) && (grade < 1 || grade > 12)) {
      warnings.push({ row: rowNum, field: 'grade_level', message: `الصف "${grade}" خارج النطاق 1–12` });
    }
  });

  const result: ValidationResult = {
    valid:         errors.length === 0,
    total_rows:    rows.length,
    error_count:   errors.length,
    warning_count: warnings.length,
    errors,
    warnings,
  };

  return new Response(JSON.stringify(result), {
    status:  200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
