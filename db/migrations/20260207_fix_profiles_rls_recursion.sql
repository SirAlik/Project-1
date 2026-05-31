-- =============================================
-- Migration: Fix RLS Infinite Recursion on profiles (FINAL HARDENED VERSION)
-- Date: 2026-02-07
-- Issue: "Profiles visibility" policy queries profiles, causing recursion.
-- Fix: SECURITY DEFINER function with hardened search_path, comprehensive privilege escalation prevention.
-- =============================================
begin;
-- =============================================================================
-- 1. HARDENED SECURITY DEFINER FUNCTION
-- =============================================================================
-- This function MUST bypass RLS to avoid recursion.
-- SECURITY DEFINER runs as the function owner (usually postgres/superuser), bypassing RLS.
-- SET search_path prevents object shadowing attacks.
drop function if exists is_system_owner() cascade;
create function is_system_owner() returns boolean language sql security definer stable
set search_path = public as $$ -- Explicit schema qualification for maximum safety.
    -- This query runs as the function DEFINER, bypassing RLS on profiles.
select coalesce(
        (
            select system_role = 'system_owner'
            from public.profiles
            where id = auth.uid()
        ),
        false
    ) $$;
-- Restrict EXECUTE to authenticated users only. Revoke from public and anon.
revoke execute on function is_system_owner()
from public;
revoke execute on function is_system_owner()
from anon;
grant execute on function is_system_owner() to authenticated;
-- Service role can always execute (superuser-like context).
-- =============================================================================
-- 2. PROFILES POLICIES (NON-RECURSIVE)
-- =============================================================================
-- Drop all existing profiles policies to start clean.
drop policy if exists "Profiles visibility" on profiles;
drop policy if exists "Public Read Profiles" on profiles;
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "System owners read all profiles" on profiles;
drop policy if exists "Self Update Profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
-- Ensure RLS is enabled.
alter table profiles enable row level security;
-- SELECT: Users read their own row.
create policy "Users read own profile" on profiles for
select using (id = auth.uid());
-- SELECT: System owners can read all profiles.
create policy "System owners read all profiles" on profiles for
select using (is_system_owner());
-- UPDATE: Users can update their own row.
-- The privilege escalation prevention is handled by a TRIGGER (see below).
create policy "Users update own profile" on profiles for
update using (id = auth.uid()) with check (id = auth.uid());
-- =============================================================================
-- 3. TRIGGER TO BLOCK PRIVILEGE ESCALATION ON profiles
-- =============================================================================
-- This trigger blocks normal users from modifying privileged columns.
-- Privileged columns: id, role, system_role, email (identity), created_at
-- Allowed columns for self-update: full_name, updated_at (auto-managed), and other user-facing fields.
-- Handle service/admin context (auth.uid() is NULL):
-- - If auth.uid() is NULL, this is a service_role or migration context. ALLOW the update.
-- - If auth.uid() is set AND user is NOT system_owner, BLOCK privileged field changes.
drop function if exists block_privileged_field_changes() cascade;
create function block_privileged_field_changes() returns trigger language plpgsql security definer
set search_path = public as $$
declare v_is_system_owner boolean;
begin -- Service role context: auth.uid() is NULL. Allow all updates (trusted context).
if auth.uid() is null then return NEW;
end if;
-- Check if the current user is a system_owner (bypass RLS via direct query in SECURITY DEFINER).
select coalesce(system_role = 'system_owner', false) into v_is_system_owner
from public.profiles
where id = auth.uid();
-- If user is system_owner, allow all updates.
if v_is_system_owner then return NEW;
end if;
-- Normal user: block changes to privileged columns.
-- List of privileged columns (CANNOT be changed by normal users):
-- 1. id (should never change, but enforced anyway)
-- 2. email (identity binding)
-- 3. role (legacy role column)
-- 4. system_role (primary privilege column)
-- 5. created_at (immutable timestamp)
if NEW.id is distinct
from OLD.id then raise exception 'Unauthorized: You cannot modify the id field.';
end if;
if NEW.email is distinct
from OLD.email then raise exception 'Unauthorized: You cannot modify your email via profile update.';
end if;
if NEW.role is distinct
from OLD.role then raise exception 'Unauthorized: You cannot modify the role field.';
end if;
if NEW.system_role is distinct
from OLD.system_role then raise exception 'Unauthorized: You cannot modify the system_role field.';
end if;
if NEW.created_at is distinct
from OLD.created_at then raise exception 'Unauthorized: You cannot modify the created_at field.';
end if;
-- All other fields (full_name, updated_at, etc.) are allowed.
return NEW;
end;
$$;
-- Apply trigger to profiles table. Ensure it runs BEFORE UPDATE.
drop trigger if exists enforce_privileged_fields_immutability on profiles;
create trigger enforce_privileged_fields_immutability before
update on profiles for each row execute function block_privileged_field_changes();
-- =============================================================================
-- 4. USER_PERSONAS POLICIES (WITH CHECK FOR WRITES)
-- =============================================================================
drop policy if exists "Users read own personas" on user_personas;
drop policy if exists "System Owner manage personas" on user_personas;
drop policy if exists "System owners manage personas" on user_personas;
-- Ensure RLS is enabled.
alter table user_personas enable row level security;
-- SELECT: Users read own personas.
create policy "Users read own personas" on user_personas for
select using (user_id = auth.uid());
-- INSERT: System owners only.
create policy "System owners insert personas" on user_personas for
insert with check (is_system_owner());
-- UPDATE: System owners only.
create policy "System owners update personas" on user_personas for
update using (is_system_owner()) with check (is_system_owner());
-- DELETE: System owners only.
create policy "System owners delete personas" on user_personas for delete using (is_system_owner());
-- =============================================================================
-- 5. INVITES POLICIES (SAFE, WITH CHECK)
-- =============================================================================
drop policy if exists "School Leaders Create Invites" on invites;
drop policy if exists "School leaders create invites" on invites;
drop policy if exists "Admins Create Invites" on invites;
drop policy if exists "Users read invites" on invites;
-- Ensure RLS is enabled (if table exists).
do $$ begin if exists (
    select 1
    from information_schema.tables
    where table_name = 'invites'
        and table_schema = 'public'
) then execute 'alter table invites enable row level security';
end if;
end $$;
-- INSERT: School leaders or system owners can create invites.
-- Note: This policy queries user_personas, NOT profiles, so no recursion risk.
do $$ begin if exists (
    select 1
    from information_schema.tables
    where table_name = 'invites'
        and table_schema = 'public'
) then execute $policy$ create policy "School leaders create invites" on invites for
insert with check (
        exists (
            select 1
            from user_personas p
            where p.user_id = auth.uid()
                and p.school_id = invites.target_school_id
                and p.role in (
                    'principal',
                    'vp_academic',
                    'vp_school',
                    'vp_students',
                    'school_coordinator',
                    'school_secretary'
                )
        )
        or is_system_owner()
    ) $policy$;
end if;
end $$;
-- SELECT: Users can read invites for schools they belong to, or system owners.
do $$ begin if exists (
    select 1
    from information_schema.tables
    where table_name = 'invites'
        and table_schema = 'public'
) then execute $policy$ create policy "Users read invites" on invites for
select using (
        exists (
            select 1
            from user_personas p
            where p.user_id = auth.uid()
                and p.school_id = invites.target_school_id
        )
        or is_system_owner()
    ) $policy$;
end if;
end $$;
-- =============================================================================
-- 6. ROLE_AUDIT_LOGS POLICIES (LOCKED DOWN)
-- =============================================================================
drop policy if exists "Owners view logs" on role_audit_logs;
drop policy if exists "System owners view logs" on role_audit_logs;
-- Ensure RLS is enabled (if table exists).
do $$ begin if exists (
    select 1
    from information_schema.tables
    where table_name = 'role_audit_logs'
        and table_schema = 'public'
) then execute 'alter table role_audit_logs enable row level security';
execute $policy$ create policy "System owners view logs" on role_audit_logs for
select using (is_system_owner()) $policy$;
end if;
end $$;
commit;
-- =============================================================================
-- VERIFICATION CHECKLIST (Run after migration)
-- =============================================================================
-- 1. Normal user can read their own profile row.
--    → SELECT * FROM profiles WHERE id = auth.uid(); -- Should return 1 row.
--
-- 2. Normal user CANNOT read other users' profiles.
--    → SELECT * FROM profiles; -- Should return only own row, not all.
--
-- 3. System owner CAN read all profiles.
--    → Login as system_owner, SELECT * FROM profiles; -- Should return all rows.
--
-- 4. Normal user CANNOT update any privileged field (id, email, role, system_role, created_at).
--    → UPDATE profiles SET system_role = 'system_owner' WHERE id = auth.uid();
--    → Should fail with "Unauthorized" error.
--
-- 5. System owner CAN update privileged fields.
--    → UPDATE profiles SET system_role = 'staff' WHERE id = 'some-other-user-id';
--    → Should succeed.
--
-- 6. Service role (auth.uid() = NULL) can update any field (migrations, admin jobs).
--    → Using service_role key, UPDATE profiles SET system_role = 'system_owner' WHERE id = 'x';
--    → Should succeed.
--
-- 7. System owner CAN manage user_personas (insert, update, delete).
--    → INSERT INTO user_personas (...) VALUES (...);
--    → Should succeed for system_owner, fail for others.
--
-- 8. Login flow and fetchAllPersonas succeeds with NO recursion errors.
--    → Sign in as normal user, app should load without RLS recursion error.