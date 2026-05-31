-- =================================================================
-- Migration: Normalize Role Keys to ROLE_KEYS_STANDARD.md
-- Date: 2026-05-23
-- =================================================================
-- خريطة إعادة التسمية (8 أدوار):
--   school_coordinator      → school_admin
--   principal               → school_principal
--   lrc_specialist          → school_librarian
--   vp_students             → student_affairs_vp
--   vp_academic             → academic_vp
--   vp_school               → school_affairs_vp
--   activities_coordinator  → activity_leader
--   health_supervisor       → health_coordinator
--
-- تنبيه: بعد تشغيل هذا الترحيل، يجب إلغاء الجلسات الفعالة التي
-- تحمل أسماء الأدوار القديمة في app_metadata.role بـ Supabase Auth.
-- =================================================================
BEGIN;

-- ============================================================
-- المرحلة 1: إعادة تسمية قيم ENUM في school_role_type
-- جميع الصفوف الموجودة تُحدَّث تلقائياً بواسطة PostgreSQL
-- ============================================================
ALTER TYPE school_role_type RENAME VALUE 'school_coordinator'     TO 'school_admin';
ALTER TYPE school_role_type RENAME VALUE 'principal'              TO 'school_principal';
ALTER TYPE school_role_type RENAME VALUE 'lrc_specialist'         TO 'school_librarian';
ALTER TYPE school_role_type RENAME VALUE 'vp_students'            TO 'student_affairs_vp';
ALTER TYPE school_role_type RENAME VALUE 'vp_academic'            TO 'academic_vp';
ALTER TYPE school_role_type RENAME VALUE 'vp_school'              TO 'school_affairs_vp';
ALTER TYPE school_role_type RENAME VALUE 'activities_coordinator' TO 'activity_leader';
ALTER TYPE school_role_type RENAME VALUE 'health_supervisor'      TO 'health_coordinator';

-- ============================================================
-- المرحلة 2: إعادة تسمية قيم ENUM في user_role (الـ enum القديم المشترك)
-- يؤثر على: invites.target_role و profiles.role
-- مغلف في DO block لأن الحالة الدقيقة لهذا الـ enum غير مضمونة
-- ============================================================
DO $$
DECLARE
    _type_oid oid;
BEGIN
    SELECT oid INTO _type_oid FROM pg_type WHERE typname = 'user_role';
    IF NOT FOUND THEN
        RAISE NOTICE 'user_role type not found — skipping Phase 2';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'school_coordinator') THEN
        ALTER TYPE user_role RENAME VALUE 'school_coordinator'     TO 'school_admin';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'principal') THEN
        ALTER TYPE user_role RENAME VALUE 'principal'              TO 'school_principal';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'lrc_specialist') THEN
        ALTER TYPE user_role RENAME VALUE 'lrc_specialist'         TO 'school_librarian';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'vp_students') THEN
        ALTER TYPE user_role RENAME VALUE 'vp_students'            TO 'student_affairs_vp';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'vp_academic') THEN
        ALTER TYPE user_role RENAME VALUE 'vp_academic'            TO 'academic_vp';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'vp_school') THEN
        ALTER TYPE user_role RENAME VALUE 'vp_school'              TO 'school_affairs_vp';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'activities_coordinator') THEN
        ALTER TYPE user_role RENAME VALUE 'activities_coordinator' TO 'activity_leader';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _type_oid AND enumlabel = 'health_supervisor') THEN
        ALTER TYPE user_role RENAME VALUE 'health_supervisor'      TO 'health_coordinator';
    END IF;

    RAISE NOTICE 'Phase 2: user_role ENUM renamed successfully';
END $$;

-- ============================================================
-- المرحلة 3: تحديث CHECK constraints بالأسماء الجديدة
-- ============================================================

-- user_personas.role
ALTER TABLE public.user_personas DROP CONSTRAINT IF EXISTS user_personas_role_check;
ALTER TABLE public.user_personas ADD CONSTRAINT user_personas_role_check CHECK (
    role::text IN (
        'school_admin',
        'school_principal',
        'school_librarian',
        'student_affairs_vp',
        'academic_vp',
        'school_affairs_vp',
        'school_secretary',
        'activity_leader',
        'student_counselor',
        'health_coordinator',
        'quality_coordinator',
        'lab_technician',
        'teacher',
        'student',
        'parent'
    )
);

-- user_roles.role (إن وجد الجدول)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
            role::text IN (
                'school_admin',
                'school_principal',
                'school_librarian',
                'student_affairs_vp',
                'academic_vp',
                'school_affairs_vp',
                'school_secretary',
                'activity_leader',
                'student_counselor',
                'health_coordinator',
                'quality_coordinator',
                'lab_technician',
                'teacher',
                'student',
                'parent'
            )
        );
        RAISE NOTICE 'Phase 3: user_roles CHECK constraint updated';
    END IF;
END $$;

-- invites.target_role (يشمل أدوار النظام + أدوار المدرسة)
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_target_role_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_target_role_check CHECK (
    target_role::text IN (
        'system_owner',
        'system_user',
        'system_auditor',
        'school_admin',
        'school_principal',
        'school_librarian',
        'student_affairs_vp',
        'academic_vp',
        'school_affairs_vp',
        'school_secretary',
        'activity_leader',
        'student_counselor',
        'health_coordinator',
        'quality_coordinator',
        'lab_technician',
        'teacher',
        'student',
        'parent'
    )
);

-- ============================================================
-- المرحلة 4: إعادة بناء سياسات RLS التي تحوي أسماء أدوار صريحة
-- الحالات التي تقارن user_personas.role (عمود ENUM) أو
-- auth.jwt()→app_metadata→role (نص JWT) بأسماء الأدوار القديمة
-- ============================================================

-- 4أ. student_profiles: INSERT
DROP POLICY IF EXISTS "Tenant Isolation: Insert Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Insert Students" ON public.student_profiles
    FOR INSERT WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') IN (
                'school_admin',
                'school_principal',
                'student_affairs_vp',
                'school_librarian',
                'teacher',
                'school_secretary'
            )
            AND school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );

-- 4ب. student_profiles: UPDATE
DROP POLICY IF EXISTS "Tenant Isolation: Update Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Update Students" ON public.student_profiles
    FOR UPDATE
    USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    )
    WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') IN (
                'school_admin',
                'school_principal',
                'student_affairs_vp',
                'school_librarian',
                'teacher',
                'school_secretary'
            )
            AND school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );

-- 4ج. student_profiles: DELETE
DROP POLICY IF EXISTS "Tenant Isolation: Delete Students" ON public.student_profiles;
CREATE POLICY "Tenant Isolation: Delete Students" ON public.student_profiles
    FOR DELETE USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') IN ('school_admin', 'school_principal')
            AND school_id IS NOT NULL
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );

-- 4د. invites: CREATE (يقارن user_personas.role — عمود ENUM)
DROP POLICY IF EXISTS "School leaders create invites" ON public.invites;
CREATE POLICY "School leaders create invites" ON public.invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_personas p
            WHERE p.user_id = auth.uid()
                AND p.school_id = invites.target_school_id
                AND p.role::text IN (
                    'school_principal',
                    'academic_vp',
                    'school_affairs_vp',
                    'student_affairs_vp',
                    'school_admin',
                    'school_secretary'
                )
        )
        OR is_system_owner()
    );

-- 4هـ. action_audit_log: READ (تحديث للاتساق مع الاسم الجديد school_admin)
DROP POLICY IF EXISTS "Admin Read: Audit Log" ON public.action_audit_log;
CREATE POLICY "Admin Read: Audit Log" ON public.action_audit_log
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (auth.jwt()->'app_metadata'->>'role') = 'school_admin'
            AND school_id = ((auth.jwt()->'app_metadata'->>'school_id')::uuid)
        )
    );

-- ============================================================
-- المرحلة 5: التحقق النهائي
-- ============================================================
DO $$
DECLARE
    stale_personas INTEGER;
    stale_invites  INTEGER;
    stale_roles    INTEGER;
BEGIN
    SELECT COUNT(*) INTO stale_personas
    FROM public.user_personas
    WHERE role::text IN (
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor'
    );
    IF stale_personas > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % rows in user_personas still carry legacy role names', stale_personas;
    END IF;

    SELECT COUNT(*) INTO stale_invites
    FROM public.invites
    WHERE target_role::text IN (
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor'
    );
    IF stale_invites > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % rows in invites still carry legacy role names', stale_invites;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        SELECT COUNT(*) INTO stale_roles
        FROM public.user_roles
        WHERE role::text IN (
            'school_coordinator', 'principal', 'lrc_specialist',
            'vp_students', 'vp_academic', 'vp_school',
            'activities_coordinator', 'health_supervisor'
        );
        IF stale_roles > 0 THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: % rows in user_roles still carry legacy role names', stale_roles;
        END IF;
    END IF;

    RAISE NOTICE 'Role key normalization verified — all keys match ROLE_KEYS_STANDARD.md';
END $$;

COMMIT;
