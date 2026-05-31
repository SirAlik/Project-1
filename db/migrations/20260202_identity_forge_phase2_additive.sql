-- =============================================
-- Migration: Identity Forge (Phase 2.0 - Additive) — PATCHED
-- Description: Roles Split, Personas, Audit Logs, Invites Token Hash (Safe / Idempotent)
-- Notes:
--   - Creates enums only if they do not already exist (idempotent)
--   - Adds profiles.system_role + profiles.default_persona_id
--   - Creates user_personas + role_audit_logs
--   - Adds invites.token_hash + index
--   - Enables RLS with SAFE policies (read-only for users on personas; owners can view logs)
-- =============================================
-- Optional: wrap in a transaction for safety (works if your changes are all transactional)
begin;
-- -------------------------------------------------
-- 0) Ensure uuid_generate_v4() is available
-- -------------------------------------------------
-- If your project already uses uuid_generate_v4(), you can keep this commented out.
-- create extension if not exists "uuid-ossp";
-- -------------------------------------------------
-- 1) Create System & School Role Enums (Idempotent)
-- -------------------------------------------------
do $$ begin -- System roles (internal only)
if not exists (
    select 1
    from pg_type
    where typname = 'system_role_type'
) then create type system_role_type as enum (
    'system_owner',
    'system_auditor',
    'system_user'
);
end if;
-- School roles (UI-facing operational)
if not exists (
    select 1
    from pg_type
    where typname = 'school_role_type'
) then create type school_role_type as enum (
    'principal',
    'vp_academic',
    'vp_school',
    'vp_students',
    'school_coordinator',
    'school_secretary',
    'student_counselor',
    'health_supervisor',
    'lrc_specialist',
    'quality_coordinator',
    'lab_technician',
    'activities_coordinator',
    'teacher',
    'student',
    'parent'
);
end if;
end $$;
-- -------------------------------------------------
-- 2) Extend Profiles for System Role + Default Persona
-- -------------------------------------------------
alter table profiles
add column if not exists system_role system_role_type not null default 'system_user',
    add column if not exists default_persona_id uuid;
-- -------------------------------------------------
-- 3) Create User Personas (Multi-Context Identity)
-- -------------------------------------------------
create table if not exists user_personas (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    school_id uuid references schools(id) on delete cascade,
    role school_role_type not null,
    job_title text,
    is_primary boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz,
    constraint unique_persona unique (user_id, school_id, role)
);
-- Indexes for personas
create index if not exists idx_personas_user on user_personas(user_id);
create index if not exists idx_personas_school on user_personas(school_id);
-- -------------------------------------------------
-- 4) Create Role Audit Log (Minimum Viable)
-- -------------------------------------------------
create table if not exists role_audit_logs (
    id uuid default uuid_generate_v4() primary key,
    timestamp timestamptz default now(),
    actor_id uuid references profiles(id),
    target_user_id uuid references profiles(id),
    action text not null,
    old_value jsonb,
    new_value jsonb,
    reason text
);
create index if not exists idx_audit_target on role_audit_logs(target_user_id);
-- -------------------------------------------------
-- 5) Harden Invites (Token Hashing)
-- -------------------------------------------------
alter table invites
add column if not exists token_hash text;
-- Index for token_hash lookups (required for hashed-token validation later)
create index if not exists idx_invites_token_hash on invites(token_hash);
-- -------------------------------------------------
-- 6) RLS Preparation (SAFE POLICIES ONLY)
-- -------------------------------------------------
alter table user_personas enable row level security;
alter table role_audit_logs enable row level security;
-- Drop legacy/unsafe policy if present (name from your draft)
drop policy if exists "Users manage own personas" on user_personas;
-- Users can READ their own personas only (no write permissions here)
create policy "Users read own personas" on user_personas for
select to authenticated using (user_id = auth.uid());
-- Owners can VIEW audit logs
drop policy if exists "Owners view logs" on role_audit_logs;
create policy "Owners view logs" on role_audit_logs for
select to authenticated using (
        exists (
            select 1
            from profiles
            where id = auth.uid()
                and system_role = 'system_owner'
        )
    );
-- Note: No insert/update/delete policies for audit logs here.
-- Writes should be done through server actions/RPC with SECURITY DEFINER later.
commit;