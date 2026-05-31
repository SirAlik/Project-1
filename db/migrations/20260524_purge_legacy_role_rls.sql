-- =================================================================
-- Migration: Purge Legacy Role Names from RLS Policies
-- Date: 2026-05-24
-- =================================================================
-- السياق:
--   بعد تشغيل 20260523_normalize_role_keys.sql تم إعادة تسمية قيم
--   ENUM القديمة (principal, school_coordinator, ...) إلى أسمائها
--   الرسمية. لكن تبقّت سياستان قديمتان لم تُعالَجا:
--
--   1. "Tenant Isolation: Write Students" — من 06_rls_policies.sql
--      تستخدم school_coordinator/principal/vp_students/lrc_specialist
--      (مُستعاضٌ عنها بثلاث سياسات منفصلة INSERT/UPDATE/DELETE)
--
--   2. "School Leaders Create Invites" — من 20260202_identity_forge_phase2_rls.sql
--      (حرف L كبير، تختلف عن "School leaders create invites" الصحيحة)
--      تستخدم principal/vp_academic/vp_school/vp_students/school_coordinator
--
--   كلتا السياستين قد تُسبّبان خطأ invalid ENUM value عند التقييم
--   لأن القيم القديمة لم تعد موجودة في school_role_type.
-- =================================================================
BEGIN;

-- ============================================================
-- 1. حذف السياسة الكلية القديمة لـ student_profiles
--    (تغطيها الآن ثلاث سياسات INSERT/UPDATE/DELETE من 20260523)
-- ============================================================
DROP POLICY IF EXISTS "Tenant Isolation: Write Students" ON public.student_profiles;

-- ============================================================
-- 2. حذف سياسة الدعوات القديمة (الاسم بحرف L كبير)
--    الصحيحة الجديدة اسمها "School leaders create invites" (lowercase)
--    وأُنشئت في 20260523_normalize_role_keys.sql
-- ============================================================
DROP POLICY IF EXISTS "School Leaders Create Invites" ON public.invites;

-- ============================================================
-- 3. التحقق: لا توجد سياسة RLS نشطة تحتوي أسماء أدوار قديمة
--    في نص SQL الخاص بها
-- ============================================================
DO $$
DECLARE
    stale_policy RECORD;
    found_stale  BOOLEAN := FALSE;
    legacy_terms TEXT[] := ARRAY[
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor',
        'super_admin'
    ];
    term TEXT;
BEGIN
    FOREACH term IN ARRAY legacy_terms LOOP
        FOR stale_policy IN
            SELECT schemaname, tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND (qual ILIKE '%' || term || '%'
                   OR with_check ILIKE '%' || term || '%')
        LOOP
            RAISE WARNING 'LEGACY ROLE FOUND in policy: %.% — policy: "%"',
                stale_policy.schemaname,
                stale_policy.tablename,
                stale_policy.policyname;
            found_stale := TRUE;
        END LOOP;
    END LOOP;

    IF found_stale THEN
        RAISE EXCEPTION 'PURGE INCOMPLETE: active RLS policies still reference legacy role names — see warnings above';
    END IF;

    RAISE NOTICE 'RLS policy audit passed — no legacy role names found in active policies';
END $$;

-- ============================================================
-- 4. التحقق: لا توجد صفوف في الجداول الحيّة تحمل أسماء قديمة
-- ============================================================
DO $$
DECLARE
    stale_personas INTEGER;
    stale_invites  INTEGER;
BEGIN
    SELECT COUNT(*) INTO stale_personas
    FROM public.user_personas
    WHERE role::text IN (
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor'
    );

    SELECT COUNT(*) INTO stale_invites
    FROM public.invites
    WHERE target_role::text IN (
        'school_coordinator', 'principal', 'lrc_specialist',
        'vp_students', 'vp_academic', 'vp_school',
        'activities_coordinator', 'health_supervisor'
    );

    IF stale_personas > 0 OR stale_invites > 0 THEN
        RAISE EXCEPTION 'DATA STILL DIRTY: user_personas=%, invites=%',
            stale_personas, stale_invites;
    END IF;

    RAISE NOTICE 'Data audit passed — user_personas and invites are clean';
END $$;

COMMIT;
