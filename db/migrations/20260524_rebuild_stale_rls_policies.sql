-- =================================================================
-- Migration: Rebuild 11 Stale RLS Policies (Legacy Role Names)
-- Date: 2026-05-24
-- =================================================================
-- السياسات المُعالَجة (11 سياسة):
--
--  action_audit_log    | audit_select_policy            → is_super_admin() بُتر
--  activity_clubs      | Admin/Principal/VP Read Access → profiles.role قديم
--  activity_events     | Admin/Principal/VP Read Access → profiles.role قديم
--  activity_financials | Admin/Principal/VP Read Access → profiles.role قديم
--  canteen_checks      | Admin/Principal Read - Canteen → profiles.role قديم
--  cases               | Staff Read Cases               → get_my_role() + أسماء قديمة
--  counseling_sessions | Counselor Private Access       → get_my_role() + أسماء قديمة
--  events              | Staff Read Events              → get_my_role() + أسماء قديمة
--  health_supplies     | Admin/Principal Read - Supplies→ profiles.role قديم
--  hygiene_logs        | Admin/Principal Read - Hygiene → profiles.role قديم
--  invites             | School leaders create invites  → school_role_type بقيم قديمة
--  student_profiles    | Staff Read Students            → get_my_role() + أسماء قديمة
--
-- المنهج: استبدال get_my_role()/profiles.role/is_super_admin()
--   بـ auth.jwt()->'app_metadata'->>'role' (المعيار الموحّد في جميع
--   السياسات الحديثة منذ 20260523_normalize_role_keys.sql)
-- =================================================================
BEGIN;

-- ============================================================
-- 1. action_audit_log — audit_select_policy
--    المشكلة: is_super_admin() دالة منتهية
--    الإصلاح: فحص مباشر عبر JWT
-- ============================================================
DROP POLICY IF EXISTS "audit_select_policy" ON public.action_audit_log;
CREATE POLICY "audit_select_policy" ON public.action_audit_log
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
        OR (
            (school_id IS NOT NULL)
            AND (school_id = get_my_school_id())
        )
    );

-- ============================================================
-- 2. activity_clubs — Admin/Principal/VP Read Access
--    المشكلة: profiles.role = ANY([admin, principal, student_affairs])
--    الإصلاح: JWT مع الأسماء الرسمية
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_clubs;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_clubs
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'student_affairs_vp'
        )
    );

-- ============================================================
-- 3. activity_events — Admin/Principal/VP Read Access
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_events;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_events
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'student_affairs_vp'
        )
    );

-- ============================================================
-- 4. activity_financials — Admin/Principal/VP Read Access
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access" ON public.activity_financials;
CREATE POLICY "Admin/Principal/VP Read Access" ON public.activity_financials
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'student_affairs_vp'
        )
    );

-- ============================================================
-- 5. canteen_checks — Admin/Principal Read - Canteen
--    المشكلة: profiles.role = ANY([admin, principal])
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal Read - Canteen" ON public.canteen_checks;
CREATE POLICY "Admin/Principal Read - Canteen" ON public.canteen_checks
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal'
        )
    );

-- ============================================================
-- 6. cases — Staff Read Cases
--    المشكلة: get_my_role() + [admin, student_affairs, counselor, principal]
-- ============================================================
DROP POLICY IF EXISTS "Staff Read Cases" ON public.cases;
CREATE POLICY "Staff Read Cases" ON public.cases
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'student_affairs_vp',
            'student_counselor',
            'school_principal'
        )
        OR (
            (auth.jwt()->'app_metadata'->>'role') = 'teacher'
            AND opened_by = auth.uid()
        )
    );

-- ============================================================
-- 7. counseling_sessions — Counselor Private Access
--    المشكلة: get_my_role() = ANY([counselor, principal])
-- ============================================================
DROP POLICY IF EXISTS "Counselor Private Access" ON public.counseling_sessions;
CREATE POLICY "Counselor Private Access" ON public.counseling_sessions
    FOR ALL USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'student_counselor',
            'school_principal',
            'system_owner'
        )
    );

-- ============================================================
-- 8. events — Staff Read Events
--    المشكلة: get_my_role() + [admin, student_affairs, counselor, principal, teacher]
-- ============================================================
DROP POLICY IF EXISTS "Staff Read Events" ON public.events;
CREATE POLICY "Staff Read Events" ON public.events
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'student_affairs_vp',
            'student_counselor',
            'school_principal',
            'teacher'
        )
    );

-- ============================================================
-- 9. health_supplies — Admin/Principal Read - Supplies
--    المشكلة: profiles.role = ANY([admin, principal])
--    health_coordinator أُضيف لأنه صاحب الجدول الطبيعي
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal Read - Supplies" ON public.health_supplies;
CREATE POLICY "Admin/Principal Read - Supplies" ON public.health_supplies
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'health_coordinator'
        )
    );

-- ============================================================
-- 10. hygiene_logs — Admin/Principal Read - Hygiene
-- ============================================================
DROP POLICY IF EXISTS "Admin/Principal Read - Hygiene" ON public.hygiene_logs;
CREATE POLICY "Admin/Principal Read - Hygiene" ON public.hygiene_logs
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'health_coordinator'
        )
    );

-- ============================================================
-- 11. invites — School leaders create invites
--    المشكلة: school_role_type ARRAY بقيم قديمة
--    [principal, vp_academic, vp_school, vp_students, school_coordinator, school_secretary]
-- ============================================================
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

-- ============================================================
-- 12. student_profiles — Staff Read Students
--    المشكلة: get_my_role() + [admin, student_affairs, counselor, teacher, principal, secretary]
-- ============================================================
DROP POLICY IF EXISTS "Staff Read Students" ON public.student_profiles;
CREATE POLICY "Staff Read Students" ON public.student_profiles
    FOR SELECT USING (
        (auth.jwt()->'app_metadata'->>'role') IN (
            'system_owner',
            'school_admin',
            'student_affairs_vp',
            'student_counselor',
            'teacher',
            'school_principal',
            'school_secretary'
        )
    );

-- ============================================================
-- التحقق النهائي: لا سياسة نشطة تحمل مسمى قديماً
-- ============================================================
DO $$
DECLARE
    stale_policy RECORD;
    found_stale  BOOLEAN := FALSE;
    legacy_terms TEXT[] := ARRAY[
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor',
        'super_admin', 'is_super_admin',
        '''admin''', 'student_affairs', '''counselor''',
        '''secretary'''
    ];
    term TEXT;
BEGIN
    FOREACH term IN ARRAY legacy_terms LOOP
        FOR stale_policy IN
            SELECT tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND (qual       ILIKE '%' || term || '%'
                   OR with_check ILIKE '%' || term || '%')
        LOOP
            RAISE WARNING 'LEGACY TERM "%" still found in policy: % → %',
                term, stale_policy.tablename, stale_policy.policyname;
            found_stale := TRUE;
        END LOOP;
    END LOOP;

    IF found_stale THEN
        RAISE EXCEPTION 'PURGE INCOMPLETE — see warnings above';
    END IF;

    RAISE NOTICE 'All 12 policies rebuilt successfully — no legacy role names remain';
END $$;

COMMIT;
