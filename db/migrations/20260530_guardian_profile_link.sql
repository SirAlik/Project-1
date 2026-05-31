-- =================================================================
-- M60: ربط ولي الأمر بحساب المستخدم
-- التاريخ: 2026-05-30
-- =================================================================
-- الهدف:
--   إضافة profile_id إلى جدول guardians لربط سجل ولي الأمر
--   بحسابه في profiles (auth.users).
--   بدون هذا الربط: ولي الأمر الذي يملك حساباً لا يستطيع
--   النظام تحديد أي سجل في guardians ينتمي إليه.
--
--   أيضاً: تصحيح guardians.school_id لتكون NOT NULL
--   (كانت nullable في 03_academic_integrity القديم).
--
-- التبعيات:
--   ✅ profiles (core tenancy)
--   ✅ guardians (03_academic_integrity.sql)
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'guardians'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: guardians غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: profiles غير موجودة';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'guardians'
          AND column_name = 'profile_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: guardians.profile_id موجود مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. تصحيح school_id ليكون NOT NULL
--    (كانت nullable من ترحيل قديم — لا بيانات تتأثر)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.guardians
    ALTER COLUMN school_id SET NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. إضافة profile_id — ربط ولي الأمر بحسابه
--    ON DELETE SET NULL: إذا حُذف الحساب، يبقى سجل ولي الأمر
--    لكنه غير مرتبط بحساب (المدرسة تحتفظ بالسجل التاريخي)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.guardians
    ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- فهرس للبحث السريع عن "ما هو سجل ولي الأمر لهذا الحساب؟"
CREATE INDEX idx_guardians_profile_id ON public.guardians (profile_id)
    WHERE profile_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 3. تأكيد RLS + تحديث السياسات
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardians_select"  ON public.guardians;
DROP POLICY IF EXISTS "guardians_insert"  ON public.guardians;
DROP POLICY IF EXISTS "guardians_update"  ON public.guardians;

-- SELECT:
--   • system_owner يرى الكل
--   • موظفو المدرسة المخوَّلون يرون مدرستهم
--   • ولي الأمر يرى سجله الخاص عبر profile_id = auth.uid()
CREATE POLICY "guardians_select" ON public.guardians
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_principal',
            'school_admin',
            'school_secretary',
            'student_counselor'
        )
    )
    OR profile_id = auth.uid()
);

CREATE POLICY "guardians_insert" ON public.guardians
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
);

CREATE POLICY "guardians_update" ON public.guardians
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
);

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_nullable  text;
    v_rls       boolean;
    v_policies  integer;
BEGIN
    -- profile_id موجود
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'guardians'
          AND column_name = 'profile_id'
    ) THEN
        RAISE EXCEPTION 'FAIL: guardians.profile_id غير موجود';
    END IF;

    -- school_id NOT NULL
    SELECT is_nullable INTO v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardians'
      AND column_name = 'school_id';

    IF v_nullable <> 'NO' THEN
        RAISE EXCEPTION 'FAIL: guardians.school_id لا تزال nullable';
    END IF;

    -- RLS مفعّل
    SELECT relrowsecurity INTO v_rls
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'guardians';

    IF NOT v_rls THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على guardians';
    END IF;

    -- 3 سياسات (select + insert + update)
    SELECT COUNT(*) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'guardians';

    IF v_policies < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على guardians — المتوقع ≥ 3', v_policies;
    END IF;

    RAISE NOTICE '✅ M60 اكتمل:';
    RAISE NOTICE '   ✓ guardians.profile_id أُضيف (nullable — اختياري)';
    RAISE NOTICE '   ✓ guardians.school_id أصبح NOT NULL';
    RAISE NOTICE '   ✓ RLS مفعَّل + % سياسات', v_policies;
    RAISE NOTICE '   ✓ ولي الأمر يستطيع الآن رؤية سجله عبر profile_id = auth.uid()';
END $$;

COMMIT;
