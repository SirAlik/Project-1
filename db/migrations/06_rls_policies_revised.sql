-- ============================================================================
-- SQL Script E: Revised RLS Policies
-- Step 5 of 6: Repair Strategy
-- ============================================================================
BEGIN;
-- 1. Enable RLS on Tenant Tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_scans ENABLE ROW LEVEL SECURITY;
-- 2. SCHOOL SETTINGS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read School Settings" ON public.school_settings;
CREATE POLICY "Read School Settings" ON public.school_settings FOR
SELECT USING (
        -- System Owner OR Belong to School
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR school_id = (
            (auth.jwt()->'app_metadata'->>'school_id')::uuid
        )
    );
-- 3. STUDENT PROFILES (Strict Isolation)
DROP POLICY IF EXISTS "Tenant Isolation: Read Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Read Students" ON public.student_profiles FOR
SELECT USING (
        -- System Owner
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR -- Strict Tenant Match (Fail Closed if school_id is NULL on row)
        (
            school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
-- INSERT
DROP POLICY IF EXISTS "Tenant Isolation: Insert Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Insert Students" ON public.student_profiles FOR
INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') IN (
                'school_coordinator',
                'principal',
                'vp_students',
                'lrc_specialist',
                'teacher',
                'school_secretary'
            )
            AND school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
-- UPDATE
DROP POLICY IF EXISTS "Tenant Isolation: Update Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Update Students" ON public.student_profiles FOR
UPDATE USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    ) WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') IN (
                'school_coordinator',
                'principal',
                'vp_students',
                'lrc_specialist',
                'teacher',
                'school_secretary'
            )
            AND school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
-- DELETE (tight)
DROP POLICY IF EXISTS "Tenant Isolation: Delete Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Delete Students" ON public.student_profiles FOR DELETE USING (
    (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
    OR (
        (auth.jwt()->'app_metadata'->>'role') IN ('school_coordinator', 'principal')
        AND school_id IS NOT NULL
        AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
    )
);
-- 4. CLASSES
DROP POLICY IF EXISTS "Tenant Isolation: Read Classes" ON public.classes;
CREATE POLICY "Tenant Isolation: Read Classes" ON public.classes FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
-- 5. EVENTS
DROP POLICY IF EXISTS "Tenant Isolation: Read Events" ON public.events;
CREATE POLICY "Tenant Isolation: Read Events" ON public.events FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
-- 6. AUDIT LOG (Admin/Coordinator Only)
ALTER TABLE public.action_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Read: Audit Log" ON public.action_audit_log;
CREATE POLICY "Admin Read: Audit Log" ON public.action_audit_log FOR
SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') = 'school_coordinator'
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );
COMMIT;