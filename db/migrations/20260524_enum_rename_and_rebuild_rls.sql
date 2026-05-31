-- =================================================================
-- Migration: Rename school_role_type ENUM + Rebuild 12 RLS Policies
-- Date: 2026-05-24
-- =================================================================
-- السبب: school_role_type لا يزال يحمل القيم القديمة (principal,
-- school_coordinator, lrc_specialist, ...) لأن 20260523 لم يُشغَّل.
--
-- المنهج:
--   المرحلة 0 → RENAME VALUE (transactional, فوري الأثر في نفس الـ TX)
--   المرحلة 1 → إعادة بناء 12 سياسة RLS بالأسماء الرسمية
--   المرحلة 2 → تحقق نهائي
--
-- ملاحظة: RENAME VALUE يختلف عن ADD VALUE:
--   - تحويلي كاملاً (rollback-safe)
--   - القيمة الجديدة متاحة فوراً داخل نفس الـ transaction
--   - لا يحتاج تشغيله خارج BEGIN/COMMIT
-- =================================================================
BEGIN;

-- ============================================================
-- المرحلة 0: تحديث قيم ENUM
-- DO block + EXECUTE لضمان الـ idempotency
-- (لا يفشل إذا سبق تشغيل هذا الـ migration جزئياً)
-- ============================================================
DO $$
DECLARE
    _oid oid;
BEGIN
    SELECT oid INTO _oid FROM pg_type WHERE typname = 'school_role_type';
    IF _oid IS NULL THEN
        RAISE EXCEPTION 'FATAL: school_role_type not found in pg_type';
    END IF;

    -- principal → school_principal
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'principal') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''principal'' TO ''school_principal''';
        RAISE NOTICE 'RENAMED: principal → school_principal';
    ELSE
        RAISE NOTICE 'SKIP: principal already renamed';
    END IF;

    -- school_coordinator → school_admin
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'school_coordinator') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''school_coordinator'' TO ''school_admin''';
        RAISE NOTICE 'RENAMED: school_coordinator → school_admin';
    ELSE
        RAISE NOTICE 'SKIP: school_coordinator already renamed';
    END IF;

    -- lrc_specialist → school_librarian
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'lrc_specialist') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''lrc_specialist'' TO ''school_librarian''';
        RAISE NOTICE 'RENAMED: lrc_specialist → school_librarian';
    ELSE
        RAISE NOTICE 'SKIP: lrc_specialist already renamed';
    END IF;

    -- vp_students → student_affairs_vp
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'vp_students') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''vp_students'' TO ''student_affairs_vp''';
        RAISE NOTICE 'RENAMED: vp_students → student_affairs_vp';
    ELSE
        RAISE NOTICE 'SKIP: vp_students already renamed';
    END IF;

    -- vp_academic → academic_vp
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'vp_academic') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''vp_academic'' TO ''academic_vp''';
        RAISE NOTICE 'RENAMED: vp_academic → academic_vp';
    ELSE
        RAISE NOTICE 'SKIP: vp_academic already renamed';
    END IF;

    -- vp_school → school_affairs_vp
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'vp_school') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''vp_school'' TO ''school_affairs_vp''';
        RAISE NOTICE 'RENAMED: vp_school → school_affairs_vp';
    ELSE
        RAISE NOTICE 'SKIP: vp_school already renamed';
    END IF;

    -- activities_coordinator → activity_leader
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'activities_coordinator') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''activities_coordinator'' TO ''activity_leader''';
        RAISE NOTICE 'RENAMED: activities_coordinator → activity_leader';
    ELSE
        RAISE NOTICE 'SKIP: activities_coordinator already renamed';
    END IF;

    -- health_supervisor → health_coordinator
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'health_supervisor') THEN
        EXECUTE 'ALTER TYPE school_role_type RENAME VALUE ''health_supervisor'' TO ''health_coordinator''';
        RAISE NOTICE 'RENAMED: health_supervisor → health_coordinator';
    ELSE
        RAISE NOTICE 'SKIP: health_supervisor already renamed';
    END IF;

    RAISE NOTICE 'Phase 0 complete — school_role_type ENUM updated';
END $$;

-- ============================================================
-- المرحلة 1: إعادة بناء 12 سياسة RLS
-- القيم الجديدة متاحة الآن بعد RENAME VALUE أعلاه
-- ============================================================

-- 1. action_audit_log — audit_select_policy
DROP POLICY IF EXISTS "audit_select_policy" ON public.action_audit_log;
CREATE POLICY "audit_select_policy" ON public.action_audit_log
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (school_id IS NOT NULL)
            AND (school_id = get_my_school_id())
        )
    );

-- 2. activity_clubs — Admin/Principal/VP Read Access
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_clubs;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_clubs
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal', 'student_affairs_vp'
        )
    );

-- 3. activity_events — Admin/Principal/VP Read Access
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_events;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_events
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal', 'student_affairs_vp'
        )
    );

-- 4. activity_financials — Admin/Principal/VP Read Access
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_financials;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_financials
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal', 'student_affairs_vp'
        )
    );

-- 5. canteen_checks — Admin/Principal Read - Canteen
DROP POLICY IF EXISTS "Admin/Principal Read - Canteen" ON public.canteen_checks;
CREATE POLICY "Admin/Principal Read - Canteen" ON public.canteen_checks
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal'
        )
    );

-- 6. cases — Staff Read Cases
DROP POLICY IF EXISTS "Staff Read Cases" ON public.cases;
CREATE POLICY "Staff Read Cases" ON public.cases
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'student_affairs_vp',
            'student_counselor', 'school_principal'
        )
        OR (
            (auth.jwt()->'app_metadata'->>'role') = 'teacher'
            AND opened_by = auth.uid()
        )
    );

-- 7. counseling_sessions — Counselor Private Access
DROP POLICY IF EXISTS "Counselor Private Access" ON public.counseling_sessions;
CREATE POLICY "Counselor Private Access" ON public.counseling_sessions
    FOR ALL USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'student_counselor', 'school_principal', 'system_owner'
        )
    );

-- 8. events — Staff Read Events
DROP POLICY IF EXISTS "Staff Read Events" ON public.events;
CREATE POLICY "Staff Read Events" ON public.events
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'student_affairs_vp',
            'student_counselor', 'school_principal', 'teacher'
        )
    );

-- 9. health_supplies — Admin/Principal Read - Supplies
DROP POLICY IF EXISTS "Admin/Principal Read - Supplies" ON public.health_supplies;
CREATE POLICY "Admin/Principal Read - Supplies" ON public.health_supplies
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal', 'health_coordinator'
        )
    );

-- 10. hygiene_logs — Admin/Principal Read - Hygiene
DROP POLICY IF EXISTS "Admin/Principal Read - Hygiene" ON public.hygiene_logs;
CREATE POLICY "Admin/Principal Read - Hygiene" ON public.hygiene_logs
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'school_principal', 'health_coordinator'
        )
    );

-- 11. invites — School leaders create invites
--     الآن school_principal متاحة في school_role_type بعد RENAME أعلاه
DROP POLICY IF EXISTS "School leaders create invites" ON public.invites;
CREATE POLICY "School leaders create invites" ON public.invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_personas p
            WHERE p.user_id = auth.uid()
                AND p.school_id = invites.target_school_id
                AND p.role = ANY (ARRAY[
                    'school_principal'::school_role_type,
                    'academic_vp'::school_role_type,
                    'school_affairs_vp'::school_role_type,
                    'student_affairs_vp'::school_role_type,
                    'school_admin'::school_role_type,
                    'school_secretary'::school_role_type
                ])
        )
        OR is_system_owner()
    );

-- 12. student_profiles — Staff Read Students
DROP POLICY IF EXISTS "Staff Read Students" ON public.student_profiles;
CREATE POLICY "Staff Read Students" ON public.student_profiles
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner', 'school_admin', 'student_affairs_vp',
            'student_counselor', 'teacher', 'school_principal', 'school_secretary'
        )
    );

-- ============================================================
-- المرحلة 2: تحقق نهائي شامل
-- ============================================================
DO $$
DECLARE
    rec         RECORD;
    found_stale BOOLEAN := FALSE;
    legacy_terms TEXT[] := ARRAY[
        'school_coordinator', '''principal''', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor',
        'super_admin', 'is_super_admin'
    ];
    term TEXT;
BEGIN
    -- فحص pg_policies
    FOREACH term IN ARRAY legacy_terms LOOP
        FOR rec IN
            SELECT tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND (qual       ILIKE '%' || term || '%'
                   OR with_check ILIKE '%' || term || '%')
        LOOP
            RAISE WARNING 'STALE TERM "%" in policy: %.%',
                term, rec.tablename, rec.policyname;
            found_stale := TRUE;
        END LOOP;
    END LOOP;

    IF found_stale THEN
        RAISE EXCEPTION 'ROLLBACK: stale terms still found in active RLS policies';
    END IF;

    -- فحص قيم ENUM المتبقية
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'school_role_type'::regtype
          AND enumlabel IN (
            'principal', 'school_coordinator', 'lrc_specialist',
            'vp_students', 'vp_academic', 'vp_school',
            'activities_coordinator', 'health_supervisor'
          )
    ) THEN
        RAISE EXCEPTION 'ROLLBACK: school_role_type still contains legacy ENUM values';
    END IF;

    RAISE NOTICE '✓ ENUM clean — all 8 values renamed';
    RAISE NOTICE '✓ RLS clean — all 12 policies rebuilt';
    RAISE NOTICE '✓ Migration complete';
END $$;

COMMIT;
