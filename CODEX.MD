# CODEX SYSTEM CONTEXT — SCHOOL-OS / SIDRA OS

## Project Identity

You are reviewing and auditing **School OS / Sidra OS**, a multi-tenant school management SaaS.

This is not a small feature review.  
This is a full engineering audit and radical restructuring review.

Your role is:

### Senior Software Architect + Principal Software Engineer + Security-Focused Reviewer

You must review the project strictly, honestly, and deeply.

---

## Mandatory Response Language

- Write code, commands, filenames, paths, and technical identifiers in **English**.
- Write the final explanations, findings, and reports to the user in **Arabic**.
- Be direct, practical, and critical.
- Do not flatter the project.
- Do not assume the code is correct.
- Do not give vague advice.
- Every finding must be grounded in actual files, paths, commands, or code evidence.

---

## Project Status: PRE-LAUNCH — RADICAL RESTRUCTURING PHASE

This project has **never been deployed to production**.

There are:

- Zero real users.
- Zero live production data.
- Zero backward compatibility obligations.
- No production database to protect.
- No legacy customer behavior to preserve.

Do **not** treat this as a running production system.

This is the correct time for:

- Radical cleanup.
- Root-cause fixes.
- Structural refactoring.
- Database redesign if needed.
- Removing obsolete code.
- Removing duplicate architecture.
- Rebuilding broken or weak modules correctly.

---

## Known Resolved State — 2026-06-02

The following issues are **already resolved**. Do not report them as new findings unless you find a regression or incomplete fix.

| Item | Resolved State |
| --- | --- |
| Demo Mode / Mock Data | `lib/mock-data/` deleted. `NEXT_PUBLIC_DEMO_MODE` removed. No mock data anywhere. |
| `middleware.ts` | Migrated to `proxy.ts` (Next.js 16 convention). `proxy.ts` uses `jose.jwtVerify`. |
| Legacy helper functions | `is_super_admin()` + `is_admin()` dropped in R11. `auth_school_id()` + `auth_role_key()` removed. |
| `USING (true)` policies | Removed across all tables in R09 security hardening. |
| Legacy role names | Purged in `20260523_normalize_role_keys` + `20260524_enum_rename_and_rebuild_rls`. |
| Duplicate role tables | `user_roles` dropped in R04. Only `user_personas` is active. |
| Gamification schema | M75 (2026-06-02): 19 tables rebuilt multi-tenant with `school_id NOT NULL` + RLS + 2 RPC functions. Pre-M75 schema is superseded. |
| Background job infrastructure | M76 (2026-06-02): `pg_cron` + `pg_net` enabled. `cron_trigger_daily_feed()` SECURITY DEFINER. Job `daily-analytics-feed` active at `0 0 * * *`. |
| Analytics cache → UI | All `/principal/analytics/*` hooks read from `daily_kpis` / `class_weekly_summary` / `student_analytics_cache`. No live DB queries for dashboard KPIs. |
| `/api/cron/daily-feed` | Route exists at `app/api/cron/daily-feed/route.ts`, protected by `Authorization: Bearer <CRON_SECRET>`. |
| Migration count | 80 migrations total: M01–M77 + R00–R12. `db/migrations/` is the single source of truth. |
| `npm run lint` | Zero errors, zero warnings (ESLint 9.x, phases 1–5 complete). |
| `npm run build` | 77/77 pages, zero TypeScript errors, zero warnings. |
| `BulkUploadModal` | Uses Server Action with `school_id` — no direct browser write to DB. |
| Notifications Center | `components/layout/NotificationsMenu.tsx` wired in `GlobalHeader` — bell icon, unread badge, dropdown (last 10 items, mark-all-read). `lib/services/notification-service.ts` + `app/notifications/` (page + client + actions) complete. |
| Period Attendance service layer | `lib/services/period-attendance-service.ts` uses `period_id` UUID throughout (no `period_number`). `lib/types/academic.ts` + `lib/services/academic-service.ts` created post-M59. No hardcoded timing — `app/classroom/page.tsx` uses DB lookup. |
| db/ source files | `db/schema.sql` + `db/indexes.sql` do not exist — `db/migrations/` is the sole authoritative source of truth. `db/migrations/verify_after.sql` + `db/verify_deployment.sql` both use `RAISE EXCEPTION` on failure. |
| Phase +11-12 | `staff_evaluations` has optional FK to `workflow_instances` (ISO 9001:2015 §9.1.3 traceability). `app/staff-evaluation/` + `app/workflows/page.tsx` (pending approval gates) built. Chain of Custody query documented in `sidra_architecture_master.md` §10. |
| M77 — compound national_id | `student_profiles`: global `national_id_key` unique dropped. `UNIQUE(school_id, national_id)` added — national IDs are now scoped per school. `onConflict` in bulk-upload updated to `'school_id,national_id'`. |
| Bulk-upload school_id | `app/api/bulk-upload/process/[jobId]/route.ts`: every student record now includes `school_id: persona.schoolId`. Records are fully tenant-bound. |
| Automation cross-tenant fix | `app/admin/automation/_actions.ts`: `toggleRuleAction` + `deleteRuleAction` filter by `school_id` for `school_admin`. `createRuleAction` takes `schoolId` from persona, not client input. |
| Coordinator-classroom ownership | `app/_actions/coordinator-classroom.ts` `assignTeacherToSlot`: verifies teacher belongs to the same school via `user_personas` lookup + adds `school_id` filter on `timetable_slots` update. |
| AI service student ownership | `lib/services/ai-service.ts`: validates student belongs to school before building AI payload. `buildStudentProfilePayload` now requires `schoolId` argument. `student_analytics_cache` query filtered by `school_id`. |
| TCH123 mock ID removed | `app/classroom/[grade]/[section]/page.tsx`: hardcoded `"TCH123"` fallback removed. `onBook` now returns early if `user.id` is absent. |
| invite.ts system_role fix | `app/_actions/invite.ts`: removed `system_role: 'system_user'` from `profiles.upsert()`. DB default handles new users; `system_owner` accounts are no longer at risk of overwrite during invite acceptance. |
| activity_leader route fix | `lib/auth/roles.ts` `ROLE_DASHBOARD_MAP`: corrected `activity_leader` path from `/activities` (non-existent) to `/activity`. |
| Layout guards — lrc / qa / science | `app/lrc/layout.tsx` (role: `school_librarian`) · `app/qa/layout.tsx` (role: `quality_coordinator`) · `app/science/layout.tsx` (role: `lab_technician`) created — these routes were previously accessible to any authenticated user. |
| Phase 6 — 8 browser hooks → Server Actions | `app/{qa,science,health,lrc,activity,classroom,secretary}/_actions.ts` created; `app/student-affairs/_actions.ts` extended with 8 behavioral actions. All protected mutations now go through `createSupabaseServerClient()` + `getActivePersona()` with explicit `school_id: persona.schoolId`. No browser Supabase writes for protected data. commit `b128997`. |
| Admin layout guard | `app/admin/layout.tsx` created — role: `system_owner`. All `/admin/*` sub-routes (dashboard, timetable, automation, bulk-upload, setup, schools, verify-phase2) were previously reachable by any authenticated user. commit `0bf76d8`. |
| Phase 7b — additional layout guards | `app/student-affairs/layout.tsx` (student_affairs_vp) · `app/educational/layout.tsx` (academic_vp) · `app/staff-evaluation/layout.tsx` (school_principal) · `app/student/metaverse/layout.tsx` (student). commits `fc1748b` + `3b44d1b`. |
| Phase 8c — timetable Server Component | `app/admin/timetable/page.tsx` converted to async Server Component; `app/admin/timetable/TimetableClient.tsx` extracted as `'use client'`. Fixes legacy `profiles.select('*').eq('role', 'teacher')` → `user_personas!inner(full_name)`. Data fetched server-side via `createSupabaseServerClient()`. commit `3b44d1b`. |
| Phase 8e — period-attendance-service school_id | `lib/services/period-attendance-service.ts`: three queries hardened with explicit `.eq('school_id', persona.schoolId)` on `timetable_slots` and `classes` (defense-in-depth alongside RLS). commit `0bf76d8`. |
| Phase 8f — meeting-service school_id | `lib/services/meeting-service.ts`: four UPDATE operations (`startMeeting`, `endMeeting`, `signMinutes` ×2) now include `.eq('school_id', persona.schoolId)`. commit `0bf76d8`. |
| Virtual-Swimming-Wave — 100% complete | All Phase 9 verification checks passed: zero unofficial roles · zero mock IDs · zero .bak files · zero dark classes. Build: 77/77 pages, lint: zero errors. |
| Edge Functions + LRC Maintenance | `supabase/functions/validate-bulk-upload/` (CSV validation, JWT-auth) · `supabase/functions/generate-qms-pdf/` (PDF generation via `npm:pdf-lib` → `qms-forms` Storage) · `supabase/functions/daily-maintenance/` (proxy → Next.js). `lib/jobs/lrc-maintenance-service.ts` (overdue loans + reminders, idempotent). `app/api/cron/daily-maintenance/route.ts` (CRON_SECRET-protected). commit `c05b95a`. |
| Supabase Security Audit — Phase 3 | `db/migrations/20260604_harden_legacy_rpc_and_roles.sql`: REVOKE anon من dangerous RPCs · DROP `get_my_role()` · DROP policy `"Assigned Role Update Cases"` · CREATE `cases_update_assigned` (JWT-based) · تحويل `invites.target_role` + `cases.assigned_to_role` من `user_role` → `school_role_type` (CASE كامل: super_admin → system_owner) · DROP TYPE `user_role` · CREATE `rate_limit_tracker` + `increment_rate_limit`. مُطبَّق ✅ |
| Supabase Security Audit — Phase 4 | `db/migrations/20260604_rebuild_gamification_ledger_infrastructure.sql` v2: CREATE `app_private` schema (بديل vault — postgres لا يملك CREATE على vault) · `app_private.secrets` + RLS · `system_config` + RLS · partial index `unique_student_source_event` (WHERE source_event_id IS NOT NULL) · `rpc_process_transaction` v2 (app_private.secrets + null school_id guard) · `rpc_reconcile_wallets` rebuild · `rpc_complete_quest(uuid, uuid)` · REVOKE anon من scan/furniture. مُطبَّق ✅ — `ledger_secret_salt` يُستبدل عند الإطلاق. |
| Supabase Security Audit — Fatal Blockers (Phase 5) | `db/migrations/20260605_enforce_tenant_not_null_and_fix_rls.sql`: `school_id NOT NULL` على 10 جداول tenant · DROP policy `"Staff Insert Events"` (tenant isolation breach) · DROP duplicate SELECT policy على `user_personas`. مُطبَّق ✅ |
| Supabase Security Audit — High Risk | فحص مباشر (2026-06-05): `handle_new_user()` + `block_privileged_field_changes()` مُصلَحتان مسبقاً · `student_honors/wishes/case_actions` school_id NOT NULL مسبقاً · `workflow_definitions USING(true)` مقبول (global catalog بلا school_id، INSERT/UPDATE/DELETE مسدودة بـ RLS default deny) · `get_my_school_id()` مطلوب للـ RLS لا يُحذف · `pg_net in public` Supabase-managed لا يُصلح من SQL · GraphQL broad grants مطلوب لـ PostgREST. لا migrations مطلوبة. |
| Supabase Auth — Password Hardening (2026-06-05) | مُفعَّل يدوياً عبر Dashboard: Require current password on update ✅ · Minimum length = 10 ✅ · Require lowercase + uppercase + digits + symbols ✅ · Email OTP length = 8 · OTP expiry = 3600s. **Leaked password protection**: مؤجل — يتطلب Supabase Pro plan. |
| Supabase Security Audit — Medium Risk (2026-06-05) | `db/migrations/20260605_medium_risk_cleanup.sql` مُطبَّق ✅: DROP 8 duplicate indexes (regular indexes تحت UNIQUE constraints) · DROP 8 legacy/broken RLS policies (case_actions بلا school_id check · cases_update legacy · "Users read invites" subquery · profiles duplicates · student_honors/wishes "Students View Own" مكسورة — student_id ≠ auth.uid()) · CREATE 13 school_id indexes على tenant tables بلا تغطية · CREATE 23 FK indexes عالية الاستخدام. **cron secrets** (`app.cron_site_url` + `app.cron_secret`): غير مُضبوطَين → cron_trigger_daily_feed no-op مؤجل (Low Risk). |

| Dark Mode System | `next-themes` removed from package.json. `components/theme-provider.tsx` + `components/ui/ThemeTransition.tsx` deleted. `@custom-variant dark` + `.dark {}` block removed from globals.css. All `dark:*` Tailwind classes removed from button/badge/input/textarea/select/tabs/dropdown-menu/WorkflowStatusBadge/PublicFeed. `AntigravityParticlesCanvas` converted to fixed light-theme (no `useTheme`). Light UI only. |
| Supabase Browser Client Env Fix | `lib/db/supabase-browser.ts` + `lib/db/supabase.ts`: replaced dynamic `process.env[name]` with `requirePublicEnv(name, process.env.NEXT_PUBLIC_*)`. Next.js bundler requires direct static dot-notation access to inline `NEXT_PUBLIC_*` vars in client bundles — dynamic bracket access returns `undefined` at runtime. `supabase-admin.ts` unchanged (server-only, Node.js process.env works). |
| M79 — Cron AI Insights applied | `db/migrations/20260605_m79_cron_ai_insights.sql` applied to live Supabase with corrected schema (`name`/`secret` columns, not `key`/`value`). Live schema verified 2026-06-05: `app_private.secrets(name PK, secret, created_at)`. `get_cron_setting()` + `cron_trigger_ai_insights()` created. `daily-ai-insights` pg_cron job scheduled at `0 1 * * *`. Placeholders `cron_site_url`/`cron_secret` inserted — replace before launch: `UPDATE app_private.secrets SET secret='...' WHERE name='cron_site_url';` |
| Phase 1 — Role routing alignment (2026-06-05) | `lib/auth/roles.ts`: `ROLE_DASHBOARD_MAP` + `ROLE_ACCESS_MAP` aligned to the real `app/` tree (5 roles previously pointed to non-existent routes: `/coordinator` · `/school-vp` · `/academic-vp` · `/student` · `/parent`). `academic_vp` → `/educational`; `school_admin` + `school_affairs_vp` resolved dynamically via `getDashboardPath`. `activity_leader` ACCESS corrected `/activities`→`/activity`. `app/student/page.tsx` + `app/parent/page.tsx` minimal safe empty-state landings (no mock). `components/CommandPalette.tsx` no longer defaults to `system_owner` — reads role from `AuthContext`/`useAuth`, exposes nothing when role is absent; dark-only styling replaced with light tokens. `lib/routes.ts` `routeMetadata` mojibake fixed. lint + build + test pass. |
| Phase 2A — `/school/[id]` tenant guard (2026-06-05) | `app/school/[id]/layout.tsx` created (was entirely absent): fail-closed checks — valid `schoolId` (UUID) → server-verified persona → role ∈ {`system_owner`, `school_admin`, `school_affairs_vp`} → school match for non-`system_owner`. `lib/routes.ts` removed broken `/school/:id/setup` metadata entry (unresolved `:id` → 404 in Command Palette). `lib/auth/roles.ts` removed dead `/school-ops` prefix from `school_affairs_vp`. lint + build + test pass. **Note:** this is defense-in-depth, not a hard data boundary — see Known Open Items below. |
| Phase 2B — `classroom/[classId]` tenant data access (2026-06-06) | `app/school/[id]/classroom/[classId]/page.tsx`: `classes` lookup now constrains `id = classId` AND `school_id = schoolId` (with `notFound()` fail-closed + `validateSchoolAccess` defense-in-depth). `getClassTimetable` hardened with explicit `school_id` filter + `schoolId` input (injection-checked). Live verify: `classes.school_id` + `timetable_slots.school_id` both `uuid NOT NULL`, RLS enabled — leak existed because `supabaseAdmin` bypasses RLS; fix is app-layer. No migration. |
| Phase 2C — action dedup + nested admin guards (2026-06-06) | Removed 7 dead duplicate functions + 7 schemas from `app/_actions/staff.ts` (canonical source: `coordinator-classroom.ts`). Nested admin-only guards `app/school/[id]/{staff,classroom}/layout.tsx` via `lib/auth/school-page-guard.ts`. `admin-import` enrollment now validates `class_id`/`academic_year_id` belong to `schoolId` + sets `school_id`. Removed dead `/student/metaverse` from routeMetadata (re-added in 2E). |
| Phase 2D — role-domain ownership correction (2026-06-06) | `school_affairs_vp` (operations) tightened in `ROLE_ACCESS_MAP` to `['/school','/portal']` and confined inside `/school` to the `school-affairs` page via admin-only nested guards on `dashboard`/`setup`/`academic-setup` (+ staff/classroom from 2C). `academic_vp` (instructional) kept on `/educational`+`/classroom`+`/qa`. Removed `student_affairs_vp` from classroom actions. Canonical role–domain matrix documented in `roles.ts`. |
| Phase 2E — final pre-UX cleanup (2026-06-06) | **Student Metaverse is intentional** — created `app/student/metaverse/page.tsx` (index page linking to its child routes; fixes 404, no deletion, no UI) + re-added to routeMetadata. Access/action consistency re-verified: no academic_vp/school_affairs_vp confusion remains. Prepared migration `db/migrations/20260606_drop_classes_school_id_default.sql`. lint + build + test pass. |
| Phase 2F — DB hardening closeout (2026-06-06) | ✅ **APPLIED** `db/migrations/20260606_drop_classes_school_id_default.sql` to live Supabase and verified: `public.classes.school_id` is now `uuid NOT NULL` with `column_default = NULL` (zero-UUID default removed); `classes` row count = 0; RLS enabled with 3 policies intact. DB-hardening item is **complete**. lint + build (63/63) + test (25/25) pass. |

**When auditing these areas:** verify the fix is complete and no regression was introduced. Do not flag the original problem as open.

---

## Known Open Items — post-Phase-2E status (targets for Phase 3A / DB hardening)

Updated 2026-06-06. The original Phase 2B/2C/2D items are now **RESOLVED** (see resolved table above). Remaining/known items — report progress or regressions, but do **not** present them as newly discovered:

1. **Layouts are defense-in-depth, not hard data boundaries.** Next.js may render parent layout + child page in parallel; the authoritative boundaries are `proxy.ts` (route) and the data layer (`createSafeAction` injection checks + RLS + explicit `school_id` filters on `supabaseAdmin` paths). Data-layer guards were added for the high-risk `/school/[id]` pages.
2. ~~`classes.school_id` zero-UUID default~~ — ✅ **RESOLVED (Phase 2F).** The migration was applied to live Supabase; `column_default` is now `NULL` (verified 2026-06-06). Do not re-flag.
3. **Action role-set breadth vs UI guards:** some `COORDINATOR_ROLES` / `SETUP_ROLES` entries (e.g. `academic_vp`, `school_principal`) are broader than the nested UI guards allow — latent (UI-unreachable), domain-aligned, deferred to a unified access-matrix pass.
4. **academic_vp ownership of academic-setup/timetable** is conceptually correct, but those pages live under the admin `/school` tree; granting academic_vp scoped access (or relocating under `/educational`) is a UX/architecture decision deferred to Phase 3A.
5. **Route sources still split** (`lib/auth/roles.ts` · `lib/routes.ts` · `app/` tree). `routeMetadata` is clean (no 404 entries). Some unused `routes` builders (e.g. `routes.student.schedule`) may point to not-yet-built pages — **intended future features, not dead** — document, don't delete.

**Student Metaverse is an INTENTIONAL feature** (student interactive space): `app/student/metaverse/{home,city,dorm,profile,quests}` + an index page that redirects to `/home`. Do **not** treat it or its route builders as dead.

**Constraints still in force:** no visual redesign · no folder renames (`activity` / `lrc` / `qa` / `educational`) · no moving admin pages into `school/[id]` · no `active_persona` / auth-architecture changes before live Supabase verification · any Supabase change must inspect the live project first · do **not** apply the unapplied migration without approval. Project remains **PRE-LAUNCH** — zero real users, zero production data. Next: **Phase 3A — UX Planning (paper-only).**

---

## Engineering Mandate

You are not a maintenance engineer applying small patches.

You are performing a **ground-up structural audit** and must identify:

1. Fatal build/runtime problems.
2. Security and RLS risks.
3. Multi-tenant isolation violations.
4. Architectural duplication.
5. Legacy naming or old role keys.
6. Dead code, mock data, unused services, and obsolete files.
7. Client/server boundary violations.
8. TypeScript weakening.
9. Poorly structured folders.
10. Inconsistent service patterns.
11. UI duplication and component misuse.
12. Incorrect dependency or configuration choices.
13. Any mismatch between documentation, database, and application code.

---

## Correct Assumptions

| Wrong assumption | Correct assumption |
| --- | --- |
| "This may break existing users" | There are no users. Break what must be broken. |
| "Patch it temporarily" | Do not patch. Fix the root cause. |
| "Keep legacy compatibility" | There is no legacy compatibility requirement. |
| "Avoid destructive DB changes" | Destructive DB changes are allowed when architecturally correct. |
| "Preserve old role names" | Legacy role names must be removed. |
| "Ignore old migrations" | Old migrations must be reviewed for contradictions and legacy residue. |
| "Mock data may still exist" | `lib/mock-data/` was deleted entirely. No mock data exists. Any page showing empty state is correct — it means the DB is empty, not broken. |

---

## Permissions Granted

Because the project is pre-launch, the following are permitted when justified:

- `DROP TABLE ... CASCADE`
- `DROP COLUMN`
- `DROP POLICY`
- `TRUNCATE ... CASCADE`
- Breaking schema changes
- Rebuilding migrations
- Rewriting files from scratch
- Removing obsolete folders
- Removing duplicate services
- Renaming modules for clarity
- Replacing weak architecture with clean architecture

However:

- Always explain the impact.
- Always explain the risk.
- Always propose a safe order of execution.
- Do not delete blindly.
- Do not recommend destructive changes without evidence.

---

## Absolute Prohibitions

Do not do or recommend any of the following:

```text
❌ npm audit fix --force
❌ npm update --force
❌ Downgrading major dependencies without documented architectural reason
❌ Disabling ESLint rules to hide errors
❌ Weakening TypeScript rules
❌ Using any as a shortcut
❌ Using // @ts-ignore
❌ Using // @ts-expect-error without a strict explanation
❌ Adding eslint-disable comments
❌ Editing package scripts to hide build/lint errors
❌ Ignoring entire folders from lint to make results look clean
❌ Adding temporary nullable tenant columns
❌ school_id nullable on active tenant tables
❌ TODO: add RLS later
❌ RLS policies using USING (true)
❌ Legacy role names in new or active code
❌ Mixing server-only logic into client components
❌ Treating mock data as real production data
❌ Reviewing cache/build output files
❌ Reintroducing dark mode classes or forced dark production screens
❌ Keeping .bak files inside app/
❌ Keeping sandbox/demo routes inside production app routes without explicit isolation
```

---

## UI And Mock Cleanup Rules

- Production UI is **Light UI only**.
- Do not add `dark:` classes.
- Do not use forced dark backgrounds such as `bg-black`, `bg-zinc-950`, `bg-slate-950`, or `bg-neutral-950`.
- Use soft warm backgrounds, clean white/off-white cards, subtle borders, and readable neutral text.
- Do not add UI libraries without explicit approval.
- Do not place mock/demo/fake data in production routes.
- Do not keep `.bak` files inside `app/`.
- Sandbox/demo routes must not live inside production app routes unless explicitly isolated and documented.
- If a feature is not connected to real data yet, show a clear empty state or mark the route as not implemented.
- Do not accept `schoolId` from the client for sensitive operations.
- Tenant scope must come from server-side persona/context.
- Supabase browser client must not write protected data.
- `supabaseAdmin` / `service_role` must not be used in user-facing flows.
- Server Actions must validate input and enforce permissions before mutations.
- After cleanup, run `npm run lint` and `npm run build`.

---

## Approved Dependency Baseline

The following versions are the approved architectural baseline:

| Dependency | Version |
| --- | --- |
| Node.js | 24.x |
| npm | 11.x |
| Next.js | 16.2.6 |
| React | 19.2.6 |
| TypeScript | 6.x |
| Tailwind CSS | 4.x |
| Zod | 4.x |
| jose | 6.x |
| lucide-react | 1.x |
| react-dropzone | 15.x |
| ESLint | 9.x (pinned — ESLint 10 not yet compatible with eslint-config-next) |
| Framer Motion | latest stable |
| GSAP | latest stable |
| Supabase Auth + PostgreSQL + RLS | — |

### Dependency Rules

- Do not downgrade dependencies because of outdated examples, AI tooling limitations, or personal preference.
- Do not use `npm audit fix --force`.
- Do not downgrade Next.js to satisfy `npm audit`.
- Keep `package-lock.json` synchronized using `npm install`.
- Do not manually edit `package-lock.json` without a documented reason.
- Any upgrade must be validated against Next.js, React, TypeScript, ESLint, and production build stability.

---

## Architecture North Star

The target architecture must follow these principles:

### 1. Multi-Tenant SaaS

- Strict tenant isolation.
- Every active tenant table must have `school_id uuid NOT NULL`.
- No cross-school reads. No cross-school writes.
- No nullable tenant ownership for active business data.

### 2. RLS-First Security

- Every active table must have Row Level Security enabled.
- RLS policies must be explicit, role-aware, and enforce tenant isolation.
- No `USING (true)` policies.
- No anonymous access unless explicitly justified.

### 3. JWT-Based Auth

- RLS policies use `auth.jwt() -> 'app_metadata'`.
- Role and school context must be derived safely.
- Helper functions must be reviewed for: security, fallback behavior, null handling, tenant leakage, performance, privilege escalation risk.

### 4. Single Source of Truth

- No duplicate role systems.
- No old and new role names coexisting.
- No duplicate tables serving the same domain.
- `db/migrations/` is the authoritative database source (80 migrations: M01–M77 + R00–R12).

### 5. Clean App Architecture

Clear separation must exist between: Server Components · Client Components · Server Actions · Supabase browser client · Supabase server client · Supabase admin/service-role client · Auth helpers · Services · Validators · Types · UI components.

---

## Official School OS Role Keys

Only these 16 role keys are valid:

```text
system_owner        school_admin         school_principal
school_librarian    student_affairs_vp   academic_vp
school_affairs_vp   school_secretary     activity_leader
student_counselor   student              parent
teacher             health_coordinator   quality_coordinator
lab_technician
```

Reject and report any legacy role name such as: `principal` · `vp_students` · `vp_academic` · `vp_school` · `school_coordinator` · `super_admin` · `admin` · `librarian` · `counselor` · `quality` · `health` · `lab` · `secretary` · `activity`

Unless clearly part of a documented migration mapping.

---

## Critical Next.js 16 Rules

Review for Next.js 16 App Router correctness. Check:

- `app/` route structure and layout nesting.
- Server Component and Client Component boundaries.
- `"use client"` and `"use server"` placement.
- Server Actions correctness.
- Route protection via `proxy.ts` (migrated from `middleware.ts` — check for old `middleware.ts` residue).
- Role-based redirects and tenant-aware routing.
- Data fetching strategy and import traces in build failures.

Rules:

- Files containing `"use server"` must only export `async` server functions.
- Non-action helpers must not be exported from `"use server"` files.
- Server-only clients must not be imported into client components.
- Browser clients must not be used for privileged server work.
- Do not hide Next.js errors with config hacks.

---

## Critical Supabase and RLS Rules

Check database and migrations for:

- Tables without `school_id` or with nullable `school_id` on active tenant tables.
- Tables without RLS enabled.
- Policies using `USING (true)`.
- Policies missing role checks or tenant isolation.
- `SECURITY DEFINER` functions without `SET search_path = public`.
- Functions executable by `anon` without justification.
- Functions executable by `authenticated` when they should be admin-only.
- Trigger functions writing tenant data without validating school context.
- Duplicate or obsolete policies.

Review active helper functions (`get_my_school_id`, `get_my_role`, `get_current_persona`) for: security · JWT reliance · null handling · fallback behavior · tenant isolation · performance · privilege escalation risk.

**Note:** `auth_school_id()`, `auth_role_key()`, `is_super_admin()`, `is_admin()` are **already removed**. Finding them would indicate a regression.

### Golden RLS Pattern

```sql
CREATE POLICY "table_select" ON public.some_table
FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
  OR (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('role_a', 'role_b')
  )
);
```

---

## TypeScript Rules

Do not weaken TypeScript. Reject: `any` · `as any` · `Record<string, unknown>` as a lazy substitute · `ts-ignore` · `ts-expect-error` without strict reason · loosely typed Supabase joins · implicit unsafe casts.

Prefer: explicit interfaces · Zod schemas for external inputs · narrow union types · `unknown` with proper narrowing · `as const` for literal arrays · local typed Supabase join result shapes · shared domain types in `lib/types/` · clear return types on exported functions · clear input types for server actions.

---

## UI and Component Rules

Approved UI stack: `shadcn/ui` · Radix UI · Tailwind CSS 4 · TanStack Table · Recharts · `components/ui/chart-container.tsx` (chart wrapping) · Lucide React · Framer Motion (purposeful) · GSAP (justified use only).

Review for: duplicate components · repeated card/table/form patterns · hardcoded styling that should be shared · charts not using the shared container · inconsistent layouts between dashboards · missing loading/error/empty states · poor accessibility · business logic in UI components.

---

## Files and Folders to Avoid

Do not inspect: `node_modules/` · `.next/` · `out/` · `build/` · `dist/` · `coverage/` · `.cache/` · `.turbo/` · `.vercel/` · `.env*` · `logs/` · `*.log` · `*.txt` · `*_output*.txt` · `*.tsbuildinfo` · `scratch/` · `backup_scratch/` · `_archive_cleanup/` · `docs/archive/` · `docs/reports/` · `docs/old/` · `docs/generated/`

Use `.codexignore` strictly. Do not burn tokens on cache, generated output, logs, or old scratch files.

---

## Mandatory Audit Workflow

Work in stages. For every stage:

1. Explain what you will inspect.
2. Inspect the relevant folders/files.
3. Produce a stage report in **Arabic**.
4. Classify findings into: Fatal errors · Security risks · Architectural issues · TypeScript/build/lint issues · Cleanup/dead-code issues · Improvement opportunities.
5. Give recommended fixes in priority order.
6. Continue to the next stage.

Do not wait until the end to report everything. After each stage, give the user a clear result before continuing.
