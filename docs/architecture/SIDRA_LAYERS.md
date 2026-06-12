# طبقات سِدرة المعمارية — SIDRA LAYERS (11)

> **النوع:** مرجع معماري — توصيف الطبقات الإحدى‑عشرة الفعلية.
> **العلاقة:** يخدم [SIDRA_SYSTEM_DOCTRINE](./SIDRA_SYSTEM_DOCTRINE.md). اقرأ الدستور أولاً.
> **مصدر التوصيف:** تدقيق معماري مباشر للكود الفعلي (لا المقصود فقط). الطبقات الـ11 **موجودة فعلاً** بدرجات نضج متفاوتة.
> **حالة المشروع:** PRE-LAUNCH. **آخر تحديث:** 2026-06-12.

---

## ملاحظة جوهرية: الطبقتان العرضيّتان

الطبقات (1–5) و(8–11) **عمودية** (vertical: كل طبقة تخدم نطاقاً). أمّا:

- **(6) محرّك الأتمتة/التعبئة** و**(7) نماذج الجودة/الوثائق** فهما **عرضيّتان (cross-cutting)** — تخترقان أغلب الأدوار وتربطان التدفّق الرسالي: *إجراء تشغيلي → سجل سير عمل تلقائي → بيانات نموذج جودة → PDF رسمي*.

---

## (1) الطبقة العامة والعلامة — Public & Brand
- **الغرض:** الواجهة العامة قبل الدخول + هوية «سِدرة».
- **الحالة:** ✅ مكتملة (الصفحة الرئيسية أُعيد تصميمها على الدستور البصري).
- **ملفات مفتاحية:** `app/page.tsx` · `components/landing/*` · `app/layout.tsx` (metadata «سِدرة»).
- **أدوار:** الزوّار (غير مُصادَقين).
- **ثوابت:** العلامة المرئية «سِدرة» فقط (راجع دستور العلامة §1).

## (2) المصادقة والهوية — Auth & Identity
- **الغرض:** الدخول وإنشاء الجلسة والتحقق من الهوية.
- **الحالة:** ✅ مكتملة (fail-closed لغير المالك).
- **ملفات:** `app/(auth)/{login,join}` + `layout.tsx` · `proxy.ts` · `lib/db/supabase-server.ts` · `lib/auth/context-service.ts` (`getActivePersona`).
- **جداول:** `auth.users` (app_metadata: role + school_id) · `profiles`.
- **أدوار:** الكل.
- **ثوابت:** الدور/المدرسة من `app_metadata` في JWT · انتحال `system_owner` موقّع HMAC فقط.

## (3) البوابة والشخصيات — Portal & Persona
- **الغرض:** اختيار الدور/الـ persona النشطة وتوجيه المستخدم للوحته.
- **الحالة:** ✅ مكتملة.
- **ملفات:** `app/(protected)/portal/*` (`PortalClient` · `roleDisplay.ts`) · `app/api/persona/select/route.ts` · `app/_actions/switch-persona.ts` · كوكي `active_persona` (JWT موقّع).
- **أدوار:** الكل.
- **ثوابت:** مصدر النطاق هو persona الخادمية — لا اختيار مدرسة من العميل.

## (4) المنصّة — Platform
- **الغرض:** مركز قيادة مالك النظام على مستوى المنصّة (المدارس · الحوكمة · جودة البيانات · التدقيق).
- **الحالة:** ✅ مكتملة (بيانات حقيقية + حالات فارغة صادقة).
- **ملفات:** `app/platform/*` · `components/layout/PlatformShell.tsx` · `lib/dashboard-data.ts` (`PlatformStats`).
- **أدوار:** `system_owner` فقط (حارس layout).
- **ثوابت:** لا تحليلات/ذكاء/صحة منصّة وهمية.

## (5) عمليات المدرسة — School Operations
- **الغرض:** العمل التشغيلي اليومي لكل دور مدرسي.
- **الحالة:** ✅ موجودة، **الأصداف (shells) غير موحّدة بعد** (`/school/[id]/*` و`/lrc` لهما شريط جانبي؛ بقية اللوحات «عارية» بـ `GlobalHeader` فقط).
- **ملفات:** `app/school/[id]/*` (+ `SchoolDashboardShell` + `lib/navigation/school-nav.ts`) · لوحات الأدوار `app/{principal,secretary,classroom,qa,educational,student-affairs,counselor,health,science,activity,lrc}`.
- **أدوار:** جميع أدوار المدرسة الـ16 (كلٌّ في نطاقه).
- **يُعاد لاحقاً:** توحيد الصدفة (RoleDashboardShell) — المرحلة 2.

## (6) محرّك الأتمتة والتعبئة — Workflow Automation / Auto-Fill  *(عرضيّة)*
- **الغرض:** تحويل الإجراء التشغيلي إلى سجلّ سير عمل/تعبئة تلقائية يُغذّي الجودة.
- **الحالة:** ✅ قوي، **بربط ناقص** (الموافقة لا تُنشئ زيارة آلياً · استبعاد الغياب غير مُفعّل).
- **ملفات:** `app/platform/automation/*` · `lib/jobs/automation-service.ts` (مُقيّمات triggers + مُنفّذات actions) · `lib/jobs/notification-queue-processor.ts` · `lib/workflow-service.ts` (آلة حالات + approval gates) · `lib/jobs/lrc-maintenance-service.ts` · `app/api/cron/{daily-feed,daily-maintenance,ai-insights}`.
- **جداول:** `automation_rules` · `notification_queue` · `workflow_definitions/instances/transitions` · `approval_gates` · trigger M78 (`period_attendance → quality_evidence`).
- **يُعاد لاحقاً (app-code، بلا migration):** ربط الموافقة→الزيارة + استبعاد الغياب — المرحلة 3/4. التفصيل في [QUALITY_FORMS_AND_AUTOFILL_LAYER](../quality/QUALITY_FORMS_AND_AUTOFILL_LAYER.md).

## (7) نماذج الجودة وتوليد الوثائق — Quality Forms & Document Generation  *(عرضيّة)*
- **الغرض:** تحويل بيانات الإجراء إلى **نموذج جودة رسمي** قابل للتصدير PDF.
- **الحالة:** ✅ واسعة وحقيقية، **قوالب ناقصة + مخاطر صدق**.
- **ملفات:** Health `app/health/_components/HealthReports.tsx` · Activity `ActivityReports.tsx` · Secretary `SecretaryReports.tsx` · Student-Affairs `reports/StudentAffairsReports.tsx` · LRC `CertificateGenerator.tsx` + `lib/quality/quality-forms.ts` · `components/operations/DisciplineKnightsModal.tsx` · `lib/utils/pdfExport.ts` · `supabase/functions/generate-qms-pdf/index.ts`.
- **جداول:** `quality_indicators` · `quality_evidence` (+trigger M78) · `generated_forms` · جداول كل وحدة.
- **مخاطر معروفة:** اسم مدرسة مُثبَّت في بعض قوالب PDF (تسريب مستأجر) · خطر عربية مكسورة في jsPDF/pdf-lib (Helvetica). التفصيل والملكية في [ROLE_QUALITY_FORMS_MATRIX](../quality/ROLE_QUALITY_FORMS_MATRIX.md) و[TENANT_QUALITY_TEMPLATES](../quality/TENANT_QUALITY_TEMPLATES.md).

## (8) البيانات وجودة البيانات — Data & Data Quality
- **الغرض:** طبقة الوصول للبيانات + مقاييس الجاهزية + الحالات الفارغة الصادقة.
- **الحالة:** ✅ مكتملة.
- **ملفات:** `lib/dashboard-data.ts` (`queryPlatformStats` · `getCachedSchoolStats/Audit` · `validateSchoolAccess` · `normalizeSchoolStats` · `toSafeNumber`).
- **جداول:** `schools/profiles/user_personas/classes/student_profiles`.
- **ثوابت:** حالات فارغة صادقة (readiness 0% · `connected:false` عند الفشل).

## (9) التدقيق والمراقبة — Audit & Observability
- **الغرض:** أثر تدقيق لكل كتابة + مراقبة.
- **الحالة:** ✅ مكتملة (صحة المنصّة placeholder صادق).
- **ملفات:** `lib/safe-action.ts` (audit مدمج) · `lib/services/audit-service.ts` · `app/platform/dashboard` (AuditStream).
- **جداول:** `action_audit_log` (school_id NOT NULL · RLS) · `action_idempotency` · `rate_limit_tracker`.
- **ثوابت:** school_id خادمي · RLS لا تُمَسّ.

## (10) التحليلات والقرار — Analytics & Decision
- **الغرض:** تحويل البيانات إلى مؤشرات ورسوم تدعم القرار.
- **الحالة:** ✅ جزئية (بعض صفحات التحليلات ناقصة البيانات).
- **ملفات:** `app/principal/analytics/*` (9 صفحات مدعومة بـ`daily_kpis`) · `app/lrc/_components/LrcDashboard.tsx` (Recharts حقيقي) · `components/ui/KPICard.tsx` · `components/ui/chart-container.tsx`.
- **جداول:** `daily_kpis` · `class_weekly_summary` · `student_analytics_cache`.
- **يُعاد لاحقاً:** إكمال الصفحات الناقصة — المرحلة 5.

## (11) ذكاء القرار — AI Decision Intelligence
- **الغرض:** رؤى/توصيات حقيقية مبنية على بيانات المدرسة.
- **الحالة:** ✅ حقيقية (Claude فعلي، فشل رشيق؛ 5/8 سياقات مبنيّة، 3/8 فارغة).
- **ملفات:** `lib/services/ai-service.ts` (`callClaudeAPI` → Anthropic، موديل `claude-sonnet-4-6`) · `app/_actions/ai.ts` · `components/ai/AIInsightCard.tsx` · `lib/jobs/ai-insights-job.ts` · `app/api/cron/ai-insights`.
- **جداول:** `ai_prompt_templates` (عالمي) · `ai_insights` (school_id NOT NULL) · `daily_kpis` · `app_private.secrets`.
- **ثوابت:** لا AI وهمي — خطأ/فراغ صادق عند غياب المصدر.
- **يُعاد لاحقاً:** إكمال 3 payload builders (`class_report` · `behavior_pattern` · `quality_summary`) — المرحلة 5.

---

## خريطة مسار → طبقة (مختصر)

| المسار | الطبقات |
| --- | --- |
| `/` · `/login` · `/join` | (1)(2) |
| `/portal` · `/notifications` · `/api/persona/select` | (3) |
| `/platform/*` | (4) |
| `/school/[id]/*` | (5)(8)(9) |
| `/lrc` | (5)(6)(7)(10)(11) |
| `/principal/analytics/*` | (10)(11) |
| `/{secretary,health,activity,student-affairs,counselor,qa,...}` | (5)(7) |
| `/api/cron/*` | (6)(11) |
