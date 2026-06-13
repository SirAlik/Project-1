# تدقيق أمن Supabase / PostgreSQL / RLS (Phase 3E-5)

> **النوع:** تدقيق أمني قراءة-فقط (Part C · Agent 2).
> **التاريخ:** 2026-06-13 · **المشروع الحيّ:** `ciwqgskyqtnciexfcgrr` · **HEAD:** `8c1e39a` · PRE-LAUNCH.
> **الحالة:** لم يُعدَّل أي schema/RLS/trigger/function. SELECT للقراءة فقط + قراءة SQL محلي.

---

## 0) تحديث الحالة — Security Hardening Sprint (2026-06-13) ✅

> أُصلحت بنود هذا التقرير من الجذر عبر الترحيل `M82` (`20260613_security_hardening.sql`) المُطبَّق والمُتحقَّق منه. advisors بعد الإصلاح: **0 ERROR** · `anon_security_definer_function_executable` 3→**0** · `authenticated_security_definer_function_executable` 13→**10** (الباقي RPCs مشروعة).

| البند | كان | الحالة |
| --- | --- | --- |
| نزاهة الـledger/المحفظة (High) | قابل للتجاوز | ✅ **مُصلَح** — حُذفت `tl_insert`+`sw_manage`؛ سُحبت منح INSERT/UPDATE/DELETE من `authenticated` على `transaction_logs`+`student_wallet`؛ الكتابة حصراً عبر `rpc_process_transaction` (SECURITY DEFINER). السجلّ append-only فعلياً. |
| أسرار placeholder (High) | placeholder | ✅ **`ledger_secret_salt` مُدوّر** (عشوائي 64-hex، server-side، غير مُلتزَم). ⏳ `cron_secret`+`cron_site_url` **محجوبان بإدخال المالك** (Vercel env + رابط النشر) — أوامر دقيقة في الملخّص §12. |
| دوال PUBLIC EXECUTE (Medium) | 12 دالة مكشوفة | ✅ **مُصلَح** — سُحب EXECUTE من PUBLIC/anon/authenticated عن 12 دالة trigger/أداة (postgres+service_role فقط). |
| overloads دوال ميتة (Low) | موجودة | ⏳ مؤجَّل (DROP آمن، بلا أثر أمني — تنظيف). |
| انحراف تتبّع الترحيلات (Low) | 8/91 | ✅ مُوثَّق + جدول مصالحة لكل ملف + خطة baseline/repair (انظر [MIGRATION_TRACKING_AUDIT](../db/MIGRATION_TRACKING_AUDIT.md) §9). |
| z_archive + pg_net (Low) | موجود | ⏳ z_archive DROP اختياري · pg_net مُدار من Supabase (مقبول). |
| leaked-password (Low) | معطّل | ⏳ يتطلّب Supabase Pro (مؤجَّل بقرار). |

**فحوص جديدة (FIX 8/9):** فهرس فريد `uq_generated_forms_dedup` على `generated_forms (school_id, form_code, source_table, source_record_id)` · فهارس FK أمنية (sqs/sqto updated_by · qe academic_year/recorded_by) · تحسين initplan لسياسات جدولي 3E-2 · bucket `qms-forms` خاص.

---

## 1) الحُكم العام

قاعدة البيانات الحيّة في **حالة أمنية قوية** لـ SaaS متعدّد المستأجرين قبل الإطلاق، بتصميم RLS-first منضبط. تحقّق مستقلّ:
- **114 جدول كلها RLS مفعّل (0 بلا RLS).**
- **سياسة واحدة فقط** بـ `qual='true'`: `workflow_definitions` SELECT — **كتالوج عالمي مشروع**.
- **0 سياسة كتابة** بفحص null/true عبر الـ303 · **0 سياسة تستهدف anon** · 286/303 سياسة مُقيَّدة بـ `school_id`، والباقي own-row (`auth.uid()`) أو system_owner عالمي (كلها مشروعة).
- **كل دالة SECURITY DEFINER لها `search_path` مضبوط.**
- **كائنات 3E-2** صحيحة ومعزولة: كل الكتابات تشترط `school_id = get_my_school_id()` + فحص دور مع تجاوز system_owner؛ `school_admin` يدير مدرسته فقط؛ المجهول fail-closed؛ M80 المحلي يطابق الحيّ.
- **trigger M78** يعزل بـ `NEW.school_id`، يتطلّب ATT-001 (auto_fillable+active) + سنة نشطة، `ON CONFLICT DO NOTHING` — **لا يُنشئ دليلاً لمدرسة خاطئة ولا دليلاً وهمياً**.
- **RPC المالي للـgamification** (`rpc_process_transaction`) مُحكَم: advisory lock + فحص JWT مقابل `student_profiles` (عبر-مستأجر) + circuit breaker + سقوف + سلسلة hash SHA-256 من `app_private.secrets` (المقفلة RLS بلا سياسات).

> **لا ثغرة عبر-مستأجر للقراءة/الكتابة.** البنود High أدناه **سابقة لـ 3E-2** (داخل-المستأجر/أسرار/سطح هجوم)، لا تخصّ كائنات 3E-2.

---

## 2) النتائج

### 🔴 High — سجلّ العملات (ledger) قابل للتجاوز عبر INSERT/UPDATE مباشر (لا trigger لسلسلة الـhash)
- **الموقع:** سياسات `public.transaction_logs` (INSERT لـ teacher/activity_leader/school_admin/school_principal) + `public.student_wallet` (cmd=ALL لـ school_principal/school_admin/activity_leader)؛ **لا BEFORE INSERT trigger** على `transaction_logs`. قارن [db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql](../../db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql).
- **السبب الجذري:** السجلّ المُفترَض append-only المُسلسَل بالـhash يُفترَض أن يُكتب **حصراً** عبر `rpc_process_transaction`، لكن RLS تمنح أدواراً داخل-المستأجر كتابةً مباشرة دون trigger يفرض سلسلة الـhash/الرصيد/السقوف → دور مميّز داخل المدرسة قد يصكّ أرصدة/صفوف سجلّ بـhash مزيّف. **داخل-المستأجر** (RLS يبقى يفرض own-school) لا عبر-مستأجر، لكنه يكسر تصميم النزاهة الاقتصادية.
- **الإصلاح:** اجعل السجلّ append-only/RPC-only على مستوى DB: REVOKE المسارات الواسعة وفرض الكتابة عبر `rpc_process_transaction`، **أو** BEFORE INSERT trigger يرفض الصفوف غير المتسلسلة؛ وقصر `student_wallet` بحيث لا تُعدَّل `coins/xp` مباشرة؛ والنظر في REVOKE UPDATE/DELETE على `transaction_logs`. (PRE-LAUNCH بلا بيانات → آمن للإعادة.)
- **قبل الإطلاق:** **نعم.**

### 🔴 High — أسرار placeholder في `app_private.secrets` (ملح السجلّ حسّاس أمنياً)
- **الموقع:** صفوف `app_private.secrets`: `ledger_secret_salt = 'ROTATE_BEFORE_LAUNCH___dev_placeholder_…'` · `cron_secret = 'REPLACE_BEFORE_LAUNCH'` · `cron_site_url = 'https://REPLACE_BEFORE_LAUNCH.vercel.app'`.
- **السبب الجذري:** `ledger_secret_salt` يغذّي سلسلة hash الـledger؛ ملح معروف/placeholder (نصّه في الترحيل) يجعل دليل العبث **قابلاً للتزوير** لمن يعرف القيمة. `cron_*` placeholder يُعطّل/يكشف cron.
- **الإصلاح:** قبل الإطلاق `UPDATE app_private.secrets SET secret=<قيمة عشوائية قوية>` لكلٍّ. الجدول مقفل RLS (0 سياسات) فالقيم تبقى خاصة. (مذكور في docs لكنه بند حقيقي قبل الإطلاق.)
- **قبل الإطلاق:** **نعم.**

### 🟠 Medium — 3 دوال trigger تحتفظ بـ PUBLIC EXECUTE (قابلة للنداء من anon عبر PostgREST RPC)
- **الموقع:** `public.fn_case_actions_set_school_id()` · `fn_student_honors_set_school_id()` · `fn_student_wishes_set_school_id()` — `proacl '=X/postgres'` (PUBLIC EXECUTE)؛ advisor `anon_security_definer_function_executable` (3).
- **السبب الجذري:** دوال trigger SECURITY DEFINER أبقت المنحة الافتراضية PUBLIC؛ ترحيلات الإقفال (`20260604_harden_legacy_rpc_and_roles`, r08/r09/r11) لم تشملها. **الاستغلال شبه معدوم** (تُرجِع trigger وتعتمد سياق NEW/TG الذي لا يوفّره PostgREST → تفشل). سطح غير ضروري.
- **الإصلاح:** `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated` (دوال trigger تعمل بصلاحية المالك أثناء الإطلاق؛ لا تحتاج EXECUTE للعميل).
- **قبل الإطلاق:** **نعم** (دفاع متعمّق رخيص).

### 🟡 Low — overloads دوال ميتة (التوقيع القديم أحادي الوسيط)
- **الموقع:** `rpc_purchase_furniture(uuid)` مقابل `(uuid, uuid)` · `rpc_scan_ar_glyph(text)` مقابل `(text, uuid)`.
- **الإصلاح:** DROP التوقيعات القديمة بعد تأكيد عدم استدعائها. (PRE-LAUNCH آمن.) **قبل الإطلاق:** لا.

### 🟡 Low — انحراف تتبّع الترحيلات (8 مقابل 91)
- bookkeeping؛ المخطط مُجسَّد. تفصيل في [MIGRATION_TRACKING_AUDIT.md](../db/MIGRATION_TRACKING_AUDIT.md). **قبل الإطلاق:** لا (لكن أرسِ baseline قبل اعتماد أدوات الترحيل).

### 🟡 Low — جداول `z_archive` (RLS بلا سياسات) + `pg_net` في public
- `z_archive.import_runs`/`import_run_items` (advisor `rls_enabled_no_policy` — مقفلة بالكامل، آمنة لكنها ميتة) · `pg_net` في public (Supabase-managed، معماري معروف). **قبل الإطلاق:** لا (DROP اختياري لـ z_archive).

### 🟡 Low — حماية كلمات المرور المسرَّبة مُعطَّلة (تتطلب Pro)
- advisor `auth_leaked_password_protection`؛ مؤجَّل لخطّة Pro (الطول 10 + التعقيد + require-current مفعّلة). بند checklist لا blocker.

---

## 3) advisors — التصنيف
- **Security:** 0 ERROR · 135 إجمالي (132 WARN/3 INFO). الأصناف: `pg_graphql_authenticated_table_exposed` (~114، مقبول — RLS يحرس الصفوف) · `authenticated/anon_security_definer_function_executable` (13/3 — منها الـ3 أعلاه) · `rls_enabled_no_policy` (3 — z_archive + مقفلة) · `extension_in_public` (1، pg_net) · `auth_leaked_password_protection` (1).
- **جدول 3E-2:** الجديد فقط حالتا `pg_graphql_authenticated_table_exposed` للجدولين الجديدين — صنف موجود مقبول.
- **Performance:** 745 (377 WARN/368 INFO): `auth_rls_initplan` (286 — نمط المشروع كله، تحسين معماري بلفّ `(select auth.jwt())`) · `unused_index` (273 — جداول فارغة) · `unindexed_foreign_keys` (95) · `multiple_permissive_policies` (91). **لا حرِج · لا صنف جديد من 3E-2.**

---

## 4) تأكيدات أمن المستأجر (3E-2)
✅ `school_admin` يكتب مدرسته فقط · ✅ `system_owner` كل المدارس · ✅ أدوار أخرى محجوبة من الكتابة · ✅ المجهول fail-closed · ✅ M78 لا يُنشئ دليلاً لمدرسة خاطئة · ✅ لا دليل وهمي · ✅ planned لا يُولّد دليلاً · ✅ كل دوال SECURITY DEFINER لها search_path.

## 5) ترتيب الإصلاح (مرحلة لاحقة — لا يُنفَّذ الآن)
1. إقفال نزاهة الـledger (High).
2. تدوير أسرار `app_private.secrets` (High).
3. REVOKE PUBLIC عن دوال trigger الثلاث (Medium).
4. DROP overloads ميتة · baseline ترحيلات · z_archive · leaked-password عند Pro (Low).
