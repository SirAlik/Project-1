// Supabase Edge Function — generate-qms-pdf
// يُولِّد ملفات PDF لسجلات generated_forms المعلَّقة (is_ready = false)
// يرفعها إلى Supabase Storage ثم يُحدِّث السجل بـ pdf_url وis_ready = true
//
// متغيرات البيئة المطلوبة:
//   SUPABASE_URL                — رابط مشروع Supabase
//   SUPABASE_SERVICE_ROLE_KEY   — مفتاح service role
//   CRON_SECRET                 — سر الجدولة للحماية من الاستدعاء العشوائي
//
// الاستدعاء:
//   POST /functions/v1/generate-qms-pdf
//   Authorization: Bearer <CRON_SECRET>
//   Body: { school_id: string, form_id?: string }
//   form_id اختياري — إذا غاب تُعالَج كل السجلات المعلَّقة للمدرسة

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET               = Deno.env.get('CRON_SECRET');

const STORAGE_BUCKET = 'qms-forms';

interface GeneratedFormRow {
  id:           string;
  school_id:    string;
  form_code:    string;
  form_data:    Record<string, unknown> | null;
  source_table: string;
  source_record_id: string;
}

interface PdfResult {
  form_id:      string;
  storage_path: string;
  pdf_url:      string;
}

async function buildPdf(form: GeneratedFormRow): Promise<Uint8Array> {
  const doc      = await PDFDocument.create();
  const page     = doc.addPage([595, 842]); // A4
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  let y = height - 60;

  // عنوان النموذج
  page.drawText(form.form_code, {
    x: 50, y,
    size: 18, font: boldFont,
    color: rgb(0.1, 0.2, 0.5),
  });
  y -= 10;

  // خط فاصل
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 1, color: rgb(0.7, 0.7, 0.7),
  });
  y -= 25;

  // معلومات المصدر
  page.drawText(`Source: ${form.source_table} / ${form.source_record_id}`, {
    x: 50, y, size: 9, font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 8;
  page.drawText(`Generated: ${new Date().toISOString().split('T')[0]}`, {
    x: 50, y, size: 9, font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 30;

  // بيانات النموذج — key: value
  const data = form.form_data ?? {};
  for (const [key, value] of Object.entries(data)) {
    if (y < 80) {
      // صفحة جديدة إذا نفد المكان
      const newPage = doc.addPage([595, 842]);
      y = newPage.getSize().height - 60;
    }

    const label     = String(key).replace(/_/g, ' ');
    const rawValue  = value === null || value === undefined ? '—' : String(value);
    const displayVal = rawValue.length > 90 ? rawValue.slice(0, 90) + '...' : rawValue;

    page.drawText(`${label}:`, {
      x: 50, y, size: 10, font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(displayVal, {
      x: 200, y, size: 10, font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 20;
  }

  // تذييل الصفحة
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Sidra OS — ${form.form_code}  |  Page ${i + 1} of ${pages.length}`, {
      x: 50, y: 30, size: 8, font,
      color: rgb(0.6, 0.6, 0.6),
    });
  });

  return doc.save();
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

  // التحقق من الـ CRON_SECRET
  const auth = req.headers.get('Authorization') ?? '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'غير مصرح' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { school_id: string; form_id?: string };
  try {
    body = await req.json() as { school_id: string; form_id?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'JSON غير صالح' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { school_id, form_id } = body ?? {};
  if (!school_id) {
    return new Response(JSON.stringify({ error: 'school_id مطلوب' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // جلب السجلات المعلَّقة
  let query = supabase
    .from('generated_forms')
    .select('id, school_id, form_code, form_data, source_table, source_record_id')
    .eq('school_id', school_id)
    .eq('is_ready', false);

  if (form_id) query = query.eq('id', form_id);

  const { data: forms, error: fetchErr } = await query;
  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const processed: PdfResult[] = [];
  const errors:    string[]    = [];

  for (const form of (forms ?? []) as GeneratedFormRow[]) {
    try {
      // توليد PDF
      const pdfBytes = await buildPdf(form);

      // رفع إلى Supabase Storage
      const storagePath = `${school_id}/${form.form_code}/${form.id}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, pdfBytes, {
          contentType:  'application/pdf',
          upsert:       true,
        });

      if (uploadErr) {
        errors.push(`form ${form.id} upload: ${uploadErr.message}`);
        continue;
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const pdfUrl = urlData?.publicUrl ?? '';

      // تحديث السجل
      const { error: updateErr } = await supabase
        .from('generated_forms')
        .update({
          is_ready:     true,
          pdf_url:      pdfUrl,
          storage_path: storagePath,
          generated_at: new Date().toISOString(),
        })
        .eq('id', form.id)
        .eq('school_id', school_id);

      if (updateErr) {
        errors.push(`form ${form.id} update: ${updateErr.message}`);
        continue;
      }

      processed.push({ form_id: form.id, storage_path: storagePath, pdf_url: pdfUrl });
    } catch (err) {
      errors.push(`form ${form.id}: ${String(err)}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok:              errors.length === 0,
      processed_count: processed.length,
      error_count:     errors.length,
      processed,
      errors,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
