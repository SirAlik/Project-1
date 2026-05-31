-- ============================================================
-- R08: Anon Lockdown + Invites Rebuild + Notifications CHECK
-- ============================================================
-- يعالج:
--   H-04 — 75+ جدول مكشوف للـ anon عبر PostgREST
--   M-03 — invites سياسات متضاربة (4 نسخ متعارضة)
--   M-04 — notifications.recipient_role بدون CHECK constraint
--
-- المبدأ: نظام مدرسي يتطلب تسجيل دخول دائماً — anon لا يملك
-- أي مسوّغ للوصول إلى أي جدول في public schema.
-- ============================================================

BEGIN;

-- ============================================================
-- H-04 — REVOKE كامل من anon
-- ============================================================
-- سحب صلاحية الاستخدام من schema بالكامل
REVOKE USAGE ON SCHEMA public FROM anon;

-- سحب كل صلاحيات الجداول الحالية
REVOKE ALL ON ALL TABLES     IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES  IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS  IN SCHEMA public FROM anon;

-- سحب الصلاحيات الافتراضية للجداول المستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES     FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES  FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS  FROM anon;

-- ============================================================
-- M-03 — إعادة بناء كاملة لجدول invites وسياساته
-- ============================================================

-- الخطوة 1: حذف كل السياسات القديمة المتضاربة (4 نسخ تاريخية)
DROP POLICY IF EXISTS "Admins View School Invites"     ON public.invites;
DROP POLICY IF EXISTS "Admins Create Invites"          ON public.invites;
DROP POLICY IF EXISTS "School leaders create invites"  ON public.invites;
DROP POLICY IF EXISTS "School Leaders Create Invites"  ON public.invites;
DROP POLICY IF EXISTS "invites_select"                 ON public.invites;
DROP POLICY IF EXISTS "invites_insert"                 ON public.invites;
DROP POLICY IF EXISTS "invites_update"                 ON public.invites;

-- الخطوة 2: إصلاح target_school_id — يجب NOT NULL (CLAUDE.md: لا tenant column nullable)
-- لا بيانات حقيقية — TRUNCATE أولاً
TRUNCATE TABLE public.invites;
ALTER TABLE public.invites
    ALTER COLUMN target_school_id SET NOT NULL;

-- الخطوة 3: سياسات نظيفة بالكامل تقرأ من JWT فقط
-- SELECT: كل موظف يرى دعوات مدرسته + system_owner يرى الكل
CREATE POLICY "invites_select" ON public.invites
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR target_school_id = get_my_school_id()
    );

-- INSERT: القيادة المدرسية تُنشئ دعوات لمدرستها فقط + system_owner
CREATE POLICY "invites_insert" ON public.invites
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            target_school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin',
                'school_principal',
                'school_affairs_vp',
                'student_affairs_vp',
                'academic_vp',
                'school_secretary'
            )
        )
    );

-- UPDATE: تحديث used_at عند استخدام الدعوة — فقط لمن يملك الدعوة أو system_owner
-- التنفيذ الفعلي يتم عبر service_role (server action) — لا نحتاج سياسة UPDATE هنا
-- service_role يتجاوز RLS تلقائياً

-- DELETE: لا أحد يحذف دعوات — تنتهي صلاحيتها بـ expires_at
-- (لا سياسة DELETE = حذف ممنوع لكل الأدوار بما فيها authenticated)

-- ============================================================
-- M-04 — إضافة CHECK constraint على notifications.recipient_role
-- ============================================================
-- حذف القيد القديم إن وُجد
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notif_recipient_role_valid;

-- إضافة القيد الجديد يطبّق الأسماء الرسمية الـ 16 فقط
ALTER TABLE public.notifications
    ADD CONSTRAINT notif_recipient_role_valid
    CHECK (
        recipient_role IS NULL
        OR recipient_role IN (
            'system_owner',
            'school_admin',
            'school_principal',
            'school_librarian',
            'student_affairs_vp',
            'academic_vp',
            'school_affairs_vp',
            'school_secretary',
            'activity_leader',
            'student_counselor',
            'student',
            'parent',
            'teacher',
            'health_coordinator',
            'quality_coordinator',
            'lab_technician'
        )
    );

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_anon_tables   integer;
    v_anon_funcs    integer;
    v_bad_policies  integer;
    v_nullable_sid  integer;
BEGIN
    -- 1. تحقق: anon لا يملك أي صلاحية على الجداول
    SELECT COUNT(*) INTO v_anon_tables
    FROM information_schema.role_table_grants
    WHERE grantee = 'anon'
      AND table_schema = 'public';

    IF v_anon_tables > 0 THEN
        RAISE EXCEPTION 'FAIL H-04: anon لا يزال يملك صلاحيات على % جدول', v_anon_tables;
    END IF;

    -- 2. تحقق: anon لا يملك أي صلاحية على الدوال
    SELECT COUNT(*) INTO v_anon_funcs
    FROM information_schema.role_routine_grants
    WHERE grantee = 'anon'
      AND specific_schema = 'public';

    IF v_anon_funcs > 0 THEN
        RAISE EXCEPTION 'FAIL H-04: anon لا يزال يملك EXECUTE على % دالة', v_anon_funcs;
    END IF;

    -- 3. تحقق: invites.target_school_id هو NOT NULL
    SELECT COUNT(*) INTO v_nullable_sid
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'invites'
      AND column_name  = 'target_school_id'
      AND is_nullable  = 'YES';

    IF v_nullable_sid > 0 THEN
        RAISE EXCEPTION 'FAIL M-03: invites.target_school_id لا يزال nullable';
    END IF;

    -- 4. تحقق: لا سياسات قديمة متضاربة على invites
    SELECT COUNT(*) INTO v_bad_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'invites'
      AND policyname IN (
          'Admins View School Invites',
          'Admins Create Invites',
          'School Leaders Create Invites'
      );

    IF v_bad_policies > 0 THEN
        RAISE EXCEPTION 'FAIL M-03: % سياسة قديمة لا تزال موجودة على invites', v_bad_policies;
    END IF;

    -- 5. تحقق: CHECK constraint موجود على notifications.recipient_role
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema    = 'public'
          AND table_name      = 'notifications'
          AND constraint_name = 'notif_recipient_role_valid'
          AND constraint_type = 'CHECK'
    ) THEN
        RAISE EXCEPTION 'FAIL M-04: CHECK constraint غير موجود على notifications.recipient_role';
    END IF;

    RAISE NOTICE '✅ R08 اكتمل:';
    RAISE NOTICE '   H-04 — anon صفر صلاحيات على public schema';
    RAISE NOTICE '   M-03 — invites: 4 سياسات قديمة حُذفت، 2 نظيفتان JWT-only، target_school_id NOT NULL';
    RAISE NOTICE '   M-04 — notifications.recipient_role محمي بـ CHECK (16 دوراً رسمياً)';

END;
$$;

COMMIT;