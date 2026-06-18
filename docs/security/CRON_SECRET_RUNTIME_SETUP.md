# إعداد CRON_SECRET + QMS PDF الآمن — Runtime Setup (إجراء المالك)

> **النوع:** قائمة تحقّق إعداد إنتاجي — **إجراء مالك** (يتطلّب صلاحيات Vercel + Supabase Edge).
> **التاريخ:** 2026-06-13 · **HEAD:** `2c2100c` · **المشروع:** SIDRA OS — **PRE-LAUNCH، لم يُنشر للإنتاج بعد**.
> **قاعدة:** **لا تكتب القيمة السرّية الحقيقية في هذا الملف ولا في git ولا في السجلّات.**

---

## 0) الحالة الراهنة (مُتحقَّق منها read-only)

| العنصر | الحالة |
| --- | --- |
| `app_private.secrets.cron_secret` | **placeholder** (`REPLACE_BEFORE_LAUNCH`) — لم يُضبط بعد |
| `app_private.secrets.cron_site_url` | **placeholder** — لم يُضبط بعد |
| `app_private.secrets.ledger_secret_salt` | ✅ مُدوّر (عشوائي 64-hex) |
| Vercel CLI / ربط المشروع محلياً | ❌ غير متوفّر |
| رابط نشر Vercel حقيقي | ❌ غير موجود (لم يُنشر المشروع بعد) |
| Edge function `generate-qms-pdf` | ❌ غير منشور (لا edge functions منشورة) |
| bucket `qms-forms` | ✅ **خاص** (public=false) |

> **مهم:** ما دامت الأسرار placeholders، فإنّ cron و`generate-qml-pdf` **fail-closed** (ترفض ولا تعمل) — وهذا **آمن**. لا ثغرة. الإعداد أدناه يُفعّلها فقط عند الإطلاق.

---

## 1) CRON_SECRET — يجب أن يتطابق في **ثلاثة** مواضع

السرّ نفسه (قيمة واحدة قوية) في الثلاثة، وإلا تفشل المصادقة (fail-closed):

| # | الموضع | يستخدمه | كيف يُضبط |
| --- | --- | --- | --- |
| 1 | **Vercel Environment Variable** `CRON_SECRET` | مسارات Next.js cron (`/api/cron/*`) | Vercel Dashboard → Project → Settings → Environment Variables |
| 2 | **Supabase Edge Function Secret** `CRON_SECRET` | `generate-qms-pdf` (يقرأ `Deno.env.get('CRON_SECRET')`) | `supabase secrets set` أو Dashboard → Edge Functions → Secrets |
| 3 | **DB** `app_private.secrets` (`name='cron_secret'`) | `pg_cron` (يُرسل Bearer عند نداء المسارات) | `UPDATE` SQL (أدناه) |

---

## 2) الخطوات الدقيقة (المالك)

### أ) توليد سرّ قوي واحد (محلياً — لا تُشاركه/تطبعه في أي تقرير)
```bash
openssl rand -hex 32
```

### ب) Vercel env (الموضع 1) — Dashboard
1. Vercel → اختر المشروع → **Settings → Environment Variables**.
2. Add: Key = `CRON_SECRET` · Value = `<السرّ>` · Environments = Production (+ Preview إن لزم).
3. Save.
> أو عبر CLI (إن ثُبِّت ورُبط): `vercel link` ثم `vercel env add CRON_SECRET production`.

### ج) Supabase Edge secret (الموضع 2)
```bash
# يتطلّب Supabase CLI + ربط المشروع:
supabase secrets set CRON_SECRET="<نفس السرّ>"
# أو: Dashboard → Edge Functions → Manage secrets → Add CRON_SECRET
```

### د) DB app_private.secrets (الموضع 3 + الرابط)
```sql
-- نفس قيمة CRON_SECRET أعلاه:
UPDATE app_private.secrets SET secret = '<نفس السرّ>'                         WHERE name = 'cron_secret';
-- رابط النشر الإنتاجي الحقيقي (لا localhost، لا placeholder):
UPDATE app_private.secrets SET secret = 'https://<your-app>.vercel.app'        WHERE name = 'cron_site_url';
```

### هـ) إعادة النشر + نشر Edge
1. **Redeploy Vercel** بعد إضافة المتغيّر (ليتوفّر `CRON_SECRET` للـruntime): Vercel → Deployments → Redeploy (أو push جديد).
2. **نشر Edge** عند الحاجة: `supabase functions deploy generate-qms-pdf` (خارج نطاق هذه المهمة — لا تُنشر تلقائياً).

---

## 3) التحقّق بعد الإعداد

### أ) DB (read-only)
```sql
select name,
  (secret like '%REPLACE_BEFORE_LAUNCH%' or secret like '%ROTATE_BEFORE_LAUNCH%') as is_placeholder
from app_private.secrets order by name;   -- المتوقّع: is_placeholder=false للثلاثة
select public from storage.buckets where id='qms-forms';   -- المتوقّع: false (خاص)
```

### ب) سلوك `generate-qms-pdf` (fail-closed — مُثبَت في الكود)
- **بلا سرّ** (`CRON_SECRET` غير مضبوط) → **503** ولا توليد. (`index.ts:170`)
- **سرّ خاطئ** (Bearer لا يطابق) → **401**. (`index.ts:177`)
- **سرّ صحيح** → يُتابع المعالجة. (`index.ts:181+`)
```bash
# بعد النشر فقط — اختبارات HTTP آمنة (تتطلّب الدالة منشورة):
curl -s -o /dev/null -w "%{http_code}" -X POST "$EDGE_URL/generate-qms-pdf" -d '{"school_id":"<uuid>"}'                # متوقّع 401 (بلا Bearer)
curl -s -o /dev/null -w "%{http_code}" -X POST "$EDGE_URL/generate-qms-pdf" -H "Authorization: Bearer wrong" -d '{...}'  # متوقّع 401
# سرّ صحيح + لا نماذج معلّقة → success بقائمة فارغة (لا بيانات وهمية)
```

### ج) خصوصية QMS PDF (مُثبَت)
- bucket `qms-forms` **خاص**؛ **لا `getPublicUrl`**؛ `generated_forms.pdf_url` يبقى `null`؛ `storage_path` هو المصدر.
- الوصول عبر `getQmsPdfSignedUrl(formId)` ([lib/quality/qms-pdf.ts](../../lib/quality/qms-pdf.ts)): يقرأ السجل عبر عميل **مُقيَّد بـ RLS** (نفس المدرسة أو `system_owner` فقط) ثم يولّد **signed URL مدّته دقيقتان** عبر service_role. مستخدم غير مُصرَّح/مدرسة أخرى → RLS لا يُرجع السجل → لا signed URL.

---

## 4) ضمانات الأمان حتى الإطلاق
- الأسرار placeholders → cron + `generate-qms-pdf` **fail-closed** (لا تعمل بسرّ ناقص) — **آمن، لا ثغرة**.
- لا روابط عامة لملفات الجودة · لا بيانات/أدلة/PDF وهمية (0 سجل) · ملح الـledger مُدوّر.
- **البند الوحيد المتبقّي = إدخال المالك** (المواضع 1–3 + الرابط + إعادة النشر).
