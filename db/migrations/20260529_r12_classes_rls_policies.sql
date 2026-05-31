-- ============================================================
-- R12: إعادة بناء سياسات RLS على جدول classes
-- ============================================================
-- السبب:
--   R11 حذف "Admin View All Classes" (كانت تستخدم is_admin() الإرثية)
--   وتبيَّن أنها كانت السياسة الوحيدة على الجدول
--   النتيجة: classes بلا سياسات = التطبيق لا يرى فصولاً
--
-- الحل: سياسات JWT نظيفة بنمط النظام المعتمد
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

CREATE POLICY "classes_insert" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'academic_vp'
            )
        )
    );

CREATE POLICY "classes_update" ON public.classes
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'academic_vp'
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'academic_vp'
            )
        )
    );

-- التحقق
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'classes';

    IF v_count < 3 THEN
        RAISE EXCEPTION 'FAIL R12: % سياسات فقط على classes — المتوقع 3', v_count;
    END IF;

    RAISE NOTICE '✅ R12 اكتمل: % سياسات JWT نظيفة على classes', v_count;
END;
$$;

COMMIT;
