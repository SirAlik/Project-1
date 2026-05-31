-- ============================================================================
-- SQL Step 06: RLS Lockdown (The Firewall)
-- ============================================================================
BEGIN;
-- 1. Enable RLS on ALL tenant tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_scans ENABLE ROW LEVEL SECURITY;
-- 2. Define Tenant Helper Logic (Optional, but let's stick to direct checks for performance)
-- 3. Policy Template: "Tenant Isolation"
-- Requirement: user.school_id MUST match row.school_id
-- Exception: user.role = 'system_owner'
-- === STUDENT PROFILES ===
DROP POLICY IF EXISTS "Tenant Isolation: Read Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Read Students" ON public.student_profiles FOR
SELECT USING (
        -- System Owner
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR -- Tenant Match
        school_id = (
            (auth.jwt()->'app_metadata'->>'school_id')::uuid
        )
    );
DROP POLICY IF EXISTS "Tenant Isolation: Write Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Write Students" ON public.student_profiles FOR ALL USING (
    -- Only specific authorized roles can write (enforced by App PBAC mostly, but RLS adds layer)
    (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'school_coordinator',
            'principal',
            'vp_students',
            'lrc_specialist',
            'teacher'
        )
    )
    AND school_id = (
        (auth.jwt()->'app_metadata'->>'school_id')::uuid
    )
);
-- === CLASSES ===
DROP POLICY IF EXISTS "Tenant Isolation: Read Classes" ON public.classes;
CREATE POLICY "Tenant Isolation: Read Classes" ON public.classes FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR school_id = (
            (auth.jwt()->'app_metadata'->>'school_id')::uuid
        )
    );
-- === EVENTS (Strict) ===
DROP POLICY IF EXISTS "Tenant Isolation: Read Events" ON public.events;
CREATE POLICY "Tenant Isolation: Read Events" ON public.events FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR school_id = (
            (auth.jwt()->'app_metadata'->>'school_id')::uuid
        )
    );
-- === IDEMPOTENCY (User Private) ===
ALTER TABLE public.action_idempotency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User Private: Idempotency" ON public.action_idempotency FOR ALL USING (user_id = auth.uid());
-- === AUDIT LOG (Admin Read Only) ===
ALTER TABLE public.action_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin Read: Audit Log" ON public.action_audit_log FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN ('system_owner')
        OR -- School Coordinators can view their OWN school's logs
        (
            (auth.jwt()->'app_metadata'->>'role') = 'school_coordinator'
            AND school_id = (
                (auth.jwt()->'app_metadata'->>'school_id')::uuid
            )
        )
    );
COMMIT;