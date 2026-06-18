# خارطة طريق تنفيذ سِدرة — SIDRA IMPLEMENTATION ROADMAP

> **النوع:** خارطة طريق — ترتيب المراحل والنطاق.
> **العلاقة:** ينفّذ ما تثبّته [SIDRA_SYSTEM_DOCTRINE](../architecture/SIDRA_SYSTEM_DOCTRINE.md).
> **حالة المشروع:** PRE-LAUNCH — لا مستخدمون · لا بيانات إنتاجية. **آخر تحديث:** 2026-06-18 (بعد Security Hardening Sprint + UI Unification Sprint 1 · commit `e913cc6`).

---

## ✅ Security Hardening Sprint (2026-06-13) — مُنجزة

سبرنت أمني مستقل عالج أبرز نتائج **High** من تدقيق 3E-5 من الجذر (الترحيل `M82`):
عزل مستأجر `generateInvite` · `generate-qms-pdf` **fail-closed** · QMS PDF عبر **bucket خاص + signed URLs** و`pdf_url=null` · منع الكتابة المباشرة للـ ledger/المحفظة (الكتابة **حصراً** عبر `rpc_process_transaction`) · موافقة الرحلة العامة → **server actions مُقيَّدة بتوكن** (لا anon client) · **REVOKE EXECUTE** عن 12 دالة trigger/أداة (PUBLIC/anon/authenticated) · فهرس **dedup** فريد لـ `generated_forms` · تدوير `ledger_secret_salt`. advisors بعد الإصلاح: **0 ERROR**.
**متبقٍّ (إجراء مالك فقط):** ضبط `CRON_SECRET` وقت التشغيل (Vercel + Supabase Edge + DB) — حتى ذلك تبقى cron و`generate-qms-pdf` **fail-closed (آمنة)**. التفاصيل: [ملخّص الأمن](../security/SECURITY_AND_MIGRATION_AUDIT_SUMMARY.md) · [إعداد CRON](../security/CRON_SECRET_RUNTIME_SETUP.md).

---

## مبدأ عام

التركيز الحالي: **الاستقرار والأمان والتوجيه وعزل المستأجر وتثبيت الدستور** — قبل أي إعادة تصميم بصري premium للوحات الداخلية. التنفيذ **تدريجي**، وكل مرحلة تنتهي بـ `npm run lint` + `npm run build` نظيفين.

> **ملاحظة:** `/login` **ليس حاجزاً** — عُطله السابق (404) كان كاش `.next` قديماً، حُلّ محلياً بمسح الكاش. **أُزيل من خارطة الطريق كـ blocker.**

---

## ✅ المرحلة 1 — التوثيق والدستور (Documentation & System Doctrine) — مُنجزة

**الهدف:** تثبيت دستور سِدرة داخل المستودع ليُلزَم به كل تشغيل لاحق لـ Claude/Codex.

**المُخرجات (وثائق/Markdown فقط — بلا كود/DB):**
- `docs/architecture/SIDRA_SYSTEM_DOCTRINE.md`
- `docs/architecture/SIDRA_LAYERS.md`
- `docs/quality/QUALITY_FORMS_AND_AUTOFILL_LAYER.md`
- `docs/quality/ROLE_QUALITY_FORMS_MATRIX.md`
- `docs/quality/TENANT_QUALITY_TEMPLATES.md`
- `docs/roadmap/SIDRA_IMPLEMENTATION_ROADMAP.md` (هذا الملف)
- تحديث `README.md` · `CLAUDE.md` · `CODEX.MD` · `db/README.md` بقاعدة «اقرأ الوثائق قبل التعديل» + بنود الدستور.

**القيد:** لا لمس لمنطق التطبيق/UI/DB/migrations/RLS/auth/persona/مفاتيح الأدوار/التبعيات.

---

## 🚧 المرحلة 2 — توحيد الواجهة والأصداف والتنظيف البنيوي (UI / Shell Unification) — قيد التنفيذ

**الهدف:** نظام تصميم واحد + صدفة موحّدة (RoleDashboardShell) عبر لوحات الأدوار + تنظيف بنيوي — **دون** كسر أي خدمة قائمة. **المبدأ:** تجربة موحّدة، محتوى خاص بالدور (الفروق في الودجِت/المحتوى/الصلاحيات/الإعداد، لا في أنظمة بصرية منفصلة).

### ✅ UI Unification Sprint 1 (2026-06-18 · commit `e913cc6`) — مُنجزة
- **مجموعة مكوّنات موحّدة** `components/dashboard/` (`PageHeader`/`DashboardSection`/`MetricCard`/`ActionCard`/`EmptyState`/`DashboardGrid`/`RoleWelcomeCard`/`SegmentedTabs`) + **إعداد محتوى الأدوار** `lib/dashboard/role-dashboard.ts`.
- **مُوحَّدة بالكامل (8):** `/educational` · `/staff-evaluation` · `/science` · `/qa` · `/secretary` · `/activity` · `/counselor` · `/health`. **جزئياً (2):** `/principal` · `/classroom`. نُقلت 6 لوحات عن `KPICard` القديمة إلى `MetricCard`.
- app-code فقط · `npm run lint` صفر · `npm run build` 63/63 · بلا تغيير DB/RLS/auth/persona/مفاتيح الأدوار/التبعيات. التقرير: [توحيد لوحات الأدوار](../ui/ROLE_DASHBOARD_UNIFICATION_REPORT.md).

### ▶️ المتبقّي (لم يبدأ)
- **UI Unification Sprint 2 — ترحيل صدفة LRC:** استبدال الصدفة اليدوية في `app/lrc/_components/LrcWorkspace.tsx` بـ `RoleDashboardShell` (أعلى أولوية).
- **UI Unification Sprint 3 — إعادة هيكلة شؤون الطلاب:** توحيد شجرة `/student-affairs` الضخمة على الـ kit مع حفظ التدفّقات الحيّة.
- **استخراج/إعادة هيكلة `school/[id]/dashboard`** (المرجع المعتمد) لاستيراد المكوّنات المشتركة.
- **تنظيف أعمق لبقايا `Card`/`KPICard` القديمة** داخل مكوّنات الأبناء (health/lrc/qa/science/secretary `_components`).
- التنظيف البنيوي الأعمق (توحيد مصادر الأدوار · كود ميت · حُرّاس متبقّية) عبر خطة الوكلاء الستّة أدناه.

**خطة تدقيق بـ 6 وكلاء (للتنظيف البنيوي الأعمق — للتنفيذ لاحقاً):**

| الوكيل | المسؤولية |
| --- | --- |
| **Agent 1** | المسارات + الأصداف (shells) + الشريط الجانبي (sidebar/nav) — توحيد إطار اللوحات. |
| **Agent 2** | الكود الميت (dead code / unused exports / ملفات صفر-استيراد). |
| **Agent 3** | التنسيق القديم: `dark:` · glass/holographic · ذهبي (gold) · بنفسجي (purple) — مواءمة مع الدستور البصري. |
| **Agent 4** | الأمان / RBAC / عزل المستأجر — حُرّاس layout مفقودة (student/parent) + فحص `school_id`. |
| **Agent 5** | خرائط الأدوار والمكرّرات (`getRoleInfo` مقابل `roleDisplay.ts` مقابل `ContextBanner`) — مصدر واحد. |
| **Agent 6** | الحفاظ على الخدمات صفحة‑بصفحة — ضمان عدم فقد أي ربط بيانات/خدمة عند إعادة التأطير. |
| **القائد (Lead)** | يدمج مخرجات الوكلاء، يحلّ التعارضات، يحرس «لا كسر خدمة». |

**القيود الثابتة:** لا إعادة تسمية مجلدات (`activity`/`lrc`/`qa`/`educational`) · لا نقل صفحات admin إلى `school/[id]` · لا تغيير `active_persona`/نموذج المصادقة قبل فحص Supabase الحي · أي تغيير Supabase يفحص المشروع الحي أولاً.

---

## 🚧 المرحلة 3 — تنفيذ طبقة نماذج الجودة و PDF (Quality Forms & PDF Layer) — قيد التنفيذ

**الهدف:** تفعيل القدرة العالمية بقوالب لكل مستأجر، وفق [TENANT_QUALITY_TEMPLATES](../quality/TENANT_QUALITY_TEMPLATES.md).

**الشرائح المُنجزة (2026-06-13 · app-code فقط · `npm run lint` صفر · `npm run build` 63/63 · بلا DB/RLS/auth/تبعيات):**
- ✅ **3B** — اسم مدرسة ديناميكي في قوالب PDF المشتركة (إزالة الأسماء المُثبَّتة) + إصلاح علامة secretary + mojibake في Activity. commit `87dd70f`.
- ✅ **3C** — عربية PDF في `generate-qms-pdf` (خط Amiri محلي + `arabic-persian-reshaper`/`bidi-js` كاستيراد Edge فقط) + ترويسة ديناميكية بـ`schools.name`. commit `561d695`.
- ✅ **3D** — سجلّ قوالب المستأجر `lib/quality/tenant-templates.ts` (أكواد QF كـ tenant-specific + بوّابة إتاحة fail-closed).
- ✅ **3D-2** — تسجيل مدرسة الفلاح (معرّف Supabase حقيقي) + ربط مُستهلِكات health/activity/secretary/counseling بالبوّابة.
- ✅ **3D-3** — تبويب كل أسطح QF المالكة بالسجلّ: + lrc + qa (corrective-action، وحدة `qa` + QF03-1) + student-affairs. أدوار إشرافية + lab_technician مخطّطة بلا لوحة بعد. `school_affairs_vp` مُستثنى.
- ✅ **3D-4** — لوحات جودة مخطّطة مُبوّبة (`QualityOwnerPanel`) لـ principal · school_admin · academic_vp · lab_technician (placeholder «قيد الاعتماد» · بلا رمز QF · بلا تصدير) + تنظيف تسريب `SMART SCHOOL OS`.
- ✅ **3E** — أساس التعبئة والأدلة: `lib/quality/generated-forms.ts` · `quality-evidence.ts` · `autofill.ts` (مُبوّبة بسجلّ المستأجر · `school_id` من سياق مصادَق · قالب مُنفَّذ فقط · منع تكرار · fail-closed) + ربط qa (`QF03-1`) عبر الخدمة.
- ✅ **3E-2** — جاهزية + إعدادات قابلة للتحرير: (أ) توحيد أكواد QF بـ `aliases`/`displayCode` (`QF19-*`↔`QF-19-*`) + ربط `meeting-service` عبر الخدمة. (ب) `academic_years`/`quality_indicators` كافيان بنيوياً → seed سنة نشطة `2025-2026` + مؤشر `ATT-001` للفلاح (M81) **وتطبيق trigger M78 على DB الحية** (كان مفقوداً) → **سلسلة الحضور→الدليل حيّة**. (ج) جداول DB قابلة للتحرير M80 (`school_quality_settings` + `school_quality_template_overrides` + RLS لـ `school_admin`/`system_owner`) + `lib/quality/template-settings.ts` (أسبقية form→module→school→registry · لا يمسّ `generated_forms`). طُبِّقت M80+M78+M81 وتُحُقِّق منها.
- ▶️ **متبقٍّ:** UI إدارة إعدادات الجودة لـ `school_admin` · ربط تدفّقات أدلة بقية الوحدات (+ توسيع `source_module` CHECK عند الربط) · اعتماد القوالب الرسمية للأدوار الأربعة ثم بناء مولّداتها · بناء قوالب LRC الثمانية · خط عربي لمولّدات jsPDF المتبقية إن لزم.

**النطاق:**
- تمرير **اسم المدرسة ديناميكياً** لكل قالب PDF (إزالة الأسماء المُثبَّتة — يبدأ بـ `HealthReports.tsx:103`). app-code، بلا schema.
- تضمين **خط عربي (Noto)** في مولّدات jsPDF/pdf-lib (لمنع العربية المكسورة).
- نمذجة القوالب كـ **tenant-specific** مرتبطة بـ `school_id` + إتاحة لكل مدرسة.
- بناء **قوالب LRC الثمانية المخطّطة** تدريجياً (البيانات جاهزة في `lib/quality/quality-forms.ts`).
- أكواد/ترويسات/توقيعات حسب معيار §5 في [QUALITY_FORMS_AND_AUTOFILL_LAYER](../quality/QUALITY_FORMS_AND_AUTOFILL_LAYER.md).

---

## ▶️ المرحلة 4 — الأتمتة والتعبئة التلقائية (Workflow Auto-Fill) — لم تبدأ

- ربط **موافقة حجز LRC → إنشاء زيارة فصل آلياً**.
- **استبعاد الغائب/المأذون/المعذور** عند تعبئة حضور الزيارة (من سجلّ حضور حقيقي — الأعمدة موجودة، app-code بلا migration).
- توليد **دليل جودة** (`quality_evidence`) من الزيارة → تغذية المؤشرات.

---

## ▶️ المرحلة 5 — التحليلات والذكاء (Analytics & AI) — لم تبدأ

- إكمال **3 payload builders** للذكاء (`class_report` · `behavior_pattern` · `quality_summary`).
- إكمال **صفحات التحليلات الناقصة** البيانات.

---

## ملخّص الحالة

| المرحلة | الوصف | الحالة |
| --- | --- | --- |
| 1 | التوثيق والدستور | ✅ مُنجزة |
| 2 | توحيد الواجهة والأصداف | 🚧 قيد التنفيذ (UI Sprint 1 ✅ · Sprint 2/3 ▶️) |
| 3 | طبقة نماذج الجودة و PDF | 🚧 قيد التنفيذ (3B/3C/3D/3E ✅) |
| 4 | الأتمتة والتعبئة التلقائية | ▶️ لم تبدأ |
| 5 | التحليلات والذكاء | ▶️ لم تبدأ |
| — | Security Hardening Sprint (M82) | ✅ مُنجزة (متبقٍّ: ضبط CRON_SECRET — إجراء مالك) |

### ✅ بنود مُنجزة (موجز)
- **Security Hardening Sprint** (M82) — أبرز نتائج High مُعالَجة من الجذر.
- **قوالب الجودة لكل مستأجر (3D)** — `lib/quality/tenant-templates.ts` + بوّابة fail-closed + تسجيل مدرسة الفلاح (`school_id = bfe99c43-fa5c-46f4-8ad0-05e12184b55e`).
- **أساس التعبئة التلقائية والأدلة (3E)** — `generated-forms.ts` · `quality-evidence.ts` · `autofill.ts` + ربط qa/meeting + M78/M80/M81.
- **UI Unification Sprint 1** — مجموعة `components/dashboard/` + `lib/dashboard/role-dashboard.ts` + 8 لوحات مُوحَّدة بالكامل.

### ▶️ بنود معلّقة (موجز)
- **ضبط `CRON_SECRET` وقت التشغيل** (Vercel + Supabase Edge + DB) — إجراء مالك.
- **UI Unification Sprint 2 — ترحيل صدفة LRC.**
- **UI Unification Sprint 3 — إعادة هيكلة شؤون الطلاب.**
- **استخراج/إعادة هيكلة `school/[id]/dashboard`.**
- **تنظيف أعمق لبقايا `Card`/`KPICard` القديمة** داخل مكوّنات الأبناء.
- الشرائح المتبقية من المرحلة 3 (قوالب الأدوار الأربعة الرسمية · LRC الثمانية) + المرحلتان 4–5.

> **المرحلة 3 قيد التنفيذ بشرائح** (3B/3C/3D/3E مُنجزة). **المرحلة 2 قيد التنفيذ** (UI Sprint 1 مُنجزة؛ Sprint 2/3 + التنظيف البنيوي الأعمق لم تبدأ). المراحل 4–5 لم تبدأ.
