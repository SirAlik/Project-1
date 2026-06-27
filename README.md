# سِدرة — نظام إدارة مدرسي (School Management System)

> **العلامة المرئية للمستخدم: «سِدرة».** الاسم «Sidra OS» يَرِد في هذا المستند كـ **اسم المستودع الداخلي فقط** (internal/developer repo name) ولا يُعرض في واجهة المستخدم. لا تُستخدم في الواجهة المرئية أيّ من: `School OS` · `Sidra OS` · `Smart School OS` · `Antigravity` · `سِدرة OS`.

نظام إدارة مدرسي متعدد المستأجرين (**Multi-Tenant SaaS**) مبني على تقنيات حديثة وعالية الأداء (**Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase**).

---

## 📌 نظرة عامة

**سِدرة** هو نظام إدارة مدرسي متكامل يهدف إلى أتمتة وتنظيم العمليات التشغيلية واليومية داخل البيئة التعليمية. يتميز النظام بتقديم لوحات عمل متخصصة ومصممة بدقة بناءً على الدور الوظيفي للمستخدم لضمان كفاءة الأداء وسهولة الوصول إلى البيانات.

تم تصميم المعمارية البرمجية لتكون **متعددة المستأجرين (Multi-Tenant)**، مما يضمن عزل بيانات كل مدرسة بشكل كامل وآمن داخل بيئتها الخاصة دون أي تداخل مع المدارس الأخرى في النظام.

---

## 👥 لمن هذا الملف؟

هذا الملف مخصص للعنصر البشري بشكل أساسي، وتحديداً:

* **المطورين الجدد** المنضمين لفريق العمل بالمشروع.
* **مهندسي البرمجيات** المسؤولين عن مراجعة بنية وتصميم النظام.
* **المطورين** الراغبين في تشغيل المشروع وإعداده في بيئة التطوير المحلية.
* **المحللين** الراغبين في فهم البنية التقنية وقواعد العمل التشغيلية قبل إجراء أي تعديلات.

> 💡 **ملاحظة:** تعليمات الذكاء الاصطناعي أو المساعدين البرمجيين مثل (Claude / GitHub Copilot) يجب أن تُعزل وتوضع في ملف مستقل وخاص بها مثل `CLAUDE.md`.

---

## 🚀 حالة المشروع الحالية (Current Status)

* **المرحلة:** ما قبل الإطلاق (**PRE-LAUNCH**) — لا مستخدمون حقيقيون ولا بيانات إنتاجية. بعد توحيد اللوحات (UI Unification Sprint 1)، نُفِّذت **6 سبرنتات تحصين لما بعد التوحيد (2026-06-27 → 06-30)** — راجع قسم «سبرنتات تحصين ما بعد التوحيد» أدناه.
* **المستخدمون:** لا يوجد مستخدمون حقيقيون حالياً، ولا توجد بيانات إنتاجية (Production Data) نشطة.
* **قاعدة البيانات:** المصدر الموثوق هو `db/migrations/` (**≈97 ملف ترحيل محلي**). تتبّع Supabase الحيّ = **13 إدخالاً** (ارتفع من 9 لأن ترحيلات Sprint 2–3 طُبِّقت عبر أداة `apply_migration`؛ يبقى الانحراف **bookkeeping تجميلياً** للترحيلات التاريخية المُطبَّقة بـSQL مباشر). المخطط الحيّ **مُجسَّد بالكامل** (**116 جدول** كلها RLS · 306 سياسة) و**لا كائن مطلوب مفقود**. التفاصيل: [تدقيق تتبّع الترحيلات](docs/db/MIGRATION_TRACKING_AUDIT.md).
* **الأمان:** الأساس الأمني **مُحصَّن بشكل كبير** بعد **Security Hardening Sprint** (الترحيل `M82`) — عُولِجت أبرز نتائج **High** من التدقيق السابق (عزل مستأجر `generateInvite` · `generate-qms-pdf` fail-closed · QMS PDF عبر bucket خاص + signed URLs · منع الكتابة المباشرة للـ ledger/المحفظة · REVOKE صلاحيات EXECUTE الزائدة · فهرس dedup لـ `generated_forms`). **متبقٍّ (إجراء مالك):** ضبط `CRON_SECRET` وقت التشغيل (Vercel + Supabase Edge + DB) — حتى ذلك تبقى cron و`generate-qms-pdf` **fail-closed (آمنة)**. التفاصيل: [ملخّص الأمن](docs/security/SECURITY_AND_MIGRATION_AUDIT_SUMMARY.md) · [إعداد CRON](docs/security/CRON_SECRET_RUNTIME_SETUP.md).
* **طبقة الجودة:** **قوالب الجودة لكل مستأجر (3D)** + **أساس التعبئة التلقائية والأدلة (3E)** مُنجزان. القوالب **tenant-specific** — قوالب «الفلاح» ليست افتراضات سِدرة العالمية. مدرسة الفلاح مُسجَّلة في سجلّ المستأجرين (`school_id = bfe99c43-fa5c-46f4-8ad0-05e12184b55e`). التفاصيل: [قوالب المستأجر](docs/quality/TENANT_QUALITY_TEMPLATES.md).
* **واجهات المستخدم (UI):** الدستور البصري المعتمد (Phase 3B) مُطبَّق + الصفحة الرئيسية العامة مُعاد تصميمها. **UI Unification Sprint 1 مُنجزة** — مجموعة مكوّنات لوحات موحّدة (`components/dashboard/`) + إعداد محتوى الأدوار (`lib/dashboard/role-dashboard.ts`)؛ وُحِّدت **8 لوحات بالكامل** + **جزئياً** `/principal` و`/classroom`. **التالي: UI Unification Sprint 2 — ترحيل صدفة LRC.** التفاصيل: [تقرير توحيد لوحات الأدوار](docs/ui/ROLE_DASHBOARD_UNIFICATION_REPORT.md).
* **جودة الكود:** اكتملت مراحل تنظيف الكود الأساسية 1–5 · `npm run lint` صفر · `npm run build` **63/63 صفحة** — راجع القسم أدناه.
* **التوجيه وعزل المستأجر (Routing & Tenancy):** اكتملت **Phase 1 + Phase 2A → 2F** (مواءمة توجيه الأدوار · حارس مستأجر لـ `app/school/[id]/*` · عزل بيانات tenant-safe لـ `classroom/[classId]` · تصحيح ملكية المجالات بين `academic_vp`/`school_affairs_vp` · إغلاق DB hardening لـ `classes.school_id`). المشروع **PRE-LAUNCH** — لا مستخدمون ولا بيانات إنتاجية.

---

## 🛡️ سبرنتات تحصين ما بعد التوحيد (Post-Unification Hardening — Sprints 1–6)

> بعد UI Unification Sprint 1، نُفِّذت **6 سبرنتات app-code** (2026-06-27 → 06-30). كل سبرنت: `npm run lint` صفر · `npm run build` **63/63** · `tsc` نظيف · `npm test` **26/26**. **بلا** تغيير auth/persona/مفاتيح الأدوار/التبعيات/`.env`. advisors أمنية: **0 ERROR**. التفاصيل الكاملة: [تقرير الإغلاق](docs/audits/REMAINING_ITEMS_CLOSURE_REPORT.md).

- **Sprint 1 — كتابات حرجة وقت التشغيل:** تحويل `events.type` خادمياً إلى enum القاعدة (`mapToDbEventType`، 7 قيم فقط) · حضور `student_daily_attendance` بـ`term_id` إلزامي · رفض كتابات `class_id=NULL` · إزالة استيراد منصّة وهمي · تأكيد مكتوب لإعادة تعيين الفصول.
- **Sprint 2 — أمن/تشغيل High (+3 migrations مُطبَّقة حياً):** بوّابة دور المشغّل داخل RPCs الاقتصاد الأربعة + إسقاط التواقيع الأُحاديّة القديمة · حذف كتابة PII من المتصفّح (`HealthSocialModal`) · حصر تحقّق الاستيراد بالمستأجر · `toSafeError` للكتابات عالية الخطر · webhook بصمة fail-closed عبر `biometric_devices` · مسار **`/classroom/[classId]`** بـ`classId` حقيقي + خروج الفصل عبر `classroom_exits`.
- **Sprint 3 — مكافآت الفصل (+1 migration مُطبَّق حياً):** جدول **`classroom_rewards`** (نجوم/نقاط إيجابية/أوسمة تُحفظ فعلاً — لا enum مُختلَق ولا اقتصاد metaverse) + النقاط اليومية من المصدر الحقيقي · إزالة `alert()` الخام من المكوّنات.
- **Sprint 4 — إتمام أسطح الفصل:** زر «حفظ المقاعد» (تبديل حقيقي بلا drag وهمي) + «حفظ الأدوار» + ملخّص مكافآت · إزالة `serverError` خام من `AddStaffForm`/إنشاء الفصل/قائمة الموظفين.
- **Sprint 5 — رسائل آمنة + سجلّ المكافآت:** `toSafeError` في خدمات `meeting`/`hr-attendance` + `gamification`/`PortalClient` · سطح «سجل المكافآت والأوسمة» للطالب (قراءة فقط من `classroom_rewards`، حالة فارغة صادقة) · إزالة `onUpdateSeating` غير المستخدم. **التحقّق الحيّ بالمتصفّح محجوب** (DB الحية: 0 فصول/طلاب/تكليفات) — [قائمة التحقّق](docs/audits/CLASSROOM_LIVE_VERIFICATION_CHECKLIST.md).
- **Sprint 6 — كنس `toSafeError` على مستوى المنصّة + تدقيق تقدّم المنهج:** إغلاق `error.message` الخام المتبقي في الخدمات غير المُسمّاة (`wizard`/`student-attendance`/`staff-evaluation`/`period-attendance`/`notification`/`bulk-upload`/`ai-service`) + `useStudentAffairs` + `_actions/{coordinator-classroom,academic-setup}` (37 موضعاً) · **تدقيق ميزة تقدّم المنهج للمعلّم: غير منفّذة** (لا جداول منهج؛ placeholder ميت في تحليلات المدير فقط — بلا نسبة وهمية) → مقترحة كـ Sprint 7. [تدقيق المنهج](docs/audits/CURRICULUM_PROGRESS_FEATURE_AUDIT.md).

**إجراءات مالك متبقية:** ضبط `CRON_SECRET`/`cron_site_url` · `ANTHROPIC_API_KEY` · نشر Edge Functions · توفير بيانات/اعتماد اختبار للتحقّق الحيّ.
**مخاطر متبقية:** سطح تحليلات المدير القديم (`app/principal/analytics/teachers/*`) فيه placeholders ميتة (غير مرئية للمستخدم) تُنظَّف مع Sprint 7 · ميزة تقدّم المنهج تحتاج migration ولم تُنفَّذ.

---

## 📚 دستور النظام والمعمارية الطبقية (System Doctrine) — 2026-06-12

> **المرحلة 1 (التوثيق والدستور) مُنجزة.** دستور سِدرة مُثبَّت في مجلّد `docs/`، وهو **مُلزِم** لكل تطوير لاحق (بشري أو وكيل ذكاء).

### اقرأ قبل التعديل (READ-BEFORE-MODIFY)

قبل تعديل أي **صفحة دور · سير عمل تشغيلي · لوحة · تصدير PDF · ميزة ذكاء اصطناعي · تحليلات · سير عمل قاعدة بيانات**، اقرأ الوثائق الستّ:

- [دستور النظام](docs/architecture/SIDRA_SYSTEM_DOCTRINE.md) · [الطبقات الـ11](docs/architecture/SIDRA_LAYERS.md)
- [طبقة الجودة والتعبئة](docs/quality/QUALITY_FORMS_AND_AUTOFILL_LAYER.md) · [مصفوفة ملكية النماذج](docs/quality/ROLE_QUALITY_FORMS_MATRIX.md) · [قوالب المستأجر](docs/quality/TENANT_QUALITY_TEMPLATES.md)
- [خارطة الطريق](docs/roadmap/SIDRA_IMPLEMENTATION_ROADMAP.md)

### أبرز البنود

- **العلامة المرئية «سِدرة» دائماً** · **اسم المدرسة ديناميكي** من `schools.name` (ممنوع تثبيته في قالب عام — يكسر تعدّد المستأجرين).
- **نماذج/أكواد «الفلاح» خاصة بمستأجر الفلاح** — لا افتراضات عالمية؛ **القدرة عالمية والقوالب لكل مدرسة**. مدرسة بلا برنامج جودة لا تراها.
- **الطبقتان العرضيّتان (6) محرّك التعبئة و(7) نماذج الجودة** تربطان **التدفّق الرسالي:** إجراء تشغيلي → بيانات → تعبئة تلقائية → نموذج جودة → PDF رسمي → مؤشرات → ذكاء (بلا تزييف).
- **قاعدة صدق البيانات:** حالة فارغة صادقة بدلاً من أي رقم/تحليل/ذكاء/PDF وهمي.
- **خارطة الطريق:** المرحلة 2 = توحيد الأصداف + تنظيف بنيوي (خطة 6 وكلاء) · المرحلة 3 = نماذج الجودة وPDF. **لا تُنفَّذ 2/3 الآن.**

---

## 🧭 معمارية المسارات والهوية ومركز القيادة (Routes · Identity · Command Center) — 2026-06-10

### 1) الهوية المعتمدة (Product Identity)
- **العلامة المرئية:** «**سِدرة**». **الشعار:** «**نظام تشغيل مدرسي قائم على البيانات**».
- **الهوية البصرية:** Light-only · خلفية vanilla دافئة · أكسنت teal أساسي + أزرق ثانوي · نص charcoal · **IBM Plex Sans Arabic** · عربي-أولاً RTL · بلا ذهبي/بنفسجي/داكن/زجاج.
- **ممنوع في الواجهة المرئية للمستخدم:** `فلاح` · `Sidra OS` · `School OS` · `سِدرة OS` · `Smart School OS`. («Sidra OS» اسم المستودع الداخلي فقط، لا يُعرض للمستخدم.)

### 2) معمارية المسارات (Route Architecture)
| المسار | الوصف | الـ Shell |
| --- | --- | --- |
| `/` | الصفحة العامة (Landing) | PublicShell (`LandingHeader`) |
| `/login` | صفحة دخول مستقلّة | AuthShell |
| `/portal` | اختيار الدور/الـ persona | PortalShell (`PortalClient`) |
| `/platform/dashboard` | **مركز قيادة المنصّة** (مالك النظام فقط) | **PlatformShell** |
| `/bulk-upload` | الرفع المجمّع (school_principal/admin/secretary) | chrome عام (`GlobalHeader`) |
| `/school/[id]/*` | شجرة عمليات المدرسة (حارس مستأجر) | DashboardShell مستقبلي |
| لوحات الأدوار (`/principal` · `/secretary` · ...) | لوحة متخصصة لكل دور | DashboardShell مستقبلي |

- **`/admin` لم يَعُد مسار مالك النظام** — أُعيدت تسميته إلى **`/platform`** (2026-06-10). أي «admin» متبقٍّ هو إمّا مفتاح الدور `school_admin` أو مصطلح قاعدة بيانات/ترحيل تاريخي فقط.

### 3) الأدوار (Roles)
مفاتيح الأدوار الـ16 **ثابتة** (راجع `ROLE_KEYS_STANDARD.md`). **`school_admin` = «منسق المدرسة»** دور على مستوى المدرسة (tenant)، **ليس** مالك النظام. **`system_owner` = «مالك النظام»** هو مالك المنصّة العالمي (المسار `/platform`، صلاحية wildcard).

### 4) مركز قيادة المنصّة (System Owner Dashboard)
`/platform/dashboard` ليس صفحة «إضافة مدرسة» بل مركز قيادة على مستوى المنصّة: نظرة تنفيذية · عمليات المدارس/المستأجرين · حوكمة المستخدمين والأدوار · مركز جودة البيانات · سجل النشاط/التدقيق · تنبيهات ومخاطر · placeholder صادق لتوصيات الذكاء · إجراءات سريعة · جدول المدارس. **بلا تحليلات وهمية · بلا ذكاء وهمي · بلا صحة منصّة وهمية.**

### 5) قاعدة صدق البيانات (Data Honesty Rule) — إلزامية
أي مقياس غير مدعوم بمصدر بيانات حقيقي **يُعرَض كحالة فارغة/غير-مفعّلة صادقة** («لا توجد بيانات كافية بعد» / «غير مفعّل بعد»)، لا كرقم وهمي ولا حالة «Online/Connected» ثابتة.

### 6) طبقة الذكاء الاصطناعي (AI Layer)
- الذكاء الاصطناعي طبقة **مستقبلية تتوسّع** تُولّد توصيات/تنبيهات/تحليل جاهزية.
- **لا يُعرض mock كأنه AI حقيقي.** التوصيات يجب أن تأتي من pipeline/جدول/job حقيقي؛ وإلا يُعرض placeholder صريح.

### 7) اتجاه الـ Shells
PublicShell · AuthShell · PortalShell · **PlatformShell** (منجز) · **DashboardShell** مستقبلي لأدوار المدرسة. **قاعدة:** الجذر `app/layout.tsx` لا يفرض حشواً علوياً عاماً تقاومه الـ shells المتخصصة؛ كل ترويسة ثابتة (fixed) تملك مباعدها الخاص داخل التدفّق.

### 8) حالة التنظيف المنجزة (2026-06-10)
- ✅ إعادة تسمية `/admin → /platform` + حارس `system_owner` + `PlatformShell`.
- ✅ إعادة بناء `/platform/dashboard` كمركز قيادة (بيانات حقيقية + حالات فارغة صادقة).
- ✅ نقل `bulk-upload` من المنصّة إلى `/bulk-upload` (وصول مُحكَم لـ principal/admin/secretary).
- ✅ إزالة اختراق `-mt-24` من جذوره (مباعدات داخل الترويسات الثابتة).
- ✅ `components/admin` → `components/operations` · `app/api/admin/schools` → `app/api/platform/schools`.
- ✅ لوحات الأدوار العربية في `/portal` + زر تسجيل خروج + حذف مكوّنات portal ميتة.
- ✅ «فلاح» المرئية أُزيلت من `GlobalHeader` → «سِدرة».
- ✅ **بلا أي تغيير** في Supabase/DB/migrations/RLS/auth/persona/مفاتيح الأدوار/التبعيات.

### 9) عمل متبقٍّ معروف (Known Remaining Work)
- بناء **DashboardShell** شامل لأدوار المدرسة وإعادة تصميم لوحاتها تباعاً.
- إكمال نقل أي ميزات مدرسية في غير محلّها.
- مصدر مراقبة **صحة منصّة** حقيقي + مصدر **AI على مستوى المنصّة** + توسيع قواعد **جودة البيانات**.
- تنظيف ~17 تسريب براند قديم خارج النطاق (`Sidra OS`/`School OS`/`Antigravity School OS` في عناوين تبويب/شارات/تذييلات PDF) — **مهمة منفصلة**.
- اسم مستأجر مُثبَّت «مدارس الفلاح الأهلية» في قوالب تقارير PDF (يجب أن يصبح ديناميكياً) + كلمة مرور مؤقتة مُثبَّتة في بطاقات الدخول.
- تحديث لقطات الشاشة لاحقاً عند الحاجة.

### 10) حالة التحقق (Verification)
`npm run lint` → **صفر** · `npm run build` → **63/63 صفحة** · تحقّق عدائي (8 مدقّقين متوازين) → **8/8**. (آخر تشغيل ناجح بعد التنظيف النهائي.)

---

## 🧹 حالة جودة الكود (Code Quality Status)

> **الحالة الراهنة:** جميع المراحل (1–5) مكتملة. `npm run lint` → **صفر أخطاء وصفر تحذيرات**. `npm run build` → **63/63 صفحة** بدون أي خطأ TypeScript. **Virtual-Swimming-Wave (2026-06-03): 100% مكتمل** — تأمين 9 نقاط أمنية + M77 compound unique + layout guards (lrc/qa/science/student-affairs/educational/staff-evaluation/metaverse/admin) + Phase 6 browser hooks → Server Actions + Phase 8c/8e/8f hardening. **Edge Functions + LRC Maintenance (2026-06-03): مُنجز** — `validate-bulk-upload` + `generate-qms-pdf` + `daily-maintenance` + `lrc-maintenance-service`. commit `c05b95a`.

### ✅ المرحلة الأولى — مكتملة

حُذفت ~363 مشكلة من نوع `@typescript-eslint/no-unused-vars` من أكثر من 130 ملفاً، وأُصلحت 3 أخطاء TypeScript مخفية كانت تمنع البناء.

### ✅ المرحلة الثانية — مكتملة

أُصلحت جميع حالات `react/no-unescaped-entities` و `jsx-a11y/alt-text` وحالات `react-hooks/exhaustive-deps` الآمنة.

### ✅ المرحلة الثالثة — مكتملة

أُزيلت جميع حالات `@typescript-eslint/no-explicit-any` من كامل الكود باستخدام interfaces محلية حقيقية وأنواع TypeScript دقيقة.

| المقياس | القيمة |
| ------- | ------ |
| إجمالي المشاكل عند البداية | ~700 |
| `npm run lint` الآن | **0 أخطاء · 0 تحذيرات** |
| `npm run build` الآن | ✅ **63/63 صفحة** · صفر أخطاء TypeScript · `ƒ Proxy (Middleware)` |
| `@typescript-eslint/no-explicit-any` المتبقية | **صفر** |

### ✅ المرحلة الرابعة — مكتملة

جميع analytics hooks تستخدم نمط `startTransition(async () => { await loadData(); })` المتوافق مع React 19. لا حالات `react-hooks/set-state-in-effect` متبقية.

### ✅ المرحلة الخامسة — مكتملة

لا حالات `react-hooks/exhaustive-deps` متبقية. `npm run lint` → **صفر أخطاء، صفر تحذيرات**.

### ⚠️ ملاحظة — ثغرة PostCSS

`npm audit` قد يُظهر ثغرة في `postcss` كاعتمادية داخلية لـ Next.js. لا يمكن إصلاحها بـ `npm audit fix --force` دون كسر البناء. الحل الصحيح هو انتظار تحديث رسمي من فريق Next.js. يُمنع تماماً استخدام `npm audit fix --force` أو تخفيض إصدار أي dependency بسببها.

---

## 🛠️ التقنيات والمكتبات المستخدمة (Tech Stack)

يعتمد مشروع **سِدرة** على حزمة برمجية متطورة وموحدة لضمان الأداء والجمالية والاستقرار:

| الطبقة التقنية (Layer) | التقنيات والمكتبات المعتمدة (Technologies) |
| :--- | :--- |
| **الواجهة الأمامية (Frontend)** | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 |
| **الواجهة الخلفية (Backend)** | Supabase (Auth + PostgreSQL + RLS Policies) |
| **إدارة النماذج والتحقق (Forms)** | Zod · next-safe-action |
| **مكونات الواجهة (UI Components)** | shadcn/ui · Radix UI (للمكونات التفاعلية منخفضة المستوى) |
| **الجداول المتقدمة (Tables)** | TanStack Table |
| **الرسوم والتحليلات (Charts)** | Recharts |
| **الحركة والتفاعل (Animation)** | Framer Motion · GSAP |
| **الأيقونات (Icons)** | Lucide React |
| **الخطوط (Fonts)** | IBM Plex Sans Arabic (الخط الأساسي للواجهة عبر `next/font/google`) |
| **الوضع البصري (Theme)** | Light-only — نظام الوضع الداكن محذوف بالكامل |

---

## 📐 مبادئ تصميم الواجهة (UI Design Principles)

يجب أن تلتزم واجهات **سِدرة** بشكل صارم بالمبادئ التصميمية التالية لضمان تجربة مستخدم موحدة واحترافية:

1. **الالتزام بالمكونات القياسية:** استخدام مكونات `shadcn/ui` كخيار أول وأساسي قدر الإمكان.
2. **التفاعلية منخفضة المستوى:** الاعتماد على `Radix UI` عند الحاجة لبناء أو تخصيص مكونات تفاعلية معقدة.
3. **البيانات والجداول:** استخدام `TanStack Table` حصراً لجميع الجداول المتقدمة والذكية في النظام.
4. **لوحات المؤشرات:** الاعتماد على `Recharts` لبناء الرسوم البيانية الإحصائية ولوحات التحليل.
5. **التحريك الهادف:** استخدام `Framer Motion` للحركات الخفيفة والذكية التي تخدم تجربة المستخدم، وتجنب الإفراط.
6. **الهوية البصرية للأيقونات:** استخدام مكتبة `Lucide React` كالمصدر الافتراضي والوحيد للأيقونات.
7. **النقاء والاتساق:** الحفاظ على تصميم نظيف (Clean Layout)، حديث، متجاوب بالكامل مع مختلف الشاشات، ومتسق في توزيع العناصر والمسافات.
8. **إعادة الاستخدام قبل الإنشاء:** ابحث دائماً في المكونات المشتركة الحالية وأعد استخدامها قبل الشروع في بناء مكون جديد لمنع تكرار الكود.
9. **ترشيد الحزم:** يُمنع تماماً إضافة أي مكتبات واجهة، أو أيقونات، أو جداول، أو أدوات تحريك جديدة إلا بوجود مبرر تقني وعملي صارم وموافقة الفريق.

### قواعد الواجهة المعتمدة

- الواجهة المعتمدة هي **Light UI فقط**.
- يمنع استخدام `dark:` أو بناء صفحات حول خلفيات داكنة قسرية.
- يمنع استخدام `bg-black` أو `bg-zinc-950` أو `bg-slate-950` أو `bg-neutral-950` في مسارات الإنتاج.
- استخدم خلفيات دافئة ناعمة، بطاقات بيضاء أو off-white، حدوداً خفيفة، ونصوصاً محايدة مقروءة.
- لا تضف مكتبات UI جديدة دون موافقة معمارية صريحة.

### قواعد البيانات التجريبية والـ Sandbox

- يمنع وجود mock/demo/fake data داخل مسارات الإنتاج.
- يمنع إبقاء ملفات `.bak` داخل `app/`.
- لا توضع مسارات sandbox أو demo داخل production app routes إلا إذا كانت معزولة ومذكورة صراحة في الوثائق.
- إذا لم تكن الميزة متصلة ببيانات حقيقية، اعرض حالة فارغة واضحة ولا تعرض مؤشرات تبدو إنتاجية.

### قواعد المعمارية والتنفيذ

- لا تقبل `schoolId` من العميل للعمليات الحساسة؛ مصدر tenant يجب أن يكون server-side persona/context.
- يمنع استخدام Supabase browser client للكتابة على بيانات محمية.
- يمنع استخدام `supabaseAdmin` أو `service_role` في user-facing flows.
- يجب أن تستخدم Server Actions تحقق مدخلات وصلاحيات قبل أي mutation.
- بعد أي تنظيف أو تعديل تشغيلي، شغّل `npm run lint` ثم `npm run build`.

---

## 🎨 الهوية البصرية ونظام التصميم (Visual Constitution)

> **الحالة:** الأساس البصري المعتمد (**Phase 3B**) مُطبَّق بالكامل، و**الصفحة الرئيسية العامة (Landing)** أُعيد تصميمها عليه. **UI Unification Sprint 1 مُنجزة** — لوحات الأدوار الإدارية بدأت التقارب على نظام تصميم واحد عبر `components/dashboard/` (راجع قسم «توحيد لوحات الأدوار» أدناه). المتبقّي: Sprint 2 (صدفة LRC) + Sprint 3 (شؤون الطلاب) + بعض اللوحات.

### الـ Design Tokens المعتمدة (في `app/globals.css`)

| الرمز | القيمة | الاستخدام |
| --- | --- | --- |
| `--background` | `#FBF7EF` (vanilla) | خلفية الصفحة — **يمنع `bg-white` كخلفية رئيسية** |
| `--foreground` | `#111827` (charcoal) | النص المهم |
| `--card` / `--surface-soft` | `#FFFFFF` / `#FFFDF8` | أسطح البطاقات الدافئة |
| `--primary` | `#0D9488` (teal) | الأكسنت الأساسي |
| `--color-info` / `--chart-2` | `#3B6FE0` (أزرق) | الأكسنت الثانوي |
| `--border` | `#E8E1D4` | حدود هادئة |
| `--muted-foreground` | `#6B7280` | تعليقات صغيرة/بيانات ثانوية **فقط** (لا للنص المهم) |
| `--radius` | `1rem` (~16px) | نصف قطر موحّد |
| الرسوم (charts) | teal · أزرق · lavender · amber · soft-red | ألوان لوحات التحليل |

- **Light UI فقط** — لا `dark:`، لا خلفيات داكنة، لا زجاج/holographic/antigravity، **لا ذهبي legacy** (حُيِّد إلى teal للتوافق الخلفي).
- **أسماء tokens الخاصة بـ shadcn/ui محفوظة كما هي** — القيم فقط هي التي تغيّرت.

### الخط

- الخط الأساسي للواجهة العربية: **IBM Plex Sans Arabic** عبر `next/font/google` (`--font-sans` في `lib/fonts.ts`).
- أُزيلت خطوط Saudi (localFont) وTajawal وGeist من سلسلة الخط الأساسية؛ `--font-saudi` مُعاد توجيهه إلى `var(--font-sans)`.

### الصفحة الرئيسية العامة (Landing)

- `app/page.tsx`: **Server Component رفيع** (يقرأ الجلسة فقط لتوجيه CTA: مسجّل → `/portal` · غير مسجّل → `/login`) يركّب أقسامًا معيارية في `components/landing/`:
  `LandingHeader` · `HeroSection` (+ `HeroDashboardPreview` لوحة معاينة وهمية بـ SVG/CSS) · `SchoolPulseSection` · `RoleIntelligenceSection` · `DataToActionSection` · `WorkflowSection` · `TrustSection` · `StudentRoomSection` · `FinalCTASection` · `LandingFooter`.
- التموضع: **نظام تشغيل مدرسي مدفوع بالبيانات** (بيانات → رؤى → تنبيهات → مخاطر → توصيات → سير عمل → قرار). عنوان الـ Hero: «مدرستي» + «من البيانات إلى القرارات».
- الرسوم في الـ Hero مبنية بـ **SVG/CSS فقط** — **بلا أي تبعية جديدة** (لا Recharts على صفحة الهبوط).
- `components/layout/GlobalHeader.tsx`: ترويسة التطبيق **مُخفاة على `/`** — الهبوط يستخدم `LandingHeader` الخاص به.

### الـ Metadata (عناوين التبويب)

- `app/layout.tsx`: `title: { default: "سِدرة | نظام تشغيل مدرسي", template: "%s | سِدرة" }`.
- `app/page.tsx`: «الرئيسية | سِدرة» (نصّ مطلق — القالب لا ينطبق على نفس الـ segment الجذر في Next.js).
- `app/(auth)/login`: «تسجيل الدخول | سِدرة».
- أُزيل «أداة فلاح» و«Sidra OS» نهائياً من كل metadata نشط — العلامة المرئية المعتمدة هي «سِدرة».

### تنظيف مكوّنات الهبوط القديمة

- **حُذفت 8 ملفات** غير مستخدمة (صفر استيراد، تحقّق grep شامل): `HighlightTile` · `KPIStatCard` · `LivePulse` · `PublicFeed` · `SkeletonLoaders` (في `components/landing/`) + `HolographicCard` · `AntigravityMagneticText` · `AntigravityParticlesCanvas` (في `components/ui/`).
- **أُبقيت:** `LoginCard` (تستخدمها صفحة الدخول) · `GlassSkeleton` (تستخدمها صفحات `loading.tsx`).

> `npm run lint` → صفر أخطاء/تحذيرات · `npm run build` → **63/63 صفحة** · لا تبعيات جديدة.

---

## 🧩 توحيد لوحات الأدوار (UI Unification — Sprint 1) — مُنجزة

> **المبدأ:** **تجربة موحّدة، محتوى خاص بالدور (Unified Experience, Role-Specific Content).** نظام تصميم واحد وصدفة واحدة عبر لوحات الأدوار الإدارية؛ الاختلافات بين الأدوار تُدار عبر **الودجِت · المحتوى · الصلاحيات · البيانات · الإجراءات · لوحات الجودة** — **لا** عبر أنظمة بصرية أو بطاقات أو ترويسات أو أزرار منفصلة.

### المُخرجات
- **مجموعة مكوّنات موحّدة** في `components/dashboard/`: `PageHeader` · `DashboardSection` · `MetricCard` · `ActionCard` · `EmptyState` · `DashboardGrid` · `RoleWelcomeCard` · `SegmentedTabs` (+ `tones.ts`). للشارات: أُعيد استخدام `components/ui/StatusBadge.tsx` و`Pill.tsx`؛ لسطح الجودة: `components/quality/QualityOwnerPanel.tsx`.
- **طبقة إعداد محتوى الأدوار** `lib/dashboard/role-dashboard.ts` (العنوان · الفرعي · وحدة الجودة المملوكة لكل دور) — تنقل الاختلافات إلى بيانات إعداد بدل `if role === ...`.

### الحالة لكل صفحة
- **مُوحَّدة بالكامل (8):** `/educational` · `/staff-evaluation` · `/science` · `/qa` · `/secretary` · `/activity` · `/counselor` · `/health`.
- **مُوحَّدة جزئياً (2):** `/principal` (ترويسة + مؤشّرات حقيقية + شبكة تنقّل؛ حُذفت التحليلات الوهمية المُثبَّتة سابقاً واستُبدلت بحالة فارغة صادقة) · `/classroom`.
- **لم تُوحَّد بعد (3):** `/student-affairs` (شجرة ضخمة — Sprint 3) · `/lrc` (صدفة يدوية — **Sprint 2**) · `/school/[id]/dashboard` (المرجع المعتمد — استخراج لاحق).
- نُقلت 6 لوحات عن `KPICard` القديمة إلى `MetricCard`. **التالي المُوصى به: UI Unification Sprint 2 — ترحيل صدفة LRC** إلى `RoleDashboardShell`.

> التقرير الكامل: [docs/ui/ROLE_DASHBOARD_UNIFICATION_REPORT.md](docs/ui/ROLE_DASHBOARD_UNIFICATION_REPORT.md). `npm run lint` → صفر · `npm run build` → **63/63** · بلا تغيير DB/RLS/migrations/auth/persona/مفاتيح الأدوار/التبعيات.

---

## 📁 بنية ومجلدات المشروع (Project Architecture)

تم تنظيم المشروع ليعكس الهيكل الإداري والأكاديمي للمنشآت التعليمية من خلال مسارات واضحة:

```text
app/                         — صفحات واجهة المستخدم بناءً على الصلاحيات والأدوار (Next.js App Router)
├── platform/                — منطقة مالك النظام (system_owner فقط) — أُعيدت تسميتها من admin (2026-06-10)
│   ├── dashboard/           — مركز قيادة المنصّة (نظرة تنفيذية + حوكمة الأدوار + جودة البيانات + التدقيق + التنبيهات)
│   ├── automation/          — قواعد الأتمتة البرمجية للنظام (automation_rules)
│   ├── setup/               — محرك الاستيراد الإداري + اختيار المدرسة الهدف
│   ├── timetable/           — إدارة وإعداد الجدول الدراسي العام
│   └── schools/             — إدارة المدارس (الموظفون + التهيئة + إنشاء مدرسة)
├── bulk-upload/             — الرفع المجمّع (school_principal/admin/secretary) — نُقل خارج المنصّة (2026-06-10)
├── school/[id]/             — شجرة عمليات المدرسة بحارس مستأجر (dashboard · setup · staff · classroom · school-affairs)
├── principal/               — لوحة عمل مدير المدرسة (وتشمل 9 صفحات تحليلات بيانية متقدمة)
├── student-affairs/         — لوحة وكيل شؤون الطلاب (الغياب + الإحالات السلوكية + رصد السلوك)
├── secretary/               — لوحة عمل سكرتير المدرسة والمهام الإدارية
├── qa/                      — قسم ضمان الجودة وأدوات الملاحظة الصفية والتقييم
├── lrc/                     — مركز مصادر التعلم (إدارة الزيارات + الإعارات للكتب + حجوزات القاعات)
├── health/                  — العيادة والصحة المدرسية (سجل الزيارات الصحية + الإحالات الطبية + إدارة المستلزمات)
├── classroom/               — لوحة إدارة الفصل الخاصة بالمعلم ورصد درجات الطلاب
├── counselor/               — لوحة الموجه الطلابي (المعاملات الإرشادية + الجلسات الخاصة + بلاغات الحالات)
├── meetings/                — نظام الاجتماعات التفاعلية (الملاحظات الحية Live Notes + التوقيع الرقمي)
├── period-attendance/       — النظام اللحظي لتسجيل حضور وغياب الحصص الدراسية
├── notifications/           — مركز إدارة وإرسال الإشعارات الشامل
├── workflows/               — تتبع تدفقات العمل وبوابات الاعتماد والموافقات (Approval Gates)
├── staff-evaluation/        — تقويم وتتبع الأداء الوظيفي للكادر التعليمي والإداري
├── activity/                — إدارة برامج الأنشطة الطلابية والفعاليات المدرسية
├── science/                 — إدارة وتتبع المختبرات العلمية والتجارب
├── educational/             — إدارة الوحدات والمناهج الأكاديمية والخطط الدراسية
└── portal/                  — بوابة أولياء الأمور لمتابعة الأبناء

components/
├── landing/                 — أقسام الصفحة الرئيسية العامة المعيارية (Hero · SchoolPulse · RoleIntelligence · DataToAction · Workflow · Trust · StudentRoom · FinalCTA · Header/Footer)
├── ui/chart-container.tsx   — مكوّن موحَّد ومخصص لـ Recharts (يقوم بتغليف ResponsiveContainer)
└── ui/...                   — المكونات الأساسية للنظام المستمدة من وثائق shadcn/ui

lib/
├── auth/                    — خدمات الصلاحيات والأمان (pbac.ts · roles.ts · context-service.ts)
├── db/                      — إعدادات الاتصال بقاعدة البيانات (supabase-browser.ts · supabase-admin.ts)
├── services/                — الخدمات المشتركة (audit-service.ts لتدقيق الحسابات · dashboard-data.ts لجلب التحليلات)
├── jobs/                    — المهام المجدولة والتشغيل التلقائي الخلفي (مثل ملف التغذية اليومي daily-feed)
└── types/                   — ملفات تعريف الأنواع والـ TypeScript (academic · lrc · health · qa · ai ...)

db/
└── migrations/              — المصدر الموثوق لمخطط قاعدة البيانات (≈97 ملف ترحيل · 13 متتبَّعة حياً · 116 جدول · 0 كائن مطلوب مفقود — راجع docs/db/MIGRATION_TRACKING_AUDIT.md)

```

---

## ⚙️ تشغيل المشروع محلياً (Getting Started)

لتشغيل المشروع في بيئة التطوير المحلية، نفذ الأوامر التالية بالتسلسل:

```bash
# 1. تثبيت الاعتمادات والمكتبات البرمجية
npm install

# 2. إنشاء ملف متغيرات البيئة من القالب (ثم أضف القيم الفعلية)
cp .env.example .env.local

# 3. تشغيل خادم التطوير المحلي
npm run dev

# 4. تشغيل مجموعة الاختبارات (اختياري)
npm test

```

بعد التشغيل، يمكنك فتح الرابط التالي في متصفحك: [http://localhost:3000](http://localhost:3000)

### 🛠️ أوامر مفيدة للمطورين

**لفحص إصدارات الحزم الأساسية والتأكد من مطابقتها للمعايير:**

```bash
npm list next typescript tailwindcss @tanstack/react-table recharts framer-motion lucide-react
```

**لفحص جودة الكود وبناء المشروع واكتشاف الأخطاء قبل الرفع:**

```bash
npm run lint
npm run build
```

**لإضافة مكونات واجهة جديدة من حزمة `shadcn/ui` عند الحاجة القصوى:**

```bash
npx shadcn@latest add button card table dialog dropdown-menu tabs input select textarea badge sheet tooltip
```

> ⚠️ **ملاحظة:** لا تقم بإنشاء أو إضافة مكونات جديدة إلا إذا دعت الحاجة الفعلية لذلك، وتأكد أولاً من إمكانية إعادة استخدام المكونات الموجودة فعلياً داخل مسار `components/ui`.

---

## 🗄️ معمارية قاعدة البيانات والتحكم (Database & Architecture)

تعتبر المجلدات والملفات داخل المسار `db/migrations/` هي **المصدر الوحيد للحقيقة (Single Source of Truth)** لكل ما يتعلق ببنية ومخططات قاعدة البيانات. يرجى مراجعة ملف `db/README.md` للاطلاع على القائمة التفصيلية لكافة الترحيلات وترتيب تطبيقها الزمني.

### 📐 المبادئ المعمارية الحاكمة لتطوير قاعدة البيانات

| المبدأ المعماري | آلية التطبيق البرمجية في النظام |
| --- | --- |
| **عزل المستأجرين (Multi-Tenancy)** | إدراج حقل `school_id uuid NOT NULL` بشكل إجباري على كل جدول نشط في قاعدة البيانات. |
| **المصادقة والتحقق (Authentication)** | الاعتماد الكلي على نظام `Supabase Auth` وقراءة الـ JWT عبر دالة: `auth.jwt() -> 'app_metadata'` |
| **التحكم في الوصول والأمان** | تفعيل سياسات أمان مستوى الصف (**RLS Policies**) على كل جدول يتم إنشاؤه بلا أي استثناءات. |
| **إدارة الأدوار والصلاحيات** | الاعتماد على معمارية التحكم بالوصول المستند إلى الصلاحيات والأدوار المتقدمة (**PBAC**)، وتوصيف 16 دوراً رسمياً في ملف `lib/auth/pbac.ts`. |

---

## 🎭 الأدوار الرسمية المعتمدة في النظام (Official System Roles)

يحتوي نظام **سِدرة** على **16 دوراً رسمياً ومحدداً** يمنع تعديل مسمياتها أو صلاحياتها إلا بعد الرجوع لهندسة النظام وإجراء مراجعة شاملة للأثر الكلي:

1. `system_owner` (مالك النظام)
2. `school_admin` (منسق المدرسة — دور على مستوى المدرسة، **ليس** مالك النظام)
3. `school_principal` (مدير المدرسة)
4. `school_affairs_vp` (وكيل الشؤون المدرسية)
5. `student_affairs_vp` (وكيل شؤون الطلاب)
6. `academic_vp` (وكيل الشؤون التعليمية)
7. `school_librarian` (أمين مصادر التعلم)
8. `school_secretary` (سكرتير المدرسة)
9. `activity_leader` (رائد النشاط الطلابي)
10. `student_counselor` (الموجه الطلابي)
11. `quality_coordinator` (منسق الجودة)
12. `health_coordinator` (الموجه الصحي)
13. `lab_technician` (محضر المختبر)
14. `teacher` (المعلم)
15. `student` (الطالب)
16. `parent` (ولي الأمر)

---

## 🔒 آخر التغييرات الأمنية المنفّذة

| التغيير | التفاصيل |
| ------- | -------- |
| حذف Demo Mode بالكامل | لا `lib/mock-data/`، لا `NEXT_PUBLIC_DEMO_MODE`، لا زر دخول تجريبي |
| تفعيل `proxy.ts` كـ Middleware | Next.js 16 يستخدم `proxy.ts` مباشرةً — الحماية تعمل الآن فعلياً |
| إصلاح JWT verification | استُبدل فك base64 اليدوي بـ `jose.jwtVerify` مع تحقق من التوقيع |
| إصلاح `BulkUploadModal` | الكتابة المباشرة من المتصفح استُبدلت بـ Server Action مع `school_id` |
| M77 — compound unique constraint | `student_profiles`: حُذف `national_id` unique عالمي، أُضيف `UNIQUE(school_id, national_id)` + index |
| تأمين bulk-upload route | `app/api/bulk-upload/process/[jobId]/route.ts` يضم `school_id` في كل record + `onConflict: 'school_id,national_id'` |
| تأمين automation actions | `app/admin/automation/_actions.ts`: toggle/delete يفلتران بـ `school_id` + create يأخذ schoolId من persona |
| تأمين assignTeacherToSlot | `app/_actions/coordinator-classroom.ts`: فحص ملكية المعلم للمدرسة + `school_id` filter على timetable_slots |
| تأمين AI service | `lib/services/ai-service.ts`: فحص ملكية الطالب للمدرسة قبل بناء payload + `school_id` في analytics query |
| إزالة Mock ID | `app/classroom/[grade]/[section]/page.tsx`: حُذف fallback `"TCH123"` — يُوقَف عند غياب user.id |
| إزالة system_role من invite | `app/_actions/invite.ts`: حُذف `system_role: 'system_user'` من upsert لحماية قيمة system_owner |
| إصلاح activity_leader path | `lib/auth/roles.ts`: `ROLE_DASHBOARD_MAP` صُحِّح من `/activities` إلى `/activity` |
| Layout guards جديدة | `app/lrc/layout.tsx` (school_librarian) · `app/qa/layout.tsx` (quality_coordinator) · `app/science/layout.tsx` (lab_technician) |
| Phase 6 — 8 browser hooks → Server Actions | `app/{qa,science,health,lrc,activity,classroom,secretary}/_actions.ts` منشأة + `app/student-affairs/_actions.ts` مُوسَّع — كل mutation تضيف `school_id: persona.schoolId` من server-side عبر `createSupabaseServerClient()` + `getActivePersona()`. لا browser writes لبيانات محمية. |
| Admin layout guard | `app/admin/layout.tsx` — role: `system_owner` يغطي جميع مسارات `/admin/*` التي كانت مكشوفة. commit `0bf76d8`. |
| Phase 7b — layout guards إضافية | `app/student-affairs/layout.tsx` · `app/educational/layout.tsx` · `app/staff-evaluation/layout.tsx` · `app/student/metaverse/layout.tsx` — أدوار: student_affairs_vp / academic_vp / school_principal / student. commits `fc1748b` + `3b44d1b`. |
| Phase 8c — timetable Server Component | `app/admin/timetable/page.tsx` → async Server Component + `TimetableClient.tsx`. يُصلح query legacy `profiles.role='teacher'` → `user_personas!inner(full_name)`. commit `3b44d1b`. |
| Phase 8e/8f — school_id hardening | `period-attendance-service.ts` + `meeting-service.ts`: explicit `.eq('school_id', persona.schoolId)` defense-in-depth على جميع UPDATE queries. commit `0bf76d8`. |
| Supabase Audit Phase 3 — role cleanup | `db/migrations/20260604_harden_legacy_rpc_and_roles.sql`: REVOKE anon من dangerous RPCs · DROP `get_my_role()` · DROP policy `"Assigned Role Update Cases"` · تحويل `invites.target_role` + `cases.assigned_to_role` من `user_role` → `school_role_type` (super_admin → system_owner) · DROP TYPE `user_role` · CREATE `rate_limit_tracker` + `increment_rate_limit`. يُطبَّق يدوياً. |
| Supabase Audit Phase 4 — ledger infrastructure | `db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql` v2: CREATE `app_private` schema + `app_private.secrets` (بديل vault) · `system_config` + RLS · partial index `unique_student_source_event` · `rpc_process_transaction` v2 (null school_id guard) · `rpc_complete_quest(uuid, uuid)` · REVOKE anon من scan/furniture. يُطبَّق يدوياً. |
| Phase 1 — مواءمة توجيه الأدوار | `lib/auth/roles.ts`: مواءمة `ROLE_DASHBOARD_MAP` + `ROLE_ACCESS_MAP` مع شجرة `app/` الفعلية (5 أدوار كانت توجَّه لمسارات مفقودة) · `activity_leader` ACCESS صُحِّح `/activities`→`/activity` · `app/student/page.tsx` + `app/parent/page.tsx` صفحتا هبوط فارغة آمنة (بلا mock) · `CommandPalette` لم يعد يفترض `system_owner` ويقرأ الدور من `AuthContext` + light tokens · `lib/routes.ts` mojibake مُصلَح. lint + build + test نجحت. |
| Phase 2A — حارس مستأجر `/school/[id]` | `app/school/[id]/layout.tsx` (جديد): تحقق `schoolId` (UUID) + persona موثوقة + دور ∈ {`system_owner`, `school_admin`, `school_affairs_vp`} + تطابق المدرسة لغير `system_owner` — **فشل مغلق** · `lib/routes.ts` حذف إدخال `/school/:id/setup` المعطوب · `lib/auth/roles.ts` حذف بادئة `/school-ops` الميتة. lint + build + test نجحت. |
| Phase 2B — عزل بيانات `classroom/[classId]` | قيد `school_id` على استعلام `classes` (admin client يتجاوز RLS) + `notFound()` فشل-مغلق + `validateSchoolAccess` · تحصين `getClassTimetable` بـ `schoolId`. فحص Supabase حي: `classes`/`timetable_slots` `school_id NOT NULL` وRLS سليمة — بلا migration. |
| Phase 2C — توحيد + تضييق | حذف 7 دوال مكررة ميتة من `app/_actions/staff.ts` (المصدر `coordinator-classroom.ts`) · حُرّاس متداخلة `school/[id]/{staff,classroom}` (admin-only) عبر `lib/auth/school-page-guard.ts` · تحقق tenant لـ `class_id`/`academic_year_id`+`school_id` في admin-import. |
| Phase 2D — تصحيح ملكية الأدوار | `school_affairs_vp` (تشغيلي) ضُيِّق إلى `['/school','/portal']` ومحصور بصفحة `school-affairs` عبر حُرّاس admin-only على `dashboard`/`setup`/`academic-setup` · `academic_vp` (تعليمي) أُبقي على نطاقه · إزالة `student_affairs_vp` من إدارة الفصول · مصفوفة أدوار-مجالات موثّقة. |
| Phase 2E — تنظيف ما قبل UX | **Student Metaverse ميزة مقصودة** — `app/student/metaverse/page.tsx` صفحة فهرس بروابط لأبنائها (إصلاح 404، بلا حذف) + إعادة إدراجها في routeMetadata · إنشاء `db/migrations/20260606_drop_classes_school_id_default.sql`. lint + build + test نجحت. |
| Phase 2F — إغلاق DB hardening | ✅ **تم تطبيق** `db/migrations/20260606_drop_classes_school_id_default.sql` على Supabase الحي والتحقق: `classes.school_id` = `uuid NOT NULL` · `default = NULL` (أُزيل الصفري) · 0 صفوف · RLS مفعّلة (3 سياسات). lint + build (63/63) + test نجحت. |

---

## 🚫 قواعد العمل الصارمة وتوجيهات التطوير (Strict Business Rules)

يجب على جميع المطورين الالتزام التام بالقواعد التالية أثناء العمل على المشروع، ومخالفتها قد تؤدي إلى كسر معمارية النظام:

* ❌ **ملفات البيئة:** لا تقم بتعديل أو رفع ملف `.env.local` إطلاقاً تحت أي ظرف.
* ❌ **إدارة المستودع:** يمنع منعاً باتاً استخدام أمر الدفع القسري `git push --force` للحفاظ على سلامة شجرة التغييرات.
* 📝 **لغة الكود والتعليقات:** تُكتب الشيفرة البرمجية (Code) بالكامل باللغة **الإنجليزية**، بينما تُكتب التعليقات التوضيحية (Comments) وشرح الدوال باللغة **العربية**.
* 🔒 **الجداول الجديدة والأمان:** أي جدول جديد يتم إنشاؤه يجب أن يحتوي على حقل `school_id NOT NULL` ويتم تفعيل سياسة الـ `RLS` الخاصة به في **نفس ملف الترحيل** الذي أنشأ الجدول.
* 📁 **قراءة المعمارية:** اقرأ وافهم بنية المجلدات الحالية جيداً قبل إضافة أي ملفات أو مسارات جديدة.
* 🔍 **منع التكرار المظهري:** لا تنشئ مكونات واجهة مكررة إذا كان هناك مكوّن حالي يؤدي نفس الغرض أو قريب منه.
* 🛑 **مسميات الأدوار:** لا تقم بتغيير مسميات الأدوار الرسمية الـ 16 بأي شكل من الأشكال دون عمل مراجعة أثر شاملة (Impact Analysis).
* 🛡️ **سياسات RLS:** لا تقم بتعديل أو تحديث سياسات RLS دون فهم كامل وعميق لأثرها على آلية عزل المدارس ومستأجري النظام لحماية البيانات من التسريب.
* 📊 **الرسوم البيانية المشتركة:** عند بناء الرسوم البيانية والإحصائية، استخدم مكوّن `components/ui/chart-container.tsx` الموحد لضمان التوافقية والسمات الموحدة.
* 🧬 **الاستدامة:** حافظ دائماً على كتابة كود نظيف قابل للصيانة والتوسع المستقبلي على المدى الطويل (Maintainability & Scalability).

---

## 🚨 ملاحظات هامة جداً قبل الإطلاق (Pre-Launch Checkpoints)

نظراً لأن المشروع يمر حالياً بمرحلة **ما قبل الإطلاق (Pre-Launch)**، يجب أخذ النقاط الحيوية التالية بعين الاعتبار والتركيز عليها أثناء التطوير:

1. **عزل البيانات:** لا توجد أي بيانات إنتاجية حقيقية حالياً، لذا استغل هذه الفترة في اختبار وفحص بنية الجداول بمرونة.
2. **إعادة الهيكلة المظهرية:** من الممكن والمسموح إعادة تصميم أو هيكلة بعض واجهات المستخدم الحالية قبل إتاحة النظام للاستخدام الفعلي.
3. **أمن الـ RLS:** يجب إجراء اختبارات أمان واختراق مكثفة وصارمة لسياسات `RLS` للتأكد التام من استحالة تداخل أو تسريب البيانات بين المدارس قبل تسجيل أي مستخدم حقيقي.
4. **تدفقات الصلاحيات:** يجب التحقق واختبار كافة تدفقات الأدوار والصلاحيات والتأكد من أن كل مستخدم يرى فقط ما يناسب دوره الوظيفي.
5. **تجربة المستخدم (UX Review):** يجب مراجعة تجربة المستخدم والأداء الفعلي لكل لوحة تحكم بشكل منفصل بناءً على طبيعة عمل كل دور وظيفي.
6. **الخدمات والبيانات الحقيقية:** تأكد تماماً من أن كل صفحة أو لوحة تحكم تقوم باستدعاء وجلب بياناتها من الخدمات المخصصة لها والموجودة داخل مسار `lib/services/` أو ما يعادلها. **لا توجد بيانات وهمية (Mock Data) في التطبيق** — تم حذف `lib/mock-data/` بالكامل.

---

## 🎯 الهدف العام للنظام (Ultimate Goal)

إن الهدف الأسمى من بناء وتطوير نظام **سِدرة** هو تقديم منظومة برمجية مدرسية فائقة التنظيم، آمنة للغاية، وقابلة للتوسع اللانهائي، تساعد المؤسسات التعليمية على إدارة وتسيير عملياتها اليومية بسلاسة تامة، بالإضافة إلى تحويل البيانات التشغيلية والمدرسية الخام إلى مؤشرات إحصائية واضحة ورسوم بيانية ذكية تدعم صناع القرار الإداري والتربوي داخل المدرسة.
