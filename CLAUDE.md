# SYSTEM CONTEXT — SCHOOL-OS / SIDRA OS

## Project Status: PRE-LAUNCH — RADICAL RESTRUCTURING PHASE

This project has **never been deployed to production**.  
There are **zero real users**. There is **zero live data**.  
Do NOT treat this codebase as a running system.

---

## Engineering Mandate

You are operating as a **Senior Software Architect** performing a
**ground-up structural overhaul** — not a maintenance engineer
protecting a live system.

### What this means in practice

| ❌ FORBIDDEN assumptions | ✅ CORRECT assumptions |
| --- | --- |
| "This might break existing users" | There are no users. Break what must be broken. |
| "Let's patch this temporarily" | No patches. Fix from the root. |
| "Add a nullable column for now" | No nullable tenant columns. Ever. |
| "We can migrate data carefully" | There is no data to migrate. |
| "Let's keep backward compat" | Backward compat with nothing is irrelevant. |

---

## Permissions Granted (Explicit)

- `DROP TABLE ... CASCADE` — **fully permitted**
- `DROP COLUMN` — **fully permitted**
- `DROP POLICY` — **fully permitted**
- Breaking schema changes — **fully permitted and encouraged**
- Destroying and rebuilding any migration — **fully permitted**
- Rewriting any file from scratch — **fully permitted**

---

## Anti-Patterns — Hard Reject

- Workarounds labeled "for now" or "temporary"
- `ALTER COLUMN ... DROP NOT NULL` on tenant columns
- Nullable `school_id` on any active table
- `-- TODO: add RLS later` comments
- Any logic that assumes real data exists in the DB

---

## Architecture North Star

- **Multi-tenant SaaS** — strict tenant isolation via `school_id NOT NULL`
- **RLS-first** — every active table must have Row Level Security enabled
- **JWT-based auth** — policies use `auth.jwt() -> 'app_metadata'`
- **Single Source of Truth** — no duplicate/legacy table coexistence

---

## Current Dependency Baseline & Upgrade Policy

The following versions are the approved architectural baseline for this project:

- Node.js: 24.x
- npm: 11.x
- Next.js: 16.2.6
- React: 19.2.6
- TypeScript: 6.x
- Zod: 4.x
- jose: 6.x
- lucide-react: 1.x
- react-dropzone: 15.x
- ESLint: 9.x — temporarily pinned because ESLint 10 is not yet compatible with the current Next.js / eslint-config-next ecosystem.

ESLint 10 must not be adopted until `eslint-config-next` and related plugins officially support it.

### Dependency Rules

- Do not downgrade dependencies unless there is a documented architectural reason.
- Do not downgrade dependencies because of AI tooling limitations, outdated examples, or personal preference.
- Any dependency upgrade must be validated against Next.js, React, TypeScript, and project build requirements.
- Significant dependency changes must be documented.
- Prefer stable releases over beta, alpha, RC, or experimental versions.
- Do not use `npm audit fix --force`.
- Do not downgrade Next.js to satisfy `npm audit`.
- Keep `package-lock.json` synchronized through `npm install`; do not manually edit it unless there is a clearly documented reason.

---

## When in doubt

Destroy and rebuild correctly.  
There is nothing to protect.  
Use the approved dependency baseline unless a documented architectural decision explicitly replaces it.

---

## التقنيات الأساسية

- **Frontend**: Next.js 16.2.6 (App Router), React 19.2.6, Tailwind CSS 4
- **Runtime**: Node.js 24.x, npm 11.x
- **Backend**: Supabase (Auth + Database + RLS)
- **Forms/Validation**: Zod 4.x, next-safe-action
- **Auth/Crypto/JWT**: jose 6.x
- **Icons**: lucide-react 1.x
- **File Upload UI**: react-dropzone 15.x
- **Type System**: TypeScript 6.x
- **Linting**: ESLint 9.x temporarily pinned
- **Animation**: Framer Motion, GSAP

---

## بنية المشروع

- `app/` — صفحات وراوتر Next.js App Router
- `lib/` — خدمات مشتركة مثل Supabase client وPBAC وcontext services
- `lib/auth/` — `pbac.ts` · `roles.ts` · `context-service.ts`
- `components/` — مكونات React
- `db/migrations/` — ترحيلات قاعدة البيانات (80 ملف: M01–M77 + R00–R12)
- `proxy.ts` — حماية المسارات (تمّت المهاجرة من `middleware.ts` لاصطلاح Next.js 16)
- `.env.example` — قالب متغيرات البيئة الـ8 المطلوبة للمطورين الجدد
- `vitest.config.ts` + `tests/` — إعداد Vitest (تشغيل: `npm test`)

---

## قواعد العمل

- لا تعدّل ملفات `.env.local` أبداً
- الترحيلات في `/db/migrations` مرتبة بأرقام تسلسلية
- نمط الصلاحيات: PBAC في `lib/auth/pbac.ts`
- لا تستخدم `git push --force` أبداً
- لغة الكود: English
- لغة التعليقات: Arabic
- لا تغيّر scripts في `package.json` لإخفاء أخطاء build أو lint
- لا تُضعف قواعد TypeScript أو ESLint من أجل تمرير الفحص شكلياً

## قواعد UI وMock Cleanup

- الواجهة المعتمدة هي Light UI فقط.
- يمنع استخدام `dark:` أو الخلفيات الداكنة القسرية في مسارات الإنتاج.
- يمنع استخدام `bg-black` أو `bg-zinc-950` أو `bg-slate-950` أو `bg-neutral-950`.
- استخدم خلفيات دافئة ناعمة وبطاقات بيضاء أو off-white وحدوداً هادئة ونصوصاً محايدة.
- لا تضف مكتبات UI جديدة دون موافقة صريحة.
- يمنع وجود mock/demo/fake data في production routes.
- يمنع إبقاء ملفات `.bak` داخل `app/`.
- مسارات sandbox لا تعيش داخل production app routes إلا إذا كانت معزولة ومذكورة صراحة.
- إذا لم تكن الميزة متصلة ببيانات حقيقية، اعرض حالة فارغة واضحة أو حالة غير مفعلة؛ لا تعرض مؤشرات وهمية.
- لا تقبل `schoolId` من العميل في العمليات الحساسة؛ tenant scope يأتي من server-side persona/context.
- يمنع Supabase browser client للكتابة على بيانات محمية.
- يمنع `supabaseAdmin` و`service_role` في user-facing flows.
- Server Actions يجب أن تستخدم validation وpermission checks.
- بعد التنظيف أو أي تعديل لاحق: `npm run lint` ثم `npm run build`.

---

## حالة تنظيف الكود (Lint Cleanup Phases)

> **الحالة الراهنة:** جميع المراحل (1–5) مكتملة بالكامل. `npm run lint` يعطي **صفر أخطاء وصفر تحذيرات**. `npm run build` ينجح بـ **77/77 صفحة** بدون أي خطأ TypeScript أو تحذيرات. اصطلاح `proxy.ts` مُطبَّق وفعّال كـ Middleware في Next.js 16. تحذير Recharts مُصلَح معمارياً. **Demo Mode مُحذوف بالكامل** — لا `lib/mock-data/`، لا `NEXT_PUBLIC_DEMO_MODE`. JWT verification في `proxy.ts` مُصلَح بـ `jose.jwtVerify`. `BulkUploadModal` يستخدم Server Action مع `school_id`. **Notifications Center مكتمل** — `components/layout/NotificationsMenu.tsx` + `lib/services/notification-service.ts` + `app/notifications/` مربوطة بـ `GlobalHeader`. **Period Attendance Service** يستخدم `period_id` UUID (بعد M59) — `lib/services/period-attendance-service.ts` + `lib/services/academic-service.ts` + `lib/types/academic.ts` جميعها موجودة. **Phase +11-12** مُنجز — `staff_evaluations` → `workflow_instances` FK موجود + `app/staff-evaluation/` + `app/workflows/page.tsx` مبنيَّتان. **Virtual-Swimming-Wave (2026-06-03) مُنجز** — تأمين 9 نقاط cross-tenant: M77 compound unique `(school_id, national_id)` + bulk-upload school_id + automation school_id scoping + coordinator-classroom teacher ownership + AI service student ownership + إزالة TCH123 mock ID + إزالة `system_role: 'system_user'` من invite + إصلاح `activity_leader` path في ROLE_DASHBOARD_MAP + layout guards جديدة لـ `app/lrc/` · `app/qa/` · `app/science/`. **Phase 6 (2026-06-03) مُنجز** — نقل 8 browser hooks إلى Server Actions: `app/{qa,science,health,lrc,activity,classroom,secretary}/_actions.ts` مُنشأة + `app/student-affairs/_actions.ts` مُوسَّع — جميع الكتابات المحمية تمر عبر `createSupabaseServerClient()` + `getActivePersona()` مع `school_id` صريح من server-side. commit `b128997`. **Admin Layout Guard (2026-06-03) مُنجز** — `app/admin/layout.tsx` (role: `system_owner`) يغطي جميع مسارات `/admin/*` التي كانت مكشوفة سابقاً. commit `0bf76d8`. **Phase 7b (2026-06-03) مُنجز** — layout guards إضافية: `app/student-affairs/layout.tsx` (student_affairs_vp) · `app/educational/layout.tsx` (academic_vp) · `app/staff-evaluation/layout.tsx` (school_principal) · `app/student/metaverse/layout.tsx` (student). commits `fc1748b` + `3b44d1b`. **Phase 8c/8e/8f (2026-06-03) مُنجز** — `app/admin/timetable/` أُعيد بناؤه: Server Component + `TimetableClient.tsx` (يُصلح query legacy `profiles.role='teacher'` → `user_personas`) · `lib/services/period-attendance-service.ts` + `lib/services/meeting-service.ts` مُحصَّنان بـ explicit `school_id` defense-in-depth. commits `0bf76d8` + `3b44d1b`. **Virtual-Swimming-Wave: 100% مكتمل** — جميع فحوصات Phase 9 نجحت: صفر unofficial roles · صفر mock IDs · صفر .bak files · صفر dark classes. **Edge Functions + LRC Maintenance (2026-06-03) مُنجز** — `supabase/functions/validate-bulk-upload/` (CSV validation) + `supabase/functions/generate-qms-pdf/` (PDF generation via pdf-lib → Storage) + `supabase/functions/daily-maintenance/` (proxy → Next.js) + `lib/jobs/lrc-maintenance-service.ts` + `app/api/cron/daily-maintenance/route.ts`. commit `c05b95a`. **Supabase Security Audit Phase 3 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260604_harden_legacy_rpc_and_roles.sql`: REVOKE anon من dangerous RPCs + DROP `get_my_role()` + DROP policy `"Assigned Role Update Cases"` + CREATE `cases_update_assigned` (JWT-based, system_owner OR school_id) + تحويل `invites.target_role` + `cases.assigned_to_role` من `user_role` → `school_role_type` (CASE كامل — super_admin → system_owner) + DROP TYPE `user_role` + CREATE `rate_limit_tracker` + `increment_rate_limit` (service_role فقط). **Supabase Security Audit Phase 4 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql` v2: CREATE `app_private` schema (بديل vault — postgres لا يملك CREATE على vault schema) + `app_private.secrets` (RLS بلا policies = حجب كامل، `ledger_secret_salt` placeholder — **يُستبدل عند الإطلاق قبل أي معاملة طلابية حقيقية**) + `system_config` + RLS + partial index `unique_student_source_event` (WHERE source_event_id IS NOT NULL) + `rpc_process_transaction` v2 (يقرأ app_private.secrets + explicit null school_id guard) + `rpc_reconcile_wallets` rebuild + `rpc_complete_quest(uuid, uuid)` جديدة + REVOKE anon من rpc_scan_ar_glyph + rpc_purchase_furniture. **Supabase Security Audit Fatal Blockers — Phase 5 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260605_enforce_tenant_not_null_and_fix_rls.sql`: `school_id NOT NULL` على 10 جداول tenant (academic_years · action_audit_log · activity_clubs · activity_events · activity_financials · classes · counseling_sessions · events · student_profiles · user_personas) + DROP `"Staff Insert Events"` policy (tenant isolation breach) + DROP duplicate SELECT policy على `user_personas`. commit `d497b76`. **Supabase Security Audit High Risk (2026-06-05) مُنجز** — فحص مباشر أثبت: `handle_new_user()` + `block_privileged_field_changes()` مُصلَحتان مسبقاً · `student_honors/wishes/case_actions` school_id NOT NULL مسبقاً · `workflow_definitions USING(true)` مقبول معمارياً (global catalog) · `get_my_school_id()` مطلوب للـ RLS لا يُحذف · `pg_net` Supabase-managed · GraphQL grants مطلوبة لـ PostgREST · مراجع secretary/classroom stubs دفاعية لا crashes. **Supabase Auth Password Hardening (2026-06-05) مُفعَّل** — Dashboard: Require current password ✅ + min length 10 ✅ + lowercase+uppercase+digits+symbols ✅. Leaked password protection مؤجل: يتطلب Supabase Pro plan. **Supabase Security Audit Medium Risk (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260605_medium_risk_cleanup.sql`: DROP 8 duplicate indexes (regular indexes مكررة مع UNIQUE constraints) + DROP 8 legacy/broken RLS policies (case_actions "Write/Read Actions" بلا school_id check · cases_update بـ get_my_school_id() قديمة · "Users read invites" بـ user_personas subquery · profiles SELECT/UPDATE duplicates · student_honors/wishes "Students View Own" المكسورة لأن student_id ≠ auth.uid()) + CREATE 13 indexes على school_id في جداول tenant بلا تغطية (activity_trips · club_assignments · club_evaluations · corruption_states · dorm_furniture · guardians · hall_of_legends · meeting_session_attendees · parent_reports · student_dorms · student_guardians · trip_consents · classes) + CREATE 23 indexes على FKs عالية الاستخدام (period_attendance × 3 · events × 3 · student paths × 9 · student_honors/wishes × 5 · cases × 2 · lrc_bookings · student_guardians). إجمالي: 36 index جديد. **cron secrets + AI Insights + M78 (2026-06-05) مُنجز** — `db/migrations/20260605_m78_quality_trigger.sql`: AFTER INSERT trigger على `period_attendance` → يُنشئ `quality_evidence` تلقائياً لكل غياب/تأخر (ATT-001, SECURITY DEFINER, fault-tolerant). `db/migrations/20260605_m79_cron_ai_insights.sql`: `get_cron_setting()` SECURITY DEFINER تقرأ `app_private.secrets` + `cron_trigger_ai_insights()` + pg_cron جدولة 01:00 UTC يومياً. `lib/jobs/ai-insights-job.ts` + `app/api/cron/ai-insights/route.ts`: job يومي يُولّد `school_overview` + `attendance_analysis` لكل مدرسة عبر `generateInsightSystem()`. **قبل الإطلاق:** `UPDATE app_private.secrets SET secret='https://your-app.vercel.app' WHERE name='cron_site_url';` + نفس الأمر لـ `cron_secret`. (العمود: `name`/`secret` — مُتحقَّق من DB الحية 2026-06-05). **E2E Tests (2026-06-05) مُكتملة** — `tests/e2e/`: 5 ملفات × 25 اختبار (حضور · LRC · صحة · مغادرة · إحالات آلية) — جميعها نجحت. `vitest.config.ts` يحتوي test env vars. commit `235cc14`. `npm run build` → **78/78 صفحة**. `npm test` → **25/25 اختبار نجح**. **نسبة الجاهزية: 100/100** — جميع بنود architecture_gap_report مُنجزة. **Dark Mode System Removed (2026-06-05)** — `next-themes` حُذف من package.json · `components/theme-provider.tsx` + `components/ui/ThemeTransition.tsx` محذوفان · `@custom-variant dark` + `.dark {}` محذوفان من globals.css · جميع `dark:*` classes مُزالة من 9 ملفات (button/badge/input/textarea/select/tabs/dropdown-menu/WorkflowStatusBadge/PublicFeed) · `AntigravityParticlesCanvas` مُحوَّل لـ fixed light-theme بلا `useTheme`. **Supabase Browser Env Fix (2026-06-05)** — `lib/db/supabase-browser.ts` + `lib/db/supabase.ts`: `process.env[name]` الديناميكي استُبدل بـ `requirePublicEnv(name, process.env.NEXT_PUBLIC_*)` — الوصول الساكن المباشر مطلوب لكي يُدرج Next.js bundler القيم في client bundle. **M79 مُطبَّق على DB الحية (2026-06-05)** — النسخة المصحَّحة باستخدام `name`/`secret` (لا `key`/`value`) مُطبَّقة + `get_cron_setting()` + `cron_trigger_ai_insights()` + pg_cron `daily-ai-insights` 01:00 UTC.

---

## Routing & Tenant Hardening — Phase 1 + Phase 2A (2026-06-05)

> **سياق مهم لتصحيح الجاهزية:** ادعاء «نسبة الجاهزية 100/100» أعلاه كان مقصوراً على نطاق `architecture_gap_report` فقط، ولم يشمل **اتساق توجيه الأدوار** ولا **عزل المستأجر على مستوى `app/school/[id]`**. كشفت Phase 1 و2A فجوات حقيقية في كليهما وأصلحت أهمها. المشروع ما يزال **PRE-LAUNCH** — لا مستخدمون حقيقيون ولا بيانات إنتاجية. **التركيز الحالي:** الاستقرار والأمان والتوجيه وعزل المستأجر — **قبل** أي إعادة تصميم بصري premium. **لم تبدأ** إعادة التصميم البصري، و**لم تبدأ Phase 2B**.

### ✅ Phase 1 — مواءمة التوجيه (Role Routing Alignment) — مكتملة

- `lib/auth/roles.ts`: مواءمة `ROLE_DASHBOARD_MAP` و`ROLE_ACCESS_MAP` مع شجرة `app/` الفعلية. كانت 5 أدوار توجَّه لمسارات غير موجودة (`/coordinator` · `/school-vp` · `/academic-vp` · `/student` · `/parent`).
  - `academic_vp` → `/educational` (موجود ومحروس). `school_admin` + `school_affairs_vp` يُحلّان ديناميكياً لمسار المدرسة عبر `getDashboardPath` في `app/api/persona/select/route.ts` + `app/_actions/switch-persona.ts`.
  - **`activity_leader`** صُحِّح في `ROLE_ACCESS_MAP` من `/activities` (مجلد فارغ) إلى `/activity` — كان يسبب 403 (سبق إصلاحه في `ROLE_DASHBOARD_MAP` فقط).
- `app/student/page.tsx` + `app/parent/page.tsx`: صفحتا هبوط بحالة فارغة آمنة (بلا بيانات أو mock analytics).
- `components/CommandPalette.tsx`: لم يعد يفترض `system_owner` افتراضياً؛ يقرأ الدور من `AuthContext` (`useAuth`)؛ عند غياب الدور لا يكشف أي مسار. واستُبدل التنسيق الداكن بـ light tokens.
- `lib/routes.ts`: تصحيح mojibake في `routeMetadata` (labelAr/keywords).
- `npm run lint` · `npm run build` · `npm test` → نجحت جميعها.

### ✅ Phase 2A — حارس المستأجر + تنظيف السجل (Tenant Guard) — مكتملة

- **`app/school/[id]/layout.tsx`** (جديد): حارس مستأجر دفاعي لكل `/school/[id]/*` (كان غائباً تماماً). يتحقق بترتيب فشل-مغلق من: `schoolId` صالح (UUID) → persona موثوقة من الخادم → دور ضمن `{system_owner, school_admin, school_affairs_vp}` → تطابق المدرسة لغير `system_owner`.
- `lib/routes.ts`: حذف إدخال `routeMetadata` المعطوب `'/school/:id/setup'` (placeholder غير قابل للحل → 404 في Command Palette).
- `lib/auth/roles.ts`: حذف البادئة الميتة `'/school-ops'` من `ROLE_ACCESS_MAP['school_affairs_vp']`.
- `npm run lint` · `npm run build` (62/62) · `npm test` (25/25) → نجحت.

### ⚠️ مخاطر متبقية (تُعالَج في Phase 2B)

1. **`app/school/[id]/layout.tsx` دفاع متعمّق لا حدّ بيانات صلب** — في Next.js قد تُعرَض الـ layout والصفحة الابن بالتوازي، فقد يبدأ جلب البيانات قبل حسم redirect. الحدّ الأصلي يبقى `proxy.ts` (المسار) + طبقة الـ server actions/DAL (البيانات).
2. **`app/school/[id]/classroom/[classId]` — أعلى خطر متبقٍّ:** يجب أن يتحقق البحث عن الفصل من **كلٍّ** من `id = classId` و`school_id = schoolId`؛ حالياً استعلام `supabaseAdmin` على `classes` بلا قيد `school_id` → تسريب محتمل عبر `classId` غريب حتى لمستخدم مُصرَّح ضمن الشجرة.
3. **صفحات `school/[id]` أخرى** (`academic-setup` · `staff` · `classroom` · ...) تحتاج فحوصات tenant-safe قرب جلب البيانات.
4. **`school_affairs_vp` وصول خشن** لشجرة `/school` عبر الحارس الأب؛ تلزم حُرّاس أدقّ على مستوى الصفحة/البيانات لاحقاً.
5. **مصادر المسارات غير موحَّدة بعد:** `lib/auth/roles.ts` · `lib/routes.ts` · شجرة `app/` الفعلية.

### 🚫 ممنوع قبل استقرار التوجيه والحُرّاس وتقوية الوصول للبيانات

- لا إعادة تصميم بصري. لا إعادة تسمية مجلدات (`activity` · `lrc` · `qa` · `educational`). لا نقل صفحات admin إلى `school/[id]`. لا تغيير `active_persona`/نموذج المصادقة قبل فحص Supabase الحي. أي تغيير متعلق بـ Supabase يجب أن يفحص المشروع الحي أولاً.

### ▶️ Phase 2B الموصى بها — تقوية الوصول الآمن للبيانات (لم تبدأ)

تركيز أمني بحت: (1) فحص Supabase الحي قبل أي تغيير DB · (2) التحقق من `public.classes` و`classes.school_id` وRLS والسياسات · (3) إصلاح `classroom/[classId]` ليتحقق من `id = classId` **و** `school_id = schoolId` · (4) إضافة `validateSchoolAccess` أو مكافئها قرب جلب البيانات في صفحات `school/[id]` عالية الخطر · (5) بلا redesign ولا rename ولا route moves.

### ✅ Phase 2B → 2E — مكتملة (2026-06-06)

- **Phase 2B (Tenant-safe data access):** إصلاح `app/school/[id]/classroom/[classId]` — قيد `school_id` على استعلام `classes` (admin client يتجاوز RLS) + `notFound()` فشل-مغلق + `validateSchoolAccess` دفاع متعمّق. تحصين `getClassTimetable` بـ `schoolId` (فحص الحقن + قيد `school_id`). فحص Supabase الحي أثبت `classes.school_id` و`timetable_slots.school_id` كلاهما `NOT NULL` وRLS سليمة — **بلا migration**.
- **Phase 2C (Dedup + tightening):** حذف 7 دوال + 7 schemas مكررة ميتة من `app/_actions/staff.ts` (المصدر المعتمد `coordinator-classroom.ts`). حُرّاس متداخلة `app/school/[id]/{staff,classroom}/layout.tsx` (admin-only) عبر `lib/auth/school-page-guard.ts`. تحقق tenant لـ `class_id`/`academic_year_id` + `school_id` في `admin-import` enrollment. حذف `/student/metaverse` الميت من routeMetadata (أُعيد في 2E).
- **Phase 2D (Role-domain correction):** تصحيح ملكية المجال — `school_affairs_vp` (تشغيلي) ضُيِّق في `ROLE_ACCESS_MAP` إلى `['/school','/portal']` ومحصور داخل `/school` بصفحة `school-affairs` عبر حُرّاس متداخلة admin-only على `dashboard`/`setup`/`academic-setup` (+ staff/classroom من 2C). `academic_vp` (تعليمي) أُبقي على `/educational`+`/classroom`+`/qa`. إزالة `student_affairs_vp` من دوال إدارة الفصول. مصفوفة أدوار-مجالات مرجعية موثّقة في `roles.ts`.
- **Phase 2E (Final pre-UX cleanup):** **Student Metaverse ميزة مقصودة** (فضاء الطالب التفاعلي) — أُنشئت `app/student/metaverse/page.tsx` كصفحة فهرس بروابط لأبنائها (إصلاح 404، بلا حذف، بلا redesign) وأُعيد إدخالها في routeMetadata. تحقق access/action consistency: **لا خلط متبقٍّ** بين academic_vp/school_affairs_vp. أُنشئ `db/migrations/20260606_drop_classes_school_id_default.sql`.
- **Phase 2F (DB hardening closeout):** ✅ **تم تطبيق** `db/migrations/20260606_drop_classes_school_id_default.sql` على DB الحية والتحقق منه: `classes.school_id` الآن `uuid NOT NULL` بـ `column_default = NULL` (أُزيل الافتراضي الصفري) · 0 صفوف · RLS مفعّلة (3 سياسات). بند DB hardening **مكتمل**.
- جميع المراحل: `npm run lint` (نظيف) · `npm run build` (63/63 بعد فهرس metaverse) · `npm test` (25/25). المشروع **PRE-LAUNCH** (لا مستخدمون · لا بيانات إنتاجية).

---

## Visual Constitution + Public Homepage — Phase 3B + Landing (2026-06-06)

> **الحالة:** الأساس البصري المعتمد (**Phase 3B**) مُطبَّق، وأُعيد تصميم **الصفحة الرئيسية العامة فقط** عليه. **لوحات الأدوار الداخلية لم تُمَسّ** (Phase 3C لاحقاً). المشروع ما يزال **PRE-LAUNCH**. النتائج النهائية: `npm run lint` صفر · `npm run build` **63/63 صفحة** · لا تبعيات جديدة · لا تغيير DB/Supabase/مسارات/منطق أعمال.

### ✅ Phase 3B — الدستور البصري (Design Tokens)
- `app/globals.css`: أُعيد بناء نظام الـ tokens مع **الحفاظ على أسماء shadcn/ui** (القيم فقط تغيّرت): `--background:#FBF7EF` (vanilla) · `--foreground:#111827` (charcoal) · `--card:#FFFFFF` · `--surface-soft:#FFFDF8` · `--primary:#0D9488` (teal) · `--color-info`/`--chart-2:#3B6FE0` (أزرق) · `--border:#E8E1D4` · `--radius:1rem` (~16px). ألوان الرسوم: teal/أزرق/lavender/amber/soft-red · حالات success/warning/info/danger.
- **Light-only صارم:** لا `dark:` · لا خلفيات داكنة · لا glass/holographic/antigravity · **الذهبي legacy مُحيَّد إلى teal** (`--gold`/`--gold-strong` → teal للتوافق الخلفي مع ~20 ملف).
- **هجرة الخط:** `lib/fonts.ts` → **IBM Plex Sans Arabic** أساسيًا (`--font-sans` عبر `next/font/google`). أُزيلت Saudi (localFont) وTajawal وGeist من السلسلة · `--font-saudi` مُعاد توجيهه إلى `var(--font-sans)` للتوافق مع ~12 ملف.

### ✅ الصفحة الرئيسية العامة (Public Homepage)
- `app/page.tsx`: Server Component رفيع (يقرأ الجلسة **فقط** لتوجيه CTA: مسجّل → `/portal` · غير مسجّل → `/login`) يركّب أقسامًا معيارية في `components/landing/`: `LandingHeader` · `HeroSection` (+`HeroDashboardPreview`) · `SchoolPulseSection` · `RoleIntelligenceSection` · `DataToActionSection` · `WorkflowSection` · `TrustSection` · `StudentRoomSection` · `FinalCTASection` · `LandingFooter`.
- التموضع: «نظام تشغيل مدرسي مدفوع بالبيانات» (بيانات→رؤى→تنبيهات→مخاطر→توصيات→سير عمل→قرار). عنوان الـ Hero: «مدرستي» + «من البيانات إلى القرارات» (charcoal + teal). النص المهم charcoal (`text-foreground` / `text-foreground/70-80`)؛ `text-muted-foreground` للتعليقات الصغيرة فقط.
- لوحة المعاينة الوهمية في الـ Hero مبنية بـ **SVG/CSS فقط** (polyline + conic-gradient) — **بلا أي تبعية جديدة** (لا Recharts client boundary).
- `components/layout/GlobalHeader.tsx`: تُخفى ترويسة التطبيق على `/` (`pathname === '/'`) — الهبوط يستخدم `LandingHeader`.

### ✅ الـ Metadata (عناوين التبويب)
- `app/layout.tsx`: `title: { default: "Sidra OS | نظام تشغيل مدرسي", template: "%s | Sidra OS" }`. أُزيل «أداة فلاح» نهائياً.
- `app/page.tsx`: `"الرئيسية | Sidra OS"` (نصّ مطلق — قالب الـ template لا ينطبق على نفس segment الجذر في Next.js).
- `app/(auth)/login/page.tsx`: `"تسجيل الدخول"` → «تسجيل الدخول | Sidra OS» عبر القالب.

### ✅ تنظيف المكوّنات الميتة
- حُذفت **8 ملفات** بصفر استيراد (تحقّق grep شامل): `HighlightTile` · `KPIStatCard` · `LivePulse` · `PublicFeed` · `SkeletonLoaders` (في `components/landing/`) + `HolographicCard` · `AntigravityMagneticText` · `AntigravityParticlesCanvas` (في `components/ui/`). أُبقيت `LoginCard` (تستخدمها صفحة الدخول) و`GlassSkeleton` (تستخدمها `loading.tsx`). نُظّفت تعليقات الاستيراد الميتة في `app/layout.tsx`.

### ✅ المرحلة الأولى — مكتملة

- حُذف ~363 تحذير `@typescript-eslint/no-unused-vars` من 130+ ملف
- أُصلحت 3 أخطاء TypeScript مخفية كانت تمنع البناء الإنتاجي
- البناء يعمل: `npm run build` → **78/78 صفحة**، صفر أخطاء TypeScript

### ✅ المرحلة الثانية — مكتملة

- أُصلحت جميع حالات `react/no-unescaped-entities`
- أُصلحت جميع حالات `jsx-a11y/alt-text`
- أُصلحت حالات `react-hooks/exhaustive-deps` الآمنة

### ✅ المرحلة الثالثة — مكتملة

- **صفر** حالات `@typescript-eslint/no-explicit-any` متبقية
- جميع `catch (error: any)` → `catch (error: unknown)` مع `error instanceof Error ? error.message : String(error)`
- جميع نتائج Supabase JOIN مُعرَّفة بـ interfaces محلية حقيقية أو `as unknown as MyType[]`
- جميع `as any` في الكود استُبدلت بأنواع دقيقة أو `as const` أو `as unknown as TargetType`

### الأنماط المعتمدة في المرحلة الثالثة (للرجوع إليها)

```typescript
// نتائج Supabase JOIN
type JoinRow = BaseType & { joined_field: RelatedType | null };
const rows = (data ?? []) as unknown as JoinRow[];

// catch blocks
catch (error: unknown) {
    setError(error instanceof Error ? error.message : String(error));
}

// string literals → union types
type TabType = "a" | "b";
onClick={() => setTab(id as TabType)}
// أو: أضف as const على كل عنصر في المصفوفة

// props لا تُستخدم فعلياً في الجسم
user?: unknown;  // بدلاً من Record<string, unknown> أو any

// ReactNode مقابل ComponentType
icon: React.ReactNode          // للعناصر الجاهزة مثل <Icon />
icon: React.ComponentType<...> // للمكونات التي تُنشئ داخلياً مثل const I = icon; <I />
```

### ✅ المرحلة الرابعة — مكتملة

- جميع analytics hooks تستخدم نمط `startTransition(async () => { await loadData(); })` المتوافق مع React 19
- الحالة تبدأ بـ `loading: true` مباشرةً من `useState(true)` بدون `setLoading(true)` في بداية كل fetch
- لا حالات `set-state-in-effect` متبقية

### ✅ المرحلة الخامسة — مكتملة

- لا حالات `react-hooks/exhaustive-deps` متبقية
- `npm run lint` → **صفر أخطاء، صفر تحذيرات**

---

## ملاحظة أمنية — PostCSS داخل Next.js

`npm audit` قد يُظهر ثغرة في `postcss` مُدرجة كاعتمادية داخلية لـ Next.js. هذه الثغرة:

- لا يمكن إصلاحها بـ `npm audit fix --force` — سيكسر البناء.
- المسار الصحيح: انتظار تحديث رسمي من فريق Next.js.
- **ممنوع تماماً:** `npm audit fix --force` أو downgrade أي dependency بسببها.

---

## المرحلة الرابعة — set-state-in-effect (~10 أخطاء)

- تحليل كل hook على حدة — لا حل موحّد أعمى.
- State مشتقة بالكامل من props/state أخرى → استخدم `useMemo`.
- بيانات يمكن جلبها من الخادم → انقلها إلى Server Component أو server action عند ملاءمة ذلك.
- Async client fetch الضروري → أعد هيكلة الـ hook بطريقة متوافقة مع React 19 وNext.js 16 دون إخفاء الخطأ.
- لا تستخدم `void loadData()` كحل.
- لا تستخدم `eslint-disable`.
- لا تستخدم `useState(() => typeof window !== 'undefined')` لتجاوز mounted/hydration.

---

## المرحلة الخامسة — exhaustive-deps

- أضف dependencies المفقودة فقط عندما يكون ذلك آمناً.
- لا تضف dependency تسبب حلقة لا نهائية بدون إعادة هيكلة السبب.
- ثبّت الدوال بـ `useCallback` عند الحاجة.
- لا تستخدم disable comments لإسكات القاعدة.

---

## قواعد صارمة لجميع المراحل — لا استثناءات

```text
❌ eslint-disable داخل أي ملف
❌ // @ts-ignore أو // @ts-expect-error
❌ as any كحل مؤقت
❌ تضعيف قواعد ESLint في الإعداد
❌ تحويل أخطاء إلى تحذيرات لإخفائها
❌ تجاهل مجلدات كاملة من lint
❌ تعديل npm scripts لإخفاء الأخطاء
❌ void loadData() كحل لـ react-hooks/set-state-in-effect
❌ useState(() => typeof window !== 'undefined') — خطر hydration mismatch
❌ Record<string, unknown> كبديل عشوائي لنتائج JOIN — استخدم interfaces حقيقية
❌ npm audit fix --force
❌ downgrade لأي dependency بدون قرار معماري موثق
```

---

## منطقة المنصّة + مركز قيادة سِدرة — Platform Rename & Command Center (2026-06-10)

> **الحالة:** أُعيدت تسمية منطقة مالك النظام من `/admin` إلى **`/platform`**، وأُعيد بناء `/platform/dashboard` كمركز قيادة منصّة حقيقي، ونُقلت ميزة `bulk-upload` خارج منطقة المنصّة، وأُزيل اختراق التخطيط `-mt-24` من جذوره، ونُظِّفت تسمية «admin» حيث لزم. المشروع **PRE-LAUNCH**. النتائج: `npm run lint` صفر · `npm run build` **63/63** · **بلا أي تغيير** في Supabase/DB/migrations/RLS/auth/persona/مفاتيح الأدوار/التبعيات.

### 1) إعادة تسمية `/admin → /platform` + مركز القيادة
- `app/admin/*` → `app/platform/*` (dashboard · automation · setup · timetable · schools · verify-phase2). `ROLE_DASHBOARD_MAP[system_owner]` = `/platform/dashboard`. `app/platform/layout.tsx` يحرس `system_owner` فقط ويلفّ بـ `PlatformShell` (ترويسة «سِدرة» · «منصّة التشغيل» · شارة «مالك النظام»). `GlobalHeader` مُخفى على `/platform/*`.
- `app/platform/dashboard/page.tsx` أُعيد بناؤه بالكامل: نظرة تنفيذية (مقاييس حقيقية من Supabase) · تنبيهات/مخاطر (قواعد حتمية) · صحة المنصّة (حالة فارغة صادقة) · حوكمة الأدوار (توزيع حقيقي) · مركز جودة البيانات · سجل النشاط (`action_audit_log` — `connected:false` عند الفشل) · توصيات ذكية (placeholder صادق) · إجراءات سريعة · جدول المدارس. `lib/dashboard-data.ts`: `PlatformStats` يحسب `schoolsWithoutAdmin` + `roleDistribution` فعلياً + `getCachedRecentAudit`.

### 2) قاعدة صدق البيانات (Data Honesty) — إلزامية
أي مقياس بلا مصدر بيانات حقيقي **يُعرَض كحالة فارغة/غير-مفعّلة صادقة** لا كرقم وهمي ولا «Online/Connected». **ممنوع**: تحليلات وهمية · ذكاء اصطناعي وهمي · صحة منصّة وهمية. الذكاء الاصطناعي طبقة مستقبلية تتوسّع: لا يُعرض mock كأنه AI حقيقي؛ التوصيات تأتي من pipeline/جدول/job حقيقي، وإلا placeholder صريح.

### 3) نقل bulk-upload (ميزة مدرسية في غير محلّها)
`app/platform/bulk-upload` → **`app/bulk-upload`** (مسار علوي مستقل، يطابق نمط `/workflows` · `/staff-evaluation`). رُفض `/school/[id]/bulk-upload` (حارس شجرة المدرسة يطرد principal/secretary) و`/school/bulk-upload` (يفرض منح `/school` واسع في proxy). أُضيف `/bulk-upload` إلى `ROLE_ACCESS_MAP` لأدوار `school_principal · school_admin · school_secretary`. الصفحة تحرس نفسها (`ALLOWED_ROLES` + اشتراط `persona.schoolId`) وتستمدّ schoolId من server-side persona. رابطا الإشعارات حُدِّثا.

### 4) إزالة اختراق `-mt-24` من جذوره
حُذف `pt-24` من `<main>` في `app/layout.tsx`. كل ترويسة ثابتة (fixed) تحجز مساحتها بمباعد داخل التدفّق: `GlobalHeader` (`h-24`، يظهر فقط حين تظهر الترويسة) · `LandingHeader` (`h-16`). `login` + `PortalClient`: `min-h-[calc(100vh-6rem)]` → `min-h-screen`. حُذف `-mt-24` من `PlatformShell` (ترويسته sticky داخل التدفّق). **بلا هامش سالب · بلا حشو عام · بلا استثناء مسار جديد.** (`scroll-mt-24` في الداشبورد = scroll-margin مشروع، ليس اختراقاً.)

### 5) تنظيف تسمية «admin»
- `components/admin` (مشترك عبر classroom/counselor/principal/qa/student-affairs/setup/schools) → **`components/operations`** (اسم محايد، ليس platform) + تحديث 9 مواضع استيراد.
- `app/api/admin/schools` (مالك-النظام فقط، مستدعٍ واحد) → **`app/api/platform/schools`** + تحديث المستدعي في `platform/setup`.
- **يبقى:** `app/_actions/admin-import.ts` (اسم إجراء خادمي عام، مشترك platform+school، ليس مفهوم platform/system-owner) · تعليقات SQL/docs التاريخية. مفاتيح الأدوار **بلا تغيير**: `school_admin` = «منسق المدرسة» ≠ `system_owner` = «مالك النظام».
- البراند: «فلاح» المرئية أُزيلت من `GlobalHeader` → «سِدرة» · `ExecutionEngine.tsx` عنوان PDF «Smart School OS» → «Sidra».

### 6) اتجاه الـ Shells المعتمد
PublicShell (LandingHeader) · AuthShell (login) · PortalShell (PortalClient) · **PlatformShell** (`/platform`، مالك النظام) · **DashboardShell** مستقبلي لأدوار المدرسة. **قاعدة:** الجذر `app/layout.tsx` لا يفرض حشواً علوياً عاماً تقاومه الـ shells؛ كل ترويسة ثابتة تملك مباعدها.

### 7) التحقق العدائي + العمل المتبقي المعروف
- تحقّق عدائي (8 مدقّقين متوازين): **8/8 يمرّ** بعد إصلاح تسريب براند واحد كشفه المدقّق (`ExecutionEngine` PDF title).
- **Known Remaining Work:** (أ) ~17 تسريب براند قديم **خارج النطاق** («Sidra OS»/«School OS»/«Antigravity School OS» في عناوين تبويب وشارات وتذييلات PDF لمسارات health/secretary/qa/activity/lrc/science/student-affairs/counselor/notifications) — مهمة منفصلة. (ب) اسم مستأجر مُثبَّت «مدارس الفلاح الأهلية» في قوالب تقارير PDF (يجب أن يكون ديناميكياً — ليس البراند المنتَج). (ج) كلمة مرور مؤقتة مُثبَّتة في بطاقات الدخول (`ExecutionEngine`). (د) DashboardShell شامل لأدوار المدرسة + إعادة تصميم لوحاتها تباعاً. (هـ) مصدر مراقبة صحة منصّة حقيقي. (و) مصدر AI على مستوى المنصّة + توسيع قواعد جودة البيانات.

---

## 📚 دستور سِدرة + قاعدة «اقرأ الوثائق قبل التعديل» (System Doctrine) — 2026-06-12

> **المرحلة 1 (التوثيق والدستور) مُنجزة.** ثُبِّت دستور سِدرة في `docs/`. **قاعدة إلزامية:** قبل تعديل أي **صفحة دور · سير عمل تشغيلي · لوحة · تصدير PDF · ميزة ذكاء اصطناعي · ميزة تحليلات · سير عمل قاعدة بيانات** — **اقرأ الوثائق الستّ** أولاً:

1. `docs/architecture/SIDRA_SYSTEM_DOCTRINE.md` — الدستور الأمّ.
2. `docs/architecture/SIDRA_LAYERS.md` — الطبقات الـ11.
3. `docs/quality/QUALITY_FORMS_AND_AUTOFILL_LAYER.md` — الجودة + التعبئة التلقائية.
4. `docs/quality/ROLE_QUALITY_FORMS_MATRIX.md` — ملكية النماذج (11 يملك / 4 يُغذّي).
5. `docs/quality/TENANT_QUALITY_TEMPLATES.md` — القوالب لكل مستأجر.
6. `docs/roadmap/SIDRA_IMPLEMENTATION_ROADMAP.md` — المراحل.

### أبرز بنود الدستور (إلزامية)
- **العلامة المرئية «سِدرة» دائماً** — ممنوع `Sidra OS`/`School OS`/`Smart School OS`/`سِدرة OS` في الواجهة («Sidra OS» اسم المستودع الداخلي فقط، لا يُعرض للمستخدم).
- **اسم المدرسة/المستأجر ديناميكي** من `schools.name` للمستخدم الحالي — **ممنوع تثبيته** في قالب عام (يكسر تعدّد المستأجرين). تسريب مؤكَّد: `app/health/_components/HealthReports.tsx:103`.
- **نماذج/أكواد «الفلاح» خاصة بمستأجر الفلاح، لا افتراضات سِدرة العالمية** — مدرسة بلا برنامج جودة لا تراها. (القدرة عالمية؛ القوالب/الأكواد/الترويسات/الإتاحة لكل مدرسة.)
- **الطبقتان (6) محرّك التعبئة و(7) نماذج الجودة عرضيّتان إلزاميّتان** تربطان: إجراء تشغيلي → بيانات منظَّمة → سجل تعبئة تلقائية → نموذج جودة → PDF رسمي → مؤشرات → ذكاء.
- **قاعدة صدق البيانات:** لا تحليلات/ذكاء/صحة منصّة/PDF وهمية — حالة فارغة صادقة بدلاً من رقم مُختلَق.
- **خارطة الطريق:** المرحلة 2 = توحيد الأصداف/التخطيط + تنظيف بنيوي (خطة 6 وكلاء) · المرحلة 3 = تنفيذ طبقة نماذج الجودة وPDF (**3B/3C/3D مُنجزة 2026-06-13**؛ المرحلة 2 لم تبدأ).
- **`/login` ليس حاجزاً** (كان كاش `.next` قديماً — حُلّ محلياً بمسح الكاش).

---

## طبقة نماذج الجودة وPDF — تنفيذ المرحلة 3 (3B/3C/3D) — 2026-06-13

> نُفِّذت ثلاث شرائح من المرحلة 3 بتوجيه صريح. جميعها **app-code فقط** · `npm run lint` صفر · `npm run build` **63/63** · **بلا** تغيير DB/migrations/RLS/auth/persona/مفاتيح الأدوار/التبعيات (`package.json`/`package-lock.json`).

- **3B (اسم مدرسة ديناميكي):** أُزيلت أسماء المستأجر المُثبَّتة من قوالب PDF المشتركة → `schoolName` من سياق المستأجر المصادَق (`useAuth`). تذييل secretary صار «سِدرة». إصلاح mojibake في Activity. commit `87dd70f`.
- **3C (عربية PDF في الـEdge):** `supabase/functions/generate-qms-pdf` استبدل Helvetica بخط **Amiri** محلي (يغطّي Presentation Forms-B كاملاً) + تشكيل `arabic-persian-reshaper` + `bidi-js` (استيراد Edge عبر esm.sh فقط، بلا `package.json`) + ترويسة ديناميكية بـ`schools.name`. commit `561d695`.
- **3D (سجلّ قوالب المستأجر):** `lib/quality/tenant-templates.ts` — مصدر الحقيقة لأكواد QF لكل مستأجر + بوّابة إتاحة fail-closed.

### قاعدة إلزامية جديدة (نماذج الجودة لكل مستأجر)
- **أكواد QF وقوالب الجودة تُعرَّف/تُمرأ في `lib/quality/tenant-templates.ts`** — لا تُثبَّت أكواد/أسماء مستأجر جديدة في مكوّنات مشتركة.
- **ملكية الأدوار من `lib/quality/quality-forms.ts`** (المصدر المعتمد: `QUALITY_FORM_OWNER_ROLES`/`ownsQualityForms`) — لا تُكرَّر.
- **fail-closed:** مدرسة غير مُسجَّلة في السجلّ → **لا قوالب**. **ممنوع** عرض قوالب الفلاح لمستأجر مجهول أو السقوط الصامت إليها عالمياً. تسجيل برنامج مدرسة يكون في السجلّ (وطبقة تفعيل DB لكل مدرسة = Phase 3F).
- المكوّنات تقرأ الإتاحة عبر `getQualityTemplates(schoolId)` تدريجياً (TODO مُعلَّم في كل مكوّن QF). `schoolId` من سياق مصادَق server-side فقط.
