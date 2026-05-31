-- ============================================================
-- STRICT ROLE REFACTOR MIGRATION (ENUM-SAFE)
-- Date: 2026-02-08
-- Description: Migrates legacy roles to canonical roles using strict
-- text casting to avoid Enum validation errors during the process.
-- Checks all relevant tables: profiles, user_personas, user_roles, invites.
-- ============================================================
BEGIN;
-- 1. Migrate Global System Roles (profiles.system_role)
-- super_admin -> system_owner
UPDATE public.profiles
SET system_role = 'system_owner'
WHERE system_role::text = 'super_admin';
-- 2. Migrate User Personas (user_personas.role)
UPDATE public.user_personas
SET role = 'school_coordinator'
WHERE role::text IN ('admin', 'system_coordinator');
UPDATE public.user_personas
SET role = 'lrc_specialist'
WHERE role::text IN ('librarian', 'lrc_admin');
-- 3. Migrate User Roles (user_roles.role)
UPDATE public.user_roles
SET role = 'school_coordinator'
WHERE role::text IN ('admin', 'system_coordinator');
UPDATE public.user_roles
SET role = 'lrc_specialist'
WHERE role::text IN ('librarian', 'lrc_admin');
-- 4. Migrate Invites (invites.target_role)
UPDATE public.invites
SET target_role = 'school_coordinator'
WHERE target_role::text IN ('admin', 'system_coordinator');
UPDATE public.invites
SET target_role = 'lrc_specialist'
WHERE target_role::text IN ('librarian', 'lrc_admin');
-- 5. Verification (Strict DO Block)
-- 5. Verification (Strict DO Block)
DO $$
DECLARE legacy_profiles_count INTEGER;
legacy_personas_count INTEGER;
legacy_roles_count INTEGER;
legacy_invites_count INTEGER;
BEGIN -- Check Profiles
SELECT COUNT(*) INTO legacy_profiles_count
FROM public.profiles
WHERE system_role::text = 'super_admin';
IF legacy_profiles_count > 0 THEN RAISE EXCEPTION 'Migration Failed: super_admin still found in % profiles',
legacy_profiles_count;
END IF;
-- Check Personas
SELECT COUNT(*) INTO legacy_personas_count
FROM public.user_personas
WHERE role::text IN (
        'admin',
        'system_coordinator',
        'librarian',
        'lrc_admin',
        'super_admin'
    );
IF legacy_personas_count > 0 THEN RAISE EXCEPTION 'Migration Failed: legacy roles still found in % user_personas',
legacy_personas_count;
END IF;
-- Check User Roles
SELECT COUNT(*) INTO legacy_roles_count
FROM public.user_roles
WHERE role::text IN (
        'admin',
        'system_coordinator',
        'librarian',
        'lrc_admin',
        'super_admin'
    );
IF legacy_roles_count > 0 THEN RAISE EXCEPTION 'Migration Failed: legacy roles still found in % user_roles',
legacy_roles_count;
END IF;
-- Check Invites
SELECT COUNT(*) INTO legacy_invites_count
FROM public.invites
WHERE target_role::text IN (
        'admin',
        'system_coordinator',
        'librarian',
        'lrc_admin',
        'super_admin'
    );
IF legacy_invites_count > 0 THEN RAISE EXCEPTION 'Migration Failed: legacy roles still found in % invites',
legacy_invites_count;
END IF;
RAISE NOTICE 'Strict Role Migration Verification Passed.';
END $$;
-- 6. Enforce Strict Constraints (The "No Return" Policy)
-- Profiles: system_role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_system_role_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_system_role_check CHECK (
        system_role::text IN ('system_owner', 'system_user', 'system_auditor')
    );
-- User Personas: role
ALTER TABLE public.user_personas DROP CONSTRAINT IF EXISTS user_personas_role_check;
ALTER TABLE public.user_personas
ADD CONSTRAINT user_personas_role_check CHECK (
        role::text IN (
            'school_coordinator',
            'lrc_specialist',
            'vp_students',
            'vp_academic',
            'vp_school',
            'principal',
            'teacher',
            'student',
            'parent',
            'school_secretary',
            'student_counselor',
            'health_supervisor',
            'lab_technician',
            'activities_coordinator',
            'quality_coordinator'
        )
    );
-- User Roles: role
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check CHECK (
        role::text IN (
            'school_coordinator',
            'lrc_specialist',
            'vp_students',
            'vp_academic',
            'vp_school',
            'principal',
            'teacher',
            'student',
            'parent',
            'school_secretary',
            'student_counselor',
            'health_supervisor',
            'lab_technician',
            'activities_coordinator',
            'quality_coordinator'
        )
    );
-- Invites: target_role (Should match School Roles + System Roles?)
-- Note: Invites can be for system_owner too.
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_target_role_check;
ALTER TABLE public.invites
ADD CONSTRAINT invites_target_role_check CHECK (
        target_role::text IN (
            'system_owner',
            'system_user',
            'system_auditor',
            'school_coordinator',
            'lrc_specialist',
            'vp_students',
            'vp_academic',
            'vp_school',
            'principal',
            'teacher',
            'student',
            'parent',
            'school_secretary',
            'student_counselor',
            'health_supervisor',
            'lab_technician',
            'activities_coordinator',
            'quality_coordinator'
        )
    );
COMMIT;