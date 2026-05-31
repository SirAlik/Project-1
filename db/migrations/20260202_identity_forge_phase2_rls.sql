-- =============================================
-- Migration: Identity Forge (Phase 2.2 - RLS Hardening)
-- Description: Enforce Persona-based access and System Owner privileges.
-- =============================================
begin;
-- 1. Profiles: Strict Visibility
-- Users see themselves.
-- System Owners see everyone.
-- School Staff see profiles in their school (via Personas).
drop policy if exists "Profiles visibility" on profiles;
create policy "Profiles visibility" on profiles for
select using (
        id = auth.uid() -- Self
        or -- System Owner
        exists (
            select 1
            from profiles me
            where me.id = auth.uid()
                and me.system_role = 'system_owner'
        )
        or -- Co-workers in same school (Overlap check)
        exists (
            select 1
            from user_personas me_p
                join user_personas target_p on me_p.school_id = target_p.school_id
            where me_p.user_id = auth.uid()
                and target_p.user_id = profiles.id
        )
    );
-- 2. User Personas: Strict Access
-- Users read own personas.
-- Only System Owner can WRITE personas (or via specific Invite flows which use System Client).
drop policy if exists "Users read own personas" on user_personas;
create policy "Users read own personas" on user_personas for
select using (user_id = auth.uid());
drop policy if exists "System Owner manage personas" on user_personas;
create policy "System Owner manage personas" on user_personas for all using (
    exists (
        select 1
        from profiles me
        where me.id = auth.uid()
            and me.system_role = 'system_owner'
    )
);
-- 3. Invites: Token Hash Validation Only (No writing by regular users)
-- Invites creation is restricted to School Admin / System Owner via RPC/Server Actions usually.
-- But if we allow client-side creation (Phase 1 legacy), restrict it.
drop policy if exists "Admins Create Invites" on invites;
create policy "School Leaders Create Invites" on invites for
insert with check (
        -- Must have a leadership role in the target school
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
        or -- System Owner
        exists (
            select 1
            from profiles me
            where me.id = auth.uid()
                and me.system_role = 'system_owner'
        )
    );
-- 4. Audit Logs: View Only for System Owner
drop policy if exists "Owners view logs" on role_audit_logs;
create policy "Owners view logs" on role_audit_logs for
select using (
        exists (
            select 1
            from profiles me
            where me.id = auth.uid()
                and me.system_role = 'system_owner'
        )
    );
commit;