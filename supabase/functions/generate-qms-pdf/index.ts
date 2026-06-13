// Supabase Edge Function — generate-qms-pdf
// يُولِّد ملفات PDF لسجلات generated_forms المعلَّقة (is_ready = false)
// يرفعها إلى Supabase Storage (bucket خاص) ثم يُحدِّث السجل بـ storage_path وis_ready = true
// (pdf_url=null؛ الوصول لاحقاً عبر signed URL قصير الأجل يُولَّد server-side عند الطلب)
//
// دعم العربية (Phase 3C):
//   - الخط: Amiri (Naskh رسمي) مُضمَّن محلياً من ./assets — يغطّي كامل Arabic Presentation Forms-B
//     (مُتحقَّق منه: 0 محارف ناقصة) فيُعرَض التشكيل عبر drawText دون نقص.
//   - التشكيل: arabic-persian-reshaper (أشكال الحروف السياقية) + bidi-js (إعادة ترتيب RTL) — استيراد
//     Edge عبر esm.sh فقط، لا يمسّ package.json. pdf-lib لا يملك محرّك تشكيل، فالنصّ يُشكَّل ويُرتَّب
//     قبل الرسم. الترويسة تحمل اسم المدرسة ديناميكياً من schools.name (مصدر موثوق server-side).
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
import { PDFDocument, PDFFont, PDFPage, rgb } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import reshaperModule from 'https://esm.sh/arabic-persian-reshaper@1.0.1';
import bidiFactory from 'https://esm.sh/bidi-js@1.0.3';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET               = Deno.env.get('CRON_SECRET');

const STORAGE_BUCKET = 'qms-forms';
const PAGE_W = 595, PAGE_H = 842, MARGIN = 50; // A4

// ── طبقة التشكيل العربي (CJS interop آمن عبر esm.sh) ──
const ArabicShaper = (
  reshaperModule as { ArabicShaper?: { convertArabic(s: string): string }; default?: { ArabicShaper: { convertArabic(s: string): string } } }
).ArabicShaper ?? (reshaperModule as { default?: { ArabicShaper: { convertArabic(s: string): string } } }).default!.ArabicShaper;

const bidi = bidiFactory();

/** يُحوِّل نصاً منطقياً إلى نصّ بصري جاهز للرسم: أشكال الحروف السياقية + ترتيب RTL.
 *  pdf-lib يرسم يساراً-ليميناً، فبعد التشكيل وإعادة الترتيب يظهر النص العربي صحيحاً. */
function ar(text: string | number | null | undefined): string {
  const s = text === null || text === undefined ? '' : String(text);
  if (!s) return '';
  const shaped = ArabicShaper.convertArabic(s);
  const embeddingLevels = bidi.getEmbeddingLevels(shaped, 'rtl');
  return bidi.getReorderedString(shaped, embeddingLevels);
}

// ── تحميل الخط مرّة واحدة (cache عبر الاستدعاءات) ──
let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;
async function loadFontBytes(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (!fontCache) {
    fontCache = {
      regular: await Deno.readFile(new URL('./assets/Amiri-Regular.ttf', import.meta.url)),
      bold:    await Deno.readFile(new URL('./assets/Amiri-Bold.ttf',    import.meta.url)),
    };
  }
  return fontCache;
}

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
}

// ── مساعدات الرسم (RTL) ──
function rightAligned(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = rgb(0.15, 0.15, 0.15)) {
  const visual = ar(text);
  if (!visual) return;
  const w = font.widthOfTextAtSize(visual, size);
  page.drawText(visual, { x: PAGE_W - MARGIN - w, y, size, font, color });
}
function leftAligned(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = rgb(0.4, 0.4, 0.4)) {
  const visual = ar(text);
  if (!visual) return;
  page.drawText(visual, { x: MARGIN, y, size, font, color });
}
function centered(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = rgb(0.1, 0.1, 0.1)) {
  const visual = ar(text);
  if (!visual) return;
  const w = font.widthOfTextAtSize(visual, size);
  page.drawText(visual, { x: (PAGE_W - w) / 2, y, size, font, color });
}

async function buildPdf(form: GeneratedFormRow, schoolName: string): Promise<Uint8Array> {
  const { regular, bold } = await loadFontBytes();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font     = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold,    { subset: true });

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 60;

  // ── ترويسة رسمية ديناميكية ──
  centered(page, schoolName || 'المدرسة', y, 18, boldFont, rgb(0.05, 0.27, 0.42)); y -= 22;
  centered(page, 'نظام إدارة الجودة', y, 12, font, rgb(0.2, 0.2, 0.2)); y -= 15;
  centered(page, 'منصة سِدرة', y, 9, font, rgb(0.45, 0.45, 0.45)); y -= 18;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 22;

  // ── بيانات وصفية: رمز النموذج (يمين) + تاريخ التوليد (يسار) ──
  const generatedDate = new Date().toISOString().split('T')[0];
  rightAligned(page, `رمز النموذج: ${form.form_code}`, y, 11, boldFont, rgb(0.1, 0.2, 0.5));
  leftAligned(page, `تاريخ التوليد: ${generatedDate}`, y, 10, font, rgb(0.4, 0.4, 0.4));
  y -= 16;
  leftAligned(page, `المصدر: ${form.source_table}`, y, 8, font, rgb(0.55, 0.55, 0.55));
  y -= 26;

  // ── جسم النموذج: تسمية: قيمة (RTL) ──
  const data = form.form_data ?? {};
  const entries = Object.entries(data);
  if (entries.length === 0) {
    rightAligned(page, 'لا توجد بيانات مسجَّلة لهذا النموذج.', y, 10, font, rgb(0.5, 0.5, 0.5));
    y -= 18;
  }
  for (const [key, value] of entries) {
    if (y < 70) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 60;
    }
    const label    = String(key).replace(/_/g, ' ');
    const rawValue = value === null || value === undefined ? '—' : String(value);
    const display  = rawValue.length > 80 ? rawValue.slice(0, 80) + '…' : rawValue;
    rightAligned(page, `${label}: ${display}`, y, 10, font, rgb(0.15, 0.15, 0.15));
    y -= 18;
  }

  // ── تذييل كل الصفحات ──
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    centered(p, `منصة سِدرة — ${form.form_code} — صفحة ${i + 1} من ${pages.length}`, 30, 8, font, rgb(0.6, 0.6, 0.6));
  });

  return await doc.save();
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

  // التحقق من الـ CRON_SECRET — **fail-closed**:
  // إن غاب السرّ من البيئة → الخدمة غير مُهيّأة، نرفض ولا نُولّد شيئاً (لا fail-open).
  if (!CRON_SECRET) {
    console.error('[generate-qms-pdf] CRON_SECRET غير مضبوط — رفض fail-closed.');
    return new Response(JSON.stringify({ error: 'الخدمة غير مُهيّأة' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${CRON_SECRET}`) {
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

  // اسم المدرسة من مصدر موثوق server-side عبر school_id (لا يُقبَل اسم من العميل)
  let schoolName = 'المدرسة';
  const { data: schoolRow } = await supabase
    .from('schools')
    .select('name')
    .eq('id', school_id)
    .maybeSingle();
  if (schoolRow?.name) schoolName = String(schoolRow.name);

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
      const pdfBytes = await buildPdf(form, schoolName);

      // رفع إلى Supabase Storage (bucket **خاص** qms-forms)
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

      // **لا رابط عام**: المصدر المعتمد هو storage_path؛ pdf_url يبقى null.
      // الوصول يكون عبر signed URL قصير الأجل يُولَّد server-side عند الطلب (lib/quality/qms-pdf.ts)
      // بعد التحقق من صلاحية المستخدم للسجل عبر RLS. ملف الجودة قد يحوي بيانات حسّاسة → لا يُكشف للعموم.
      const { error: updateErr } = await supabase
        .from('generated_forms')
        .update({
          is_ready:     true,
          pdf_url:      null,
          storage_path: storagePath,
          generated_at: new Date().toISOString(),
        })
        .eq('id', form.id)
        .eq('school_id', school_id);

      if (updateErr) {
        errors.push(`form ${form.id} update: ${updateErr.message}`);
        continue;
      }

      processed.push({ form_id: form.id, storage_path: storagePath });
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
