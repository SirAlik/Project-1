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

> **الحالة الراهنة:** جميع المراحل (1–5) مكتملة بالكامل. `npm run lint` يعطي **صفر أخطاء وصفر تحذيرات**. `npm run build` ينجح بـ **77/77 صفحة** بدون أي خطأ TypeScript أو تحذيرات. اصطلاح `proxy.ts` مُطبَّق وفعّال كـ Middleware في Next.js 16. تحذير Recharts مُصلَح معمارياً. **Demo Mode مُحذوف بالكامل** — لا `lib/mock-data/`، لا `NEXT_PUBLIC_DEMO_MODE`. JWT verification في `proxy.ts` مُصلَح بـ `jose.jwtVerify`. `BulkUploadModal` يستخدم Server Action مع `school_id`. **Notifications Center مكتمل** — `components/layout/NotificationsMenu.tsx` + `lib/services/notification-service.ts` + `app/notifications/` مربوطة بـ `GlobalHeader`. **Period Attendance Service** يستخدم `period_id` UUID (بعد M59) — `lib/services/period-attendance-service.ts` + `lib/services/academic-service.ts` + `lib/types/academic.ts` جميعها موجودة. **Phase +11-12** مُنجز — `staff_evaluations` → `workflow_instances` FK موجود + `app/staff-evaluation/` + `app/workflows/page.tsx` مبنيَّتان. **Virtual-Swimming-Wave (2026-06-03) مُنجز** — تأمين 9 نقاط cross-tenant: M77 compound unique `(school_id, national_id)` + bulk-upload school_id + automation school_id scoping + coordinator-classroom teacher ownership + AI service student ownership + إزالة TCH123 mock ID + إزالة `system_role: 'system_user'` من invite + إصلاح `activity_leader` path في ROLE_DASHBOARD_MAP + layout guards جديدة لـ `app/lrc/` · `app/qa/` · `app/science/`. **Phase 6 (2026-06-03) مُنجز** — نقل 8 browser hooks إلى Server Actions: `app/{qa,science,health,lrc,activity,classroom,secretary}/_actions.ts` مُنشأة + `app/student-affairs/_actions.ts` مُوسَّع — جميع الكتابات المحمية تمر عبر `createSupabaseServerClient()` + `getActivePersona()` مع `school_id` صريح من server-side. commit `b128997`. **Admin Layout Guard (2026-06-03) مُنجز** — `app/admin/layout.tsx` (role: `system_owner`) يغطي جميع مسارات `/admin/*` التي كانت مكشوفة سابقاً. commit `0bf76d8`. **Phase 7b (2026-06-03) مُنجز** — layout guards إضافية: `app/student-affairs/layout.tsx` (student_affairs_vp) · `app/educational/layout.tsx` (academic_vp) · `app/staff-evaluation/layout.tsx` (school_principal) · `app/student/metaverse/layout.tsx` (student). commits `fc1748b` + `3b44d1b`. **Phase 8c/8e/8f (2026-06-03) مُنجز** — `app/admin/timetable/` أُعيد بناؤه: Server Component + `TimetableClient.tsx` (يُصلح query legacy `profiles.role='teacher'` → `user_personas`) · `lib/services/period-attendance-service.ts` + `lib/services/meeting-service.ts` مُحصَّنان بـ explicit `school_id` defense-in-depth. commits `0bf76d8` + `3b44d1b`. **Virtual-Swimming-Wave: 100% مكتمل** — جميع فحوصات Phase 9 نجحت: صفر unofficial roles · صفر mock IDs · صفر .bak files · صفر dark classes. **Edge Functions + LRC Maintenance (2026-06-03) مُنجز** — `supabase/functions/validate-bulk-upload/` (CSV validation) + `supabase/functions/generate-qms-pdf/` (PDF generation via pdf-lib → Storage) + `supabase/functions/daily-maintenance/` (proxy → Next.js) + `lib/jobs/lrc-maintenance-service.ts` + `app/api/cron/daily-maintenance/route.ts`. commit `c05b95a`. **Supabase Security Audit Phase 3 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260604_harden_legacy_rpc_and_roles.sql`: REVOKE anon من dangerous RPCs + DROP `get_my_role()` + DROP policy `"Assigned Role Update Cases"` + CREATE `cases_update_assigned` (JWT-based, system_owner OR school_id) + تحويل `invites.target_role` + `cases.assigned_to_role` من `user_role` → `school_role_type` (CASE كامل — super_admin → system_owner) + DROP TYPE `user_role` + CREATE `rate_limit_tracker` + `increment_rate_limit` (service_role فقط). **Supabase Security Audit Phase 4 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql` v2: CREATE `app_private` schema (بديل vault — postgres لا يملك CREATE على vault schema) + `app_private.secrets` (RLS بلا policies = حجب كامل، `ledger_secret_salt` placeholder — **يُستبدل عند الإطلاق قبل أي معاملة طلابية حقيقية**) + `system_config` + RLS + partial index `unique_student_source_event` (WHERE source_event_id IS NOT NULL) + `rpc_process_transaction` v2 (يقرأ app_private.secrets + explicit null school_id guard) + `rpc_reconcile_wallets` rebuild + `rpc_complete_quest(uuid, uuid)` جديدة + REVOKE anon من rpc_scan_ar_glyph + rpc_purchase_furniture. **Supabase Security Audit Fatal Blockers — Phase 5 (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260605_enforce_tenant_not_null_and_fix_rls.sql`: `school_id NOT NULL` على 10 جداول tenant (academic_years · action_audit_log · activity_clubs · activity_events · activity_financials · classes · counseling_sessions · events · student_profiles · user_personas) + DROP `"Staff Insert Events"` policy (tenant isolation breach) + DROP duplicate SELECT policy على `user_personas`. commit `d497b76`. **Supabase Security Audit High Risk (2026-06-05) مُنجز** — فحص مباشر أثبت: `handle_new_user()` + `block_privileged_field_changes()` مُصلَحتان مسبقاً · `student_honors/wishes/case_actions` school_id NOT NULL مسبقاً · `workflow_definitions USING(true)` مقبول معمارياً (global catalog) · `get_my_school_id()` مطلوب للـ RLS لا يُحذف · `pg_net` Supabase-managed · GraphQL grants مطلوبة لـ PostgREST · مراجع secretary/classroom stubs دفاعية لا crashes. **Supabase Auth Password Hardening (2026-06-05) مُفعَّل** — Dashboard: Require current password ✅ + min length 10 ✅ + lowercase+uppercase+digits+symbols ✅. Leaked password protection مؤجل: يتطلب Supabase Pro plan. **Supabase Security Audit Medium Risk (2026-06-05) مُنجز ومُطبَّق** — `db/migrations/20260605_medium_risk_cleanup.sql`: DROP 8 duplicate indexes (regular indexes مكررة مع UNIQUE constraints) + DROP 8 legacy/broken RLS policies (case_actions "Write/Read Actions" بلا school_id check · cases_update بـ get_my_school_id() قديمة · "Users read invites" بـ user_personas subquery · profiles SELECT/UPDATE duplicates · student_honors/wishes "Students View Own" المكسورة لأن student_id ≠ auth.uid()) + CREATE 13 indexes على school_id في جداول tenant بلا تغطية (activity_trips · club_assignments · club_evaluations · corruption_states · dorm_furniture · guardians · hall_of_legends · meeting_session_attendees · parent_reports · student_dorms · student_guardians · trip_consents · classes) + CREATE 23 indexes على FKs عالية الاستخدام (period_attendance × 3 · events × 3 · student paths × 9 · student_honors/wishes × 5 · cases × 2 · lrc_bookings · student_guardians). إجمالي: 36 index جديد. **cron secrets مؤجل (Low Risk)** — `app.cron_site_url` + `app.cron_secret` غير مُضبوطَين في pg_settings → `cron_trigger_daily_feed` no-op فعلياً. المسار: تهيئة عبر `ALTER DATABASE ... SET` أو الاعتماد على Edge Function daily-maintenance بديلاً.

### ✅ المرحلة الأولى — مكتملة

- حُذف ~363 تحذير `@typescript-eslint/no-unused-vars` من 130+ ملف
- أُصلحت 3 أخطاء TypeScript مخفية كانت تمنع البناء الإنتاجي
- البناء يعمل: `npm run build` → **77/77 صفحة**، صفر أخطاء TypeScript

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
