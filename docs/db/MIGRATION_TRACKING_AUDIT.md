# تدقيق تتبّع الترحيلات — Migration Tracking Audit (Phase 3E-5)

> **النوع:** تدقيق قراءة-فقط (Part A).
> **التاريخ:** 2026-06-13 · **HEAD:** `8c1e39a` · **المشروع:** SIDRA OS (PRE-LAUNCH).
> **المشروع الحيّ:** Supabase `ciwqgskyqtnciexfcgrr`.
> **الحالة:** لم يُطبَّق/يُنشأ/يُحذَف/يُعدَّل أي ترحيل. قراءة فقط.

---

## 1) الخلاصة التنفيذية

| المقياس | القيمة |
| --- | --- |
| ملفات الترحيل المحلية (`db/migrations/*.sql`) | **91** |
| إدخالات تتبّع Supabase الحيّة (`supabase_migrations.schema_migrations`) | **8** |
| مجلد `supabase/migrations/` | **غير موجود** |
| جداول DB الحيّة (public) | **114** — جميعها RLS مفعّل (**0** بلا RLS) |
| سياسات RLS | 303 · دوال 32 (23 SECURITY DEFINER) · triggers 27 · enums 8 |
| كائنات مقصودة من ترحيلات مهمة لكنها **مفقودة** من DB | **0** (المخطط مُجسَّد بالكامل) |

> **الحُكم:** الانحراف **bookkeeping فقط (تجميلي)** — وليس انحراف مخطط. المخطط الحيّ مُجسَّد وصحيح بالكامل؛ جدول تتبّع Supabase يمثّل جزءاً صغيراً من التاريخ لأن أغلب الترحيلات طُبِّقت عبر SQL مباشر/Dashboard لا عبر خطّ أنابيب التتبّع. **لا بند قاتل قبل الإطلاق** في هذا الجزء.

---

## 2) جرد الترحيلات المحلية (91 ملف)

### اصطلاحات تسمية مختلطة (cleanup معماري)
- **ملفات بادئة رقمية بلا تاريخ:** `01_core_tenancy` · `02_pbac` · `03_academic_integrity` · `05_audit_idempotency` · `06_rls_policies` · `06_rls_policies_revised` (الرقم 04 غائب؛ 06 مُكرَّر/مُنقَّح).
- **تاريخ خارج الترتيب:** `20240123_rbac_security.sql` (يناير 2024 وسط ملفات 2026).
- **ملفات أدوات لا ترحيلات:** `verify_after.sql` (نصّ تحقّق، ليس DDL ترحيل).
- **مُتجاوَز/superseded:** `06_rls_policies.sql` → `06_rls_policies_revised.sql` (لاحقاً أُعيد بناء RLS بالكامل في موجة `20260524_*` و`20260529_r0x_*`).
- **الكتلة المؤرّخة:** `YYYYMMDD_name.sql` من `20260120` إلى `20260613` (الغالبية).

> **لا تكرار timestamp ضارّ مكتشَف** ضمن الكتلة المؤرّخة (التمييز بالاسم اللاحق للتاريخ). الازدواج الوحيد ذو الدلالة هو `06_rls_policies(_revised)`.

### لا حذف
**لم يُحذف ولا يُعاد تسمية أي ملف.** التوصيات أدناه لمرحلة لاحقة بموافقة.

---

## 3) تتبّع Supabase الحيّ (8 إدخالات)

| الإصدار (version) | الاسم في التتبّع | المقابل المحلي |
| --- | --- | --- |
| 20260531155306 | `m75_gamification_multitenant` | `20260602_gamification_multitenant.sql` |
| 20260531160808 | `20260602_pg_cron_daily_feed` | `20260602_pg_cron_daily_feed.sql` |
| 20260605075143 | `20260605_enforce_tenant_not_null_and_fix_rls` | مطابق |
| 20260605095119 | `medium_risk_cleanup` | `20260605_medium_risk_cleanup.sql` |
| 20260605125044 | `m79_cron_ai_insights` | `20260605_m79_cron_ai_insights.sql` |
| 20260613111752 | `m80_quality_template_settings` | `20260613_quality_template_settings.sql` |
| 20260613111834 | `m78_quality_trigger_from_attendance` | `20260605_m78_quality_trigger.sql` |
| 20260613111904 | `m81_seed_quality_readiness` | `20260613_seed_quality_readiness.sql` |

**ملاحظات:**
- التتبّع بدأ فعلياً من أواخر مايو (`m75`) وبشكل متقطّع؛ أول 5 إدخالات من مايو/يونيو، وآخر 3 من Phase 3E-2 (مُسجَّلة لأنها طُبِّقت عبر `apply_migration`).
- **عدم تطابق version/name:** `m75` و`pg_cron` لهما version بتاريخ 20260531 لكن الاسم بتاريخ 20260602 — أثر من طريقة التطبيق، تجميلي.
- **M78:** ملفه المحلي مؤرّخ 20260605 لكنه طُبِّق فعلياً 20260613 (في 3E-2) — يؤكّد اكتشاف 3E-3 أنّ M78 لم يكن مُطبَّقاً رغم توثيقه السابق كمُنجز.

---

## 4) مقارنة الانحراف

| الفئة | النتيجة |
| --- | --- |
| ترحيلات محلية **مفقودة** من التتبّع | ~83 ملف (طُبِّقت خارج التتبّع — Dashboard/SQL مباشر) |
| إدخالات تتبّع **بلا** مقابل محلي (orphan) | **0** (الثمانية لها مقابلات محلية) |
| ترحيلات طُبِّقت يدوياً خارج التتبّع | الغالبية (~83) |
| محتوى موجود في DB لكنه غير متتبَّع | نعم — الكتلة الكبرى |
| محتوى **غير موجود** في DB | **0** (تحقّق: 114 جدول · 303 سياسة · 32 دالة · 27 trigger · 8 enums) |

---

## 5) تحقّق وجود كائنات الترحيلات المهمة (عيّنة + إجمالي)

- **إجمالي:** 114 جدول، **كلها RLS مفعّل** → يؤكّد تجسيد طبقات الترحيلات (tenancy · PBAC · workflow layers 3/5/6 · attendance · quality · gamification · LRC · health · activity · AI).
- **الجودة (3E-2):** `school_quality_settings` · `school_quality_template_overrides` · `quality_indicators` · `quality_evidence` · `generated_forms` · `academic_years` — موجودة وصحيحة (تحقّق Phase 3E-3).
- **trigger M78:** `fn_quality_evidence_from_attendance` + `trg_quality_from_attendance` موجودان (طُبِّقا في 3E-2).
- **دوال أمنية:** `get_my_school_id()` موجودة ومُستخدَمة في السياسات؛ كل دوال SECURITY DEFINER لها `search_path` (تحقّق Agent 2).

---

## 6) التصنيف

| البند | التصنيف |
| --- | --- |
| تتبّع جزئي (8/91) مع تجسيد كامل للمخطط | **Cosmetic/bookkeeping** |
| عدم تطابق version/name في التتبّع | Cosmetic/bookkeeping |
| اصطلاحات تسمية مختلطة + `06_*_revised` + `verify_after.sql` | **Architectural cleanup** |
| `20240123_` خارج الترتيب | Architectural cleanup |
| كائنات مفقودة من DB | **لا يوجد** (لا Fatal) |

> **لا بند Fatal قبل الإطلاق** في تتبّع الترحيلات.

---

## 7) خيارات المصالحة (مرتّبة بالاستقرار — لا تُنفَّذ الآن)

### ✅ الخيار A — أساس/Baseline موثّق (المُوصى به أولاً)
- إبقاء المخطط كما هو (لا إعادة تشغيل لأي ترحيل تاريخي).
- توليد **ترحيل أساس (baseline snapshot)** واحد يعكس المخطط الحيّ الحالي، لاستخدام البيئات الجديدة.
- **المخاطر:** شبه معدومة (لا تغيير على DB الحيّة). **الأنسب لـ PRE-LAUNCH.**

### الخيار B — `migration repair` للمُثبَت تطبيقه فقط (مُكمّل للخيار A)
- وسم الإصدارات **المُثبَت تطبيقها فعلاً** كمُطبَّقة في جدول التتبّع، دون إعادة تشغيلها.
- **يجب** سرد الإصدارات الدقيقة وسبب كلٍّ قبل التنفيذ.
- لا يُنفَّذ الآن. مناسب لمواءمة التتبّع مع الواقع قبل اعتماد `supabase db diff/push` مستقبلاً.

### الخيار C — Squash/أرشفة (PRE-LAUNCH فقط)
- دمج الـ91 ملف في ترحيل أساس واحد + أرشفة القديمة في مجلد `archive/`.
- **المخاطر:** فقدان التفصيل التاريخي؛ يتطلب تحقّقاً دقيقاً أنّ الـ baseline يطابق الحيّ. **rollback:** الاحتفاظ بالملفات المؤرشفة في git. أكثر كلفة من A.

### ❌ الخيار D — إعادة بناء/Reset كامل (آخر ملاذ)
- `supabase db reset`/إعادة بناء من الصفر.
- **خطر عالٍ:** يمحو المخطط الحيّ (الذي طُبِّق جزئياً خارج التتبّع وقد لا يُعاد إنتاجه حرفياً من الملفات بسبب التطبيقات اليدوية). **ليس الخيار الأول إطلاقاً.** غير مبرَّر هنا (لا مشكلة مخطط).

---

## 8) التوصية

**الخيار A (baseline موثّق) ثم الخيار B (repair مُحدَّد)** قبل الاعتماد على أدوات الترحيل عند/بعد الإطلاق. لا أثر أمني runtime اليوم. **لا إجراء عاجل مطلوب.** الأوامر المقترحة (لا تُنفَّذ الآن) في الملخّص الموحّد §12.

---

## 9) المصالحة لكل ملف (Security Sprint 2026-06-13 · FIX 10)

> التتبّع الحيّ الآن **9 إدخالات** (أُضيف `m82_security_hardening`). الـ91 ملفاً مُصنَّفة أدناه. **الفحص أثبت 0 كائن مفقود من DB** — فكل ملف غير متتبَّع هو «مُطبَّق يدوياً/غير متتبَّع» يُغطّيه baseline، أو «متجاوَز» يُوثَّق، أو «أداة». **لا ملف «مفقود ومطلوب» (لا حاجة لإعادة بناء أمامية).**

### مُتتبَّع ومُطبَّق (9) — لا إجراء
`20260602_gamification_multitenant.sql` (m75) · `20260602_pg_cron_daily_feed.sql` · `20260605_enforce_tenant_not_null_and_fix_rls.sql` · `20260605_medium_risk_cleanup.sql` · `20260605_m79_cron_ai_insights.sql` · `20260605_m78_quality_trigger.sql` (m78) · `20260613_quality_template_settings.sql` (m80) · `20260613_seed_quality_readiness.sql` (m81) · `20260613_security_hardening.sql` (m82).

### متجاوَز/مُستبدَل (obsolete-superseded) — توثيق فقط (لا حذف بلا موافقة)
| الملف | السبب |
| --- | --- |
| `20240123_rbac_security.sql` | RBAC قديم (2024) استُبدل كلياً بموجة الأدوار/RLS 2026 (`20260523/24` + `r00–r12`). |
| `06_rls_policies.sql` | استُبدل بـ `06_rls_policies_revised.sql` ثم بإعادة بناء RLS الكاملة. |
| `06_rls_policies_revised.sql` | استُبدل بـ `20260524_rebuild_stale_rls_policies` + `r06/r07`. |
| `20260206_fix_schools_rls.sql` · `20260207_fix_profiles_rls_recursion.sql` | إصلاحات RLS نقطية استُبدلت بإعادة البناء الشاملة لاحقاً. |

### أداة لا ترحيل
`verify_after.sql` — نصّ تحقّق (SELECTات)، ليس DDL.

### مُطبَّق يدوياً/غير متتبَّع (applied-untracked) — كائناته موجودة → يُغطّيه baseline
البقية (~76 ملفاً) — جميع كائناتها موجودة في DB الحيّة (114 جدول · 303 سياسة · دوال/triggers/enums)، مُطبَّقة خارج تتبّع Supabase. **objects_present = yes.** الإجراء الموصى: **baseline-covered**. تشمل: `01_core_tenancy`·`02_pbac`·`03_academic_integrity`·`05_audit_idempotency` · `20260120_gamification_*`·`20260121_*(ledger/hardening/integrity/quest/setup_production)` · `20260130_action_audit_log` · `20260201_*`·`20260202_identity_forge_*`·`20260208_strict_role_refactor` · `20260523_normalize_role_keys`·`20260524_*` · `20260526/20260527_layer3/5/6/6b/7_*` · `20260528_*(attendance)` · `20260529_r00–r12_*` (تشمل DROP migrations r01/r04/r11 — أثرها مُطبَّق: الكائنات القديمة غائبة) · `20260530_*`·`20260531_*`·`20260601_*`·`20260603_m77_*`·`20260604_*`·`20260606_drop_classes_school_id_default`.

### جدول مُصنَّف (تمثيلي بالفئة — يغطّي الـ91)
| الفئة | عدد | tracked | objects_present | الإجراء |
| --- | --- | --- | --- | --- |
| tracked-applied | 9 | yes | yes | none |
| applied-untracked | ~76 | no | **yes** | baseline-covered |
| obsolete-superseded | 5 | no | n/a (أثر/مُستبدَل) | document-superseded |
| utility-nonmigration | 1 | no | n/a | none |
| **missing-required** | **0** | — | — | — |

### خطة المصالحة (لا تُنفَّذ الآن — أوامر للمالك)
1. **Baseline (الخيار A):** توليد لقطة المخطط الحيّ كأساس للبيئات الجديدة:
   ```bash
   supabase db pull            # يولّد ملف schema baseline من DB الحيّة
   # أو: pg_dump --schema-only --no-owner > db/baseline/0000_baseline.sql
   ```
2. **Repair (الخيار B) — اختياري، لمواءمة التتبّع فقط (لا يغيّر schema):** وسم الـ applied-untracked كمُطبَّقة:
   ```bash
   # مثال (تُحدَّد القائمة الدقيقة من db/migrations بعد توليد الإصدارات):
   supabase migration repair --status applied <version>
   ```
   ⚠️ لا تُشغَّل قبل توليد baseline والتأكد أنّ كل version يقابل كائناً مُطبَّقاً فعلاً.
3. **ممنوع:** `supabase db reset`/`db push` على الحيّة (تخاطر بمحو مخطط مُطبَّق يدوياً). الخيار D مرفوض.
