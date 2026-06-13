# ملخّص تنفيذي — تدقيق الأمن وتتبّع الترحيلات (Phase 3E-5)

> **التاريخ:** 2026-06-13 · **HEAD:** `8c1e39a` · **المشروع:** SIDRA OS (PRE-LAUNCH، مستأجر واحد: الفلاح) · **Supabase:** `ciwqgskyqtnciexfcgrr`.
> **التقارير التفصيلية:** [تتبّع الترحيلات](../db/MIGRATION_TRACKING_AUDIT.md) · [أمن كود التطبيق](./APP_CODE_SECURITY_AUDIT.md) · [أمن Supabase/RLS](./SUPABASE_RLS_SECURITY_AUDIT.md).

---

## 0) نتائج Security Hardening Sprint (2026-06-13) ✅

> §§1–14 أدناه تُوثّق **تدقيق 3E-5 (قراءة-فقط)**. هذا القسم يوثّق **سبرنت الإصلاح اللاحق** الذي عالج البنود من الجذر.

| # | البند | الشدّة | الحالة |
| --- | --- | --- | --- |
| 1 | `generateInvite` عزل مستأجر | High | ✅ مُصلَح (اشتقاق `school_id` من السياق + حارس snake_case) |
| 2 | `generate-qms-pdf` fail-open | High | ✅ مُصلَح (fail-closed 503/401) |
| 3 | QMS PDF رابط عام | High | ✅ مُصلَح (bucket خاص + signed URL + `pdf_url=null`) |
| 4 | نزاهة الـledger/المحفظة | High | ✅ مُصلَح (RPC-only + حذف سياسات + سحب منح الكتابة) |
| 5a | `ledger_secret_salt` | High | ✅ مُدوّر (DB، عشوائي) |
| 5b | `cron_secret`/`cron_site_url` | High | ⏳ **محجوب بإدخال المالك** (أوامر §12) |
| 6 | موافقة الرحلة عبر anon | Medium | ✅ مُصلَح (server actions + مسار عام مُتحكَّم) |
| 7 | PUBLIC EXECUTE (12 دالة) | Medium | ✅ مُصلَح (REVOKE) |
| 8 | dedup `generated_forms` | Low | ✅ مُصلَح (فهرس فريد DB) |
| 9 | RLS initplan + فهارس FK (3E-2) | Low | ✅ مُصلَح |
| 10 | انحراف تتبّع الترحيلات | Low | ✅ مُوثَّق + جدول مصالحة + خطة baseline ([§9](../db/MIGRATION_TRACKING_AUDIT.md)) |
| — | proxy logs (dev-gating) | Low | ✅ مُصلَح |
| — | CSP كامل · validate-bulk-upload · overloads · z_archive · leaked-password | Low | ⏳ مؤجَّل بأسباب صريحة (لا «later» غامض — انظر تقارير الأقسام) |

**المُطبَّق على DB:** `M82` (`20260613_security_hardening.sql`) + تدوير الملح. **app-code:** invite · safe-action · proxy · consent (page+actions) · generate-qms-pdf (Edge) · qms-pdf service · .env.example. **advisors بعد الإصلاح:** 0 ERROR · anon-secdef 3→0 · auth-secdef 13→10.

### إجراء المالك المطلوب (الوحيد المتبقّي — High 5b)
سرّ واحد قوي يُضبط في **مكانين** + رابط النشر:
```bash
# 1) ولّد سرّاً قوياً واحداً (مثال)
openssl rand -hex 32
# 2) اضبطه في Vercel (متغيّر بيئة المشروع):  CRON_SECRET=<القيمة>
# 3) اضبط نفس القيمة + رابط النشر في DB (app_private.secrets):
```
```sql
UPDATE app_private.secrets SET secret = '<نفس قيمة CRON_SECRET>' WHERE name = 'cron_secret';
UPDATE app_private.secrets SET secret = 'https://<الرابط-الحقيقي>.vercel.app' WHERE name = 'cron_site_url';
```
حتى ذلك الحين تبقى cron + `generate-qms-pdf` **fail-closed** (آمنة، لا تعمل بسرّ ناقص).

---

## 1) هل بقيت المرحلة قراءة-فقط؟
✅ **نعم.** لم يُطبَّق/يُنشأ/يُحذَف/يُعدَّل أي ترحيل · لا تغيير schema/RLS/trigger/function · لا تغيير كود runtime. فقط SQL للقراءة (SELECT) + قراءة ملفات + advisors + lint/build + **إنشاء ملفات تقارير markdown فقط**.

## 2) حالة git الحالية
شجرة نظيفة قبل البدء (HEAD `8c1e39a`). التغييرات الوحيدة في هذه المرحلة = **4 ملفات تقارير** (هذا الملف + الثلاثة المُشار إليها). لا ملفات كود/DB/ترحيلات.

## 3) عدد الترحيلات المحلية
**91** ملف في `db/migrations/*.sql` (لا مجلد `supabase/migrations/`).

## 4) عدد تتبّع Supabase الحيّ
**8** إدخالات في `supabase_migrations.schema_migrations`.

## 5) أبرز نتائج انحراف الترحيلات
- انحراف **bookkeeping فقط** (8 متتبَّع مقابل 91 محلي)؛ المخطط الحيّ **مُجسَّد بالكامل وصحيح**: 114 جدول كلها RLS · 303 سياسة · 32 دالة · 27 trigger · 8 enums.
- **0 كائن مفقود** من DB · **0 إدخال تتبّع orphan**. الفجوة سببها تطبيق أغلب الترحيلات عبر SQL مباشر/Dashboard خارج خطّ التتبّع.
- اصطلاحات تسمية مختلطة + `06_rls_policies(_revised)` + `verify_after.sql` + `20240123_` خارج الترتيب → **تنظيف معماري** (لا حذف الآن).
- **التصنيف: Cosmetic/bookkeeping + Architectural cleanup — لا Fatal.**

## 6) البنود القاتلة (Fatal before launch)
**لا يوجد.** لم تتحقّق أي من شروط «التوقّف الفوري»: لا انحراف DB قاتل · لا كتابة عبر-مستأجر عبر RLS · لا وصول مدرسة مجهولة لقوالب/إعدادات الفلاح · trigger M78 لا يُنشئ دليلاً لمدرسة خاطئة · لا دليل بلا سنة/مؤشر · **لا تسريب service-role key** · لا تغيير مدمّر مطلوب · لا حاجة لتغيير كود runtime للمتابعة.

## 7) التحذيرات (Warnings / High)
**App (High):** (1) `generateInvite` يثق بـ `school_id` من العميل (snake_case يتجاوز الحارس) → دعوة عبر-مستأجر [app/_actions/invite.ts]. (2) `generate-qms-pdf` fail-OPEN عند غياب `CRON_SECRET` + bucket عام بمسارات متوقّعة لـPDFات قد تحوي PII. **App (Medium):** صفحة موافقة الرحلة العامة تكتب/تقرأ PII عبر عميل المتصفّح anon.
**DB (High):** (1) سجلّ العملات قابل للتجاوز (INSERT/UPDATE مباشر بلا trigger سلسلة hash) — داخل-مستأجر. (2) أسرار placeholder (`ledger_secret_salt`/`cron_secret`/`cron_site_url`) تجب تدويرها. **DB (Medium):** 3 دوال trigger بـ PUBLIC EXECUTE.

## 8) نتائج أمن كود التطبيق
البنية قوية (نواة auth + `createSafeAction` + عزل service_role + حُرّاس layout). High×2 + Medium×1 + Low×2 (التفاصيل في [التقرير](./APP_CODE_SECURITY_AUDIT.md)). **كائنات 3E-2 نظيفة**؛ البنود سابقة لها. لا أسرار مُثبَّتة · service_role لا يُشحَن للعميل · لا كتابة مباشرة تتجاوز الخدمات.

## 9) نتائج أمن Supabase/RLS
RLS-first منضبط: 114 جدول كلها RLS · سياسة `true` واحدة مشروعة (كتالوج عالمي) · 0 سياسة anon · كل secdef لها search_path · 3E-2 + M78 + RPC المالي معزولة وصحيحة. High×2 (ledger/أسرار) + Medium×1 (PUBLIC EXECUTE) + Low×4 (التفاصيل في [التقرير](./SUPABASE_RLS_SECURITY_AUDIT.md)). **0 ERROR في advisors · لا صنف جديد من 3E-2.**

## 10) استراتيجية المصالحة المُوصى بها (الترحيلات)
**الخيار A (baseline موثّق) ثم الخيار B (repair للإصدارات المُثبَت تطبيقها)** — بلا إعادة تشغيل تاريخي وبلا reset. الخيار C (squash) مقبول PRE-LAUNCH لكنه أكثر كلفة. **الخيار D (reset) مرفوض** (خطر محو مخطط مُطبَّق جزئياً يدوياً). لا أثر runtime اليوم.

## 11) ترتيب الإصلاح الأمني المُوصى به (مرحلة لاحقة بموافقة)
1. **App High:** عزل مستأجر `generateInvite`.
2. **App High:** `generate-qms-pdf` fail-closed + bucket خاص + signed URL.
3. **DB High:** إقفال نزاهة الـledger (RPC-only / trigger سلسلة hash).
4. **DB High:** تدوير أسرار `app_private.secrets` (ملح الـledger أولاً).
5. **App Medium:** صفحة موافقة الرحلة → server action.
6. **DB Medium:** REVOKE PUBLIC عن دوال trigger الثلاث.
7. **Low:** `validate-bulk-upload` ربط بالمدرسة · proxy logs+CSP · DROP overloads · baseline الترحيلات · z_archive · leaked-password عند Pro.

## 12) الأوامر المقترحة للمرحلة التالية (لا تُنفَّذ الآن)
> أمثلة توضيحية تتطلّب موافقة صريحة + فحص حيّ قبل التنفيذ. **لم تُنفَّذ.**

```sql
-- (DB High) تدوير الأسرار قبل الإطلاق
UPDATE app_private.secrets SET secret = '<STRONG_RANDOM_64>' WHERE name = 'ledger_secret_salt';
UPDATE app_private.secrets SET secret = '<STRONG_RANDOM_TOKEN>' WHERE name = 'cron_secret';
UPDATE app_private.secrets SET secret = 'https://<real-app>.vercel.app' WHERE name = 'cron_site_url';

-- (DB Medium) إقفال دوال trigger من PUBLIC (دفاع متعمّق)
REVOKE EXECUTE ON FUNCTION public.fn_case_actions_set_school_id()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_student_honors_set_school_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_student_wishes_set_school_id() FROM PUBLIC, anon, authenticated;

-- (DB High) إقفال نزاهة الـledger — اختيار أحد المسارين (يتطلّب تصميماً + مراجعة):
--   (أ) REVOKE الكتابة المباشرة وفرض rpc_process_transaction، أو
--   (ب) BEFORE INSERT trigger على transaction_logs يفرض سلسلة hash + الرصيد + السقوف.
```

```sql
-- (الترحيلات · الخيار B) repair للإصدارات المُثبَت تطبيقها فقط — تُحدَّد القائمة الدقيقة أولاً:
--   supabase migration repair --status applied <version> ...   (CLI، خارج هذا المسار)
```

```ts
// (App High) generateInvite — إصلاح مقترح (مرحلة لاحقة):
//   - إعادة تسمية حقل الـschema إلى schoolId ليعمل حارس createSafeAction، و
//   - target_school_id = ctx.user.isSystemOwner ? input.schoolId : ctx.user.schoolId
```

> **ممنوع** في أي مرحلة لاحقة: `supabase db reset` · `db push` · `migration repair` بلا قائمة مُثبَتة · `npm audit fix --force` · أي force.

## 13) تأكيد: لم تُجرَ تغييرات DB
✅ **لم يُجرَ أي تغيير على قاعدة البيانات** (لا schema/RLS/policy/trigger/function/seed/migration). SELECT للقراءة فقط + advisors.

## 14) تأكيد: لم تُجرَ تغييرات كود runtime
✅ **لم يُعدَّل أي كود تطبيق أو إعداد أو ترحيل.** التغييرات الوحيدة = ملفات markdown توثيقية تحت `docs/`.

---

### تصنيف موحّد للنتائج
| # | البند | الفئة | التصنيف | قبل الإطلاق |
| --- | --- | --- | --- | --- |
| 1 | `generateInvite` عزل مستأجر | App | **Warning (High)** | نعم |
| 2 | `generate-qms-pdf` fail-open + bucket عام | App/Edge | **Warning (High)** | نعم |
| 3 | موافقة الرحلة عبر عميل المتصفّح | App | Warning (Medium) | نعم |
| 4 | ledger قابل للتجاوز | DB/RLS | **Warning (High، داخل-مستأجر)** | نعم |
| 5 | أسرار placeholder | DB | **Warning (High)** | نعم |
| 6 | دوال trigger PUBLIC EXECUTE | DB | Warning (Medium) | نعم |
| 7 | `validate-bulk-upload` بلا ربط مدرسة | Edge | Warning (Low) | لا |
| 8 | proxy logs + غياب CSP | App | Cosmetic (Low) | لا |
| 9 | overloads دوال ميتة | DB | Architectural cleanup | لا |
| 10 | انحراف تتبّع الترحيلات 8/91 | DB | **Cosmetic/bookkeeping** | لا |
| 11 | z_archive + pg_net in public | DB | Architectural/معروف | لا |
| 12 | leaked-password (Pro) | Auth | Architectural (مؤجَّل) | لا |
| 13 | تسمية ترحيلات مختلطة + superseded | Repo | Architectural cleanup | لا |

> **لا بند Fatal.** البنود High سابقة لـ 3E-2 ومُخفَّفة بحالة PRE-LAUNCH (مستأجر واحد)؛ تُعالَج في مرحلة إصلاح لاحقة بموافقة. كائنات 3E-2 والـtrigger M78 تأكّدت نظافتها وعزلها.
