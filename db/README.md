# School OS — Database Directory

## Project Status: PRE-LAUNCH — RADICAL RESTRUCTURING

This project has **never been deployed to production**.
There are **zero real users** and **zero live data**.

Do NOT treat this codebase as a running system.
All destructive operations (DROP, TRUNCATE, ALTER, DELETE) are **fully permitted and expected**.

**Code Quality:** `npm run build` → 61/61 pages, zero TypeScript errors. `npm run lint` → **zero errors, zero warnings**. All lint phases (1–5) complete: `no-unused-vars`, `no-explicit-any`, `no-unescaped-entities`, `set-state-in-effect`, and `exhaustive-deps` fully resolved. **Middleware:** `proxy.ts` (Next.js 16 convention) runs as `/_middleware` with `jose.jwtVerify` — verifies every `active_persona` cookie cryptographically; `?demo` bypass and `DEMO_MODE` bypass removed. Demo mode removed entirely: `lib/mock-data/` deleted, `NEXT_PUBLIC_DEMO_MODE` variable gone. **Tests:** `npm test` runs Vitest (config: `vitest.config.ts`). **Env bootstrap:** copy `.env.example` → `.env.local` and fill in the 8 required variables.

---

## Source of Truth

**One source of truth: `db/migrations/`**

| Source | Status |
| ------ | ------ |
| `db/migrations/` | ✅ Authoritative — read this |
| Live Supabase database | ✅ Reflects migrations applied so far |
| `schema.sql` | ⚠️ Baseline snapshot — may be outdated |
| `rls.sql` | ⚠️ Legacy — do not apply directly |
| `indexes.sql` | ⚠️ May contain obsolete entries |

There is no production database to protect. If a migration contradicts an older file, the migration wins.

---

## Migration Series

| File | What it does |
| ---- | ------------ |
| `01_core_tenancy.sql` | Adds `school_id` to core tables |
| `02_*.sql` … `05_*.sql` | Schema evolution + audit idempotency |
| `20260120_gamification_schema` | 23-table gamification system: XP · currencies · quests · store · auctions · SHA256 ledger |
| `20260121_setup_production.sql` | Production baseline |
| `20260201_staff_multirole` … `20260208_strict_role_refactor` | Identity forge: user_personas · profiles · invites · strict role refactor |
| `20260523_normalize_role_keys` | Role name normalisation — purge legacy strings |
| `20260524_enum_rename_and_rebuild_rls` | ENUM rename (school_role_type) + 12 RLS policies rebuilt |
| `20260526_layer5_workflow_definitions` | M38: workflow_definitions — قاموس الـ workflows (5 أنواع: CORRECTIVE_ACTION · HR_ATTENDANCE · STAFF_EVAL · MEETING · BULK_UPLOAD) |
| `20260527_layer5_workflow_instances` | M39: workflow_instances — مثيلات workflow قيد التنفيذ مع state machine |
| `20260527_layer5_workflow_transitions` | M40: workflow_transitions — audit trail كامل لكل انتقال حالة |
| `20260527_layer5_approval_gates` | M41: approval_gates — بوابات الموافقة مع deadline + assignee |
| `20260527_layer3_generated_forms` | M48: generated_forms — قائمة انتظار نماذج PDF المُولَّدة آلياً |
| `20260527_layer3_notifications` | M49: notifications — مركز الإشعارات الموحَّد (in-app · SMS · email) |
| `20260527_layer6_wizard_sessions` | M50: wizard_sessions — جلسات المعالج الذكي مع بيانات مُعبَّأة مسبقاً |
| `20260527_layer6_meeting_invitees` | M51: meeting_invitees — RSVP + حضور + توقيع رقمي لكل مدعو |
| `20260527_layer6_meeting_live_notes` | M52: meeting_live_notes — ملاحظات حية عبر Supabase Realtime |
| `20260527_layer6_meeting_action_items` | M53: meeting_action_items — مهام مُسندة تظهر في dashboard المُكلَّف |
| `20260527_layer6_meeting_sessions` | M45: meeting_sessions + meeting_session_attendees — منظومة الاجتماعات 2.0 |
| `20260527_layer6b_staff_attendance_logs` | M46: staff_attendance_logs — حضور الموظفين اليومي المُجمَّع من بيانات البصمة |
| `20260527_layer6b_biometric_logs` | M47: biometric_logs — سجلات البصمة الخام من الأجهزة (webhook) |
| `20260527_layer6_nonconformance_reports` | M55: nonconformance_reports — تقارير عدم المطابقة ISO QF03-1/2 |
| `20260527_layer6_hr_accountability_tickets` | M53b: hr_accountability_tickets — تذاكر مساءلة HR (5 حالات + مسار قرار) |
| `20260527_layer6_staff_evaluations` | M56: staff_evaluations — تقويم الأداء الوظيفي + trigger → PDF |
| `20260527_layer7_bulk_upload_jobs` | M54: bulk_upload_jobs + bulk_upload_validations — رفع مجمَّع (6 أنواع) مع approval workflow |
| `20260528_student_daily_attendance` | M57: student_daily_attendance — الحضور اليومي للطلاب + trigger إحالة آلية عند 5 غيابات |
| `20260528_period_attendance` | M58: period_attendance — حضور الطالب على مستوى الحصة مرتبط بـ timetable_slot |
| `20260529_r00` … `r07` | Security hardening series (ENUM rename, RLS rebuild, full coverage) |
| `20260529_r08` | Anon lockdown (H-04) + invites policy rebuild (M-03) + notifications CHECK (M-04) |
| `20260529_r09` | Function lockdown: 11 mutable search_path + 5 anon SECURITY DEFINER + 3 USING(true) policies + z_archive closure + 6 dormant RLS tables + DROP rpc_corrupt_system |
| `20260529_r10` | authenticated lockdown: 3 trigger functions + 3 admin cron functions REVOKE from authenticated + z_archive fully closed |
| `20260529_r11` | DROP legacy functions: is_super_admin() + is_admin() — all overloads — architectural purge |
| `20260529_r12` | Rebuild classes RLS policies — exposed by R11 deleting the only existing policy |
| `20260530_academic_structure` | M59: school_stages + periods + terms — UUID FKs replace period INT + term TEXT everywhere |
| `20260530_guardian_profile_link` | M60: guardian_profile_link — ربط حسابات أولياء الأمور بـ profiles |
| `20260530_automation_engine` | M61: automation_rules + notification_queue — محرك الأتمتة |
| `20260530_behavioral_contracts_counselor_sessions` | M62: behavioral_contracts + counselor_sessions — طبقة المرشد الطلابي |
| `20260530_quality_layer` | M63: quality_indicators + quality_evidence — طبقة الجودة الأساسية |
| `20260530_timetable_stage_consistency` | M64: timetable_slots.stage_id NOT NULL + classes.stage_id NOT NULL |
| `20260531_classroom_exits_student_assets` | M65+M66: classroom_exits (GENERATED duration_minutes) + student_assets |
| `20260531_lrc_complete` | M67: lrc_visits + lrc_visit_attendance + lrc_bookings + lrc_loans — طبقة المكتبة كاملة |
| `20260531_health_complete` | M68: health_visits (توسعة) + health_referrals + health_supplies + canteen_checks + hygiene_logs |
| `20260531_qa_interventions` | M69: interventions + student_risk_flags — طبقة التدخل والخطر |
| `20260531_events_layer_extension` | M70: events + 9 حقول: source_module, teacher_id, subject_id, period_id (UUID), timetable_slot_id, term_id, metadata JSONB, created_by_persona_id, event_timestamp |
| `20260531_qa_rubrics` | M71: qa_rubrics — قوالب الملاحظة الصفية (domains JSONB + UNIQUE active per school) |
| `20260601_analytics_cache` | M72: daily_kpis + class_weekly_summary + student_analytics_cache — طبقة كاش التحليلات |
| `20260601_ai_layer` | M73: ai_prompt_templates (seed 5 قوالب) + ai_insights — طبقة الذكاء الاصطناعي |
| `20260601_schools_timezone` | M74: schools.timezone NOT NULL DEFAULT 'Asia/Riyadh' — لحساب generated_date بتوقيت المدرسة |

Migrations are applied **once, in order**. To fix a mistake: write a new migration. Never edit an already-applied migration.

---

## Architecture Principles

School OS is a **multi-tenant SaaS** system with strict tenant isolation.

| Principle | Implementation |
| --------- | -------------- |
| Tenant isolation | `school_id uuid NOT NULL REFERENCES public.schools(id)` on every active table |
| Auth | Supabase Auth — `auth.users` + `auth.jwt() -> 'app_metadata'` |
| Role check in RLS | `(auth.jwt() -> 'app_metadata' ->> 'role')` |
| School context in RLS | `public.get_my_school_id()` (reads from JWT — no DB query) |
| Row Level Security | ENABLED on every active table — no exceptions |
| System owner bypass | `role = 'system_owner'` skips all school filters |

### Golden RLS Pattern

```sql
CREATE POLICY "table_select" ON public.some_table FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('role_a', 'role_b')
    )
);
```

**Never use:** `USING (true)` · `auth_school_id()` · `auth_role_key()` (legacy, removed)

---

## Official Role Keys

Always use these exact strings in RLS policies, migrations, and application code:

```text
system_owner          school_admin          school_principal
school_librarian      student_affairs_vp    academic_vp
school_affairs_vp     school_secretary      activity_leader
student_counselor     student               parent
teacher               health_coordinator    quality_coordinator
lab_technician
```

**Reject any legacy name:** `principal` · `vp_students` · `school_coordinator` · `super_admin`

---

## Writing Migrations

### Permitted without restriction

- `DROP TABLE ... CASCADE`
- `DROP COLUMN`
- `DROP POLICY`
- `TRUNCATE ... CASCADE`
- `ALTER TABLE`
- Breaking schema changes

### Hard rules (architectural, not safety)

| Rule | Reason |
| ---- | ------ |
| `school_id uuid NOT NULL` — never nullable | Multi-tenancy invariant |
| No `ADD COLUMN school_id ... DEFAULT NULL` | CLAUDE.md hard reject |
| No backfill UPDATE logic | There is no data to migrate |
| No `-- TODO: add RLS later` | RLS must be added in the same migration |
| No dual/legacy table coexistence | Single source of truth |

If `ADD COLUMN NOT NULL` fails → the table has test data → `TRUNCATE` it first, then add the column.

---

## RLS Engineering Checklist

Before writing a new RLS migration:

1. Identify tables with `relrowsecurity = false`
2. Identify policies missing `school_id` isolation
3. Identify policies using `USING (true)`
4. Confirm `ENABLE ROW LEVEL SECURITY` is called **in the same migration** as the policies

---

## Function and Trigger Guidelines

For PostgreSQL functions:

- All SECURITY DEFINER functions must have `SET search_path = public`
- EXECUTE privilege must not be granted to `anon`
- Functions must validate `school_id` and role when reading or writing tenant data

For triggers:

- Confirm referenced tables exist before creating the trigger
- Trigger logic must not allow cross-school data leakage
- No trigger should write to a table without an RLS policy

---

## PostgreSQL IMMUTABILITY — قواعد مكتسبة من M73

| التعبير | الدرجة | يصلح في Index؟ |
| ------- | ------ | -------------- |
| `timestamptz::date` | STABLE | ❌ يعتمد على TimeZone |
| `timestamptz + interval` | STABLE | ❌ يعتمد على TimeZone |
| `now()` / `CURRENT_DATE` | STABLE | ❌ يتغير بين queries |
| عمود `date` عادي | — | ✅ قيمة ثابتة |
| عمود `int` / `text` / `uuid` | — | ✅ قيمة ثابتة |

**القاعدة:** كل expression يعتمد على إعداد timezone أو الوقت الحالي → STABLE لا IMMUTABLE → لا يصلح في `GENERATED ALWAYS AS` ولا في index expression/predicate.

**الحل الصحيح:** Edge Function تحسب القيمة خارج DB وتمررها صراحةً كـ `date` عادي.

---

*This file reflects the pre-launch radical restructuring mandate defined in `CLAUDE.md`.*
