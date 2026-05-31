-- =============================================
-- Migration: Fix Schools RLS (Phase 2.3)
-- Description: Enable RLS on schools and grant Least Privilege access.
--             Option A: Authenticated users can read ONLY their linked schools.
-- =============================================
begin;
-- 1. Ensure RLS is enabled on schools
alter table schools enable row level security;
-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Authenticated read schools" on schools;
drop policy if exists "Users read linked schools" on schools;
-- 3. Create Least Privilege Policy
-- Allow users to read a school row ONLY if they have a persona linked to it.
-- This ensures strict isolation while allowing the Portal to fetch 'schools(name)' for user's roles.
create policy "Users read linked schools" on schools for
select to authenticated using (
        exists (
            select 1
            from user_personas up
            where up.school_id = schools.id
                and up.user_id = auth.uid()
        )
    );
-- 4. Verify/Grant permissions
grant select on table schools to authenticated;
commit;