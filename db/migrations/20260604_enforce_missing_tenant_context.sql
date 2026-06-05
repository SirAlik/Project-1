-- ============================================================
-- Phase 2 — فرض سياق المستأجر على الجداول المفقودة
-- ============================================================
-- الجداول المتأثرة: case_actions، student_honors، student_wishes
--
-- المبادئ المطبَّقة:
--   1. school_id يُشتَق من الصف الأب عند INSERT دائماً.
--   2. أعمدة المرجع الأب (case_id، student_id) غير قابلة للتعديل.
--   3. عند UPDATE: school_id يتجمَّد بـ OLD.school_id — لا إعادة اشتقاق.
--   4. system_owner يحصل على فرع OR مستقل في INSERT/UPDATE
--      لأنه دور نظامي بلا school_id في JWT.
--   5. جميع سياسات UPDATE تحمل WITH CHECK لمنع طفرة school_id.
--
-- student_wishes — schema مُتحقَّق من app/activity/_actions.ts:
--   الأعمدة: student_id، first_choice، second_choice، third_choice، school_year
--   لا club_id ولا FK لـ activity_clubs.
--   التطبيق يستخدم upsert → مسار UPDATE مُعالَج في trigger.
-- ============================================================

BEGIN;

-- ─── Preflight ────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE 'Phase 2 — Preflight: التحقق من وجود الجداول...';

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='case_actions') THEN
        RAISE NOTICE 'تحذير: case_actions غير موجودة — سيُتخطى هذا الجدول.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_honors') THEN
        RAISE NOTICE 'تحذير: student_honors غير موجودة — سيُتخطى هذا الجدول.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_wishes') THEN
        RAISE NOTICE 'تحذير: student_wishes غير موجودة — سيُتخطى هذا الجدول.';
    END IF;

    RAISE NOTICE 'Preflight مكتمل.';
END $$;

-- ============================================================
-- A. case_actions — إضافة school_id + trigger + RLS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='case_actions') THEN
        RAISE NOTICE 'case_actions غير موجودة — تخطي.';
        RETURN;
    END IF;

    -- فارغة في مرحلة ما قبل الإطلاق — تطهير قبل تغيير الـ schema
    TRUNCATE TABLE public.case_actions CASCADE;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='case_actions' AND column_name='school_id'
    ) THEN
        ALTER TABLE public.case_actions
            ADD COLUMN school_id uuid REFERENCES public.schools(id);
    END IF;

    ALTER TABLE public.case_actions ALTER COLUMN school_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_case_actions_school_id ON public.case_actions(school_id);
    RAISE NOTICE 'case_actions: school_id NOT NULL + index ✓';
END $$;

-- trigger BEFORE INSERT OR UPDATE:
--   INSERT → يشتق school_id من cases.school_id + تحقق cross-tenant
--   UPDATE → يرفض تعديل case_id + يُجمِّد school_id بـ OLD.school_id
CREATE OR REPLACE FUNCTION public.fn_case_actions_set_school_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_case_school_id uuid;
    v_jwt_school_id  uuid;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- إجراء القضية لا يُعاد تخصيصه لقضية مختلفة
        IF NEW.case_id IS DISTINCT FROM OLD.case_id THEN
            RAISE EXCEPTION 'case_actions: case_id غير قابل للتعديل بعد الإدراج';
        END IF;
        -- تجميد school_id — يبقى كما اشتُقَّ عند الإدراج
        NEW.school_id := OLD.school_id;
        RETURN NEW;
    END IF;

    -- INSERT: اشتقاق من cases (الصف الأب) — لا ثقة بقيمة العميل
    SELECT c.school_id INTO v_case_school_id
    FROM public.cases c WHERE c.id = NEW.case_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'case_actions: case_id % غير موجود في جدول cases', NEW.case_id;
    END IF;

    v_jwt_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_jwt_school_id IS NOT NULL AND v_case_school_id IS DISTINCT FROM v_jwt_school_id THEN
        RAISE EXCEPTION 'cross-tenant violation: case_id % ينتمي لمدرسة مختلفة', NEW.case_id;
    END IF;

    NEW.school_id := v_case_school_id;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='case_actions') THEN
        DROP TRIGGER IF EXISTS trg_case_actions_school_id ON public.case_actions;
        CREATE TRIGGER trg_case_actions_school_id
            BEFORE INSERT OR UPDATE ON public.case_actions
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_case_actions_set_school_id();
    END IF;
END $$;

-- RLS على case_actions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='case_actions') THEN
        ALTER TABLE public.case_actions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "case_actions_select"             ON public.case_actions;
        DROP POLICY IF EXISTS "case_actions_insert"             ON public.case_actions;
        DROP POLICY IF EXISTS "case_actions_update"             ON public.case_actions;
        DROP POLICY IF EXISTS "case_actions_delete"             ON public.case_actions;
        DROP POLICY IF EXISTS "Staff can view case actions"     ON public.case_actions;
        DROP POLICY IF EXISTS "Staff can insert case actions"   ON public.case_actions;
        DROP POLICY IF EXISTS "Authenticated users can view"    ON public.case_actions;
        DROP POLICY IF EXISTS "Users can view own actions"      ON public.case_actions;

        -- SELECT: بيانات إرشادية حساسة — يُقصر على أدوار المرشد والإدارة
        -- الطلاب وأولياء الأمور والمعلمون العاديون لا يقرؤون case_actions
        CREATE POLICY "case_actions_select" ON public.case_actions
            FOR SELECT TO authenticated
            USING (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'student_counselor'
                    )
                )
            );

        -- INSERT: system_owner فرع OR مستقل (لا school_id في JWT له)
        CREATE POLICY "case_actions_insert" ON public.case_actions
            FOR INSERT TO authenticated
            WITH CHECK (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'student_counselor'
                    )
                )
            );

        -- UPDATE: WITH CHECK يمنع طفرة school_id بعد trigger التجميد
        CREATE POLICY "case_actions_update" ON public.case_actions
            FOR UPDATE TO authenticated
            USING (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'student_counselor'
                    )
                )
            )
            WITH CHECK (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
            );

        -- DELETE: غير موجود عمداً — السجل الأمني لا يُحذَف (default = DENY)
        RAISE NOTICE 'case_actions: RLS مُفعَّل ✓';
    END IF;
END $$;

-- ============================================================
-- B. student_honors — إضافة school_id + trigger + إصلاح RLS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_honors') THEN
        RAISE NOTICE 'student_honors غير موجودة — تخطي.';
        RETURN;
    END IF;

    TRUNCATE TABLE public.student_honors CASCADE;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_honors' AND column_name='school_id'
    ) THEN
        ALTER TABLE public.student_honors
            ADD COLUMN school_id uuid REFERENCES public.schools(id);
    END IF;

    ALTER TABLE public.student_honors ALTER COLUMN school_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_student_honors_school_id ON public.student_honors(school_id);
    RAISE NOTICE 'student_honors: school_id NOT NULL + index ✓';
END $$;

-- trigger BEFORE INSERT OR UPDATE:
--   INSERT → يشتق school_id من student_profiles + تحقق cross-tenant
--   UPDATE → يرفض تعديل student_id + يُجمِّد school_id
CREATE OR REPLACE FUNCTION public.fn_student_honors_set_school_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_school_id uuid;
    v_jwt_school_id     uuid;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'student_honors: student_id غير قابل للتعديل بعد الإدراج';
        END IF;
        NEW.school_id := OLD.school_id;
        RETURN NEW;
    END IF;

    SELECT sp.school_id INTO v_student_school_id
    FROM public.student_profiles sp WHERE sp.id = NEW.student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'student_honors: student_id % غير موجود في student_profiles', NEW.student_id;
    END IF;

    v_jwt_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_jwt_school_id IS NOT NULL AND v_student_school_id IS DISTINCT FROM v_jwt_school_id THEN
        RAISE EXCEPTION 'cross-tenant violation: student_id % ينتمي لمدرسة مختلفة', NEW.student_id;
    END IF;

    NEW.school_id := v_student_school_id;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_honors') THEN
        DROP TRIGGER IF EXISTS trg_student_honors_school_id ON public.student_honors;
        CREATE TRIGGER trg_student_honors_school_id
            BEFORE INSERT OR UPDATE ON public.student_honors
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_student_honors_set_school_id();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_honors') THEN
        ALTER TABLE public.student_honors ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "student_honors_select"              ON public.student_honors;
        DROP POLICY IF EXISTS "student_honors_insert"              ON public.student_honors;
        DROP POLICY IF EXISTS "Student can view own honors"        ON public.student_honors;
        DROP POLICY IF EXISTS "Student can insert honors"          ON public.student_honors;
        DROP POLICY IF EXISTS "Authenticated can view honors"      ON public.student_honors;
        DROP POLICY IF EXISTS "Staff can manage honors"            ON public.student_honors;

        -- SELECT: يُقصر على أدوار النشاط والإدارة
        -- الطلاب وأولياء الأمور لا يقرؤون مباشرةً — إن احتاج الطالب لرؤية تكريمه
        -- يُضاف policy منفصل مع subquery لمطابقة student_profiles.user_id = auth.uid()
        CREATE POLICY "student_honors_select" ON public.student_honors
            FOR SELECT TO authenticated
            USING (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'student_counselor',
                        'activity_leader', 'teacher'
                    )
                )
            );

        -- INSERT: system_owner فرع OR مستقل
        CREATE POLICY "student_honors_insert" ON public.student_honors
            FOR INSERT TO authenticated
            WITH CHECK (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'activity_leader', 'teacher'
                    )
                )
            );

        -- UPDATE: غير موجود عمداً — التكريم لا يُعدَّل بعد المنح (default = DENY)
        -- أي تصحيح استثنائي يتم عبر service_role فقط.
        RAISE NOTICE 'student_honors: RLS مُصلَح ✓';
    END IF;
END $$;

-- ============================================================
-- C. student_wishes — إضافة school_id + trigger + إصلاح RLS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_wishes') THEN
        RAISE NOTICE 'student_wishes غير موجودة — تخطي.';
        RETURN;
    END IF;

    TRUNCATE TABLE public.student_wishes CASCADE;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_wishes' AND column_name='school_id'
    ) THEN
        ALTER TABLE public.student_wishes
            ADD COLUMN school_id uuid REFERENCES public.schools(id);
    END IF;

    ALTER TABLE public.student_wishes ALTER COLUMN school_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_student_wishes_school_id ON public.student_wishes(school_id);
    RAISE NOTICE 'student_wishes: school_id NOT NULL + index ✓';
END $$;

-- trigger BEFORE INSERT OR UPDATE:
--   INSERT → يشتق school_id + تحقق cross-tenant
--   UPDATE → يرفض تعديل student_id + يُجمِّد school_id
--   ضروري لأن submitWishAction تستخدم upsert (INSERT ON CONFLICT DO UPDATE)
CREATE OR REPLACE FUNCTION public.fn_student_wishes_set_school_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_school_id uuid;
    v_jwt_school_id     uuid;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'student_wishes: student_id غير قابل للتعديل بعد الإدراج';
        END IF;
        NEW.school_id := OLD.school_id;
        RETURN NEW;
    END IF;

    SELECT sp.school_id INTO v_student_school_id
    FROM public.student_profiles sp WHERE sp.id = NEW.student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'student_wishes: student_id % غير موجود في student_profiles', NEW.student_id;
    END IF;

    v_jwt_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_jwt_school_id IS NOT NULL AND v_student_school_id IS DISTINCT FROM v_jwt_school_id THEN
        RAISE EXCEPTION 'cross-tenant violation: student_id % ينتمي لمدرسة مختلفة', NEW.student_id;
    END IF;

    NEW.school_id := v_student_school_id;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_wishes') THEN
        DROP TRIGGER IF EXISTS trg_student_wishes_school_id ON public.student_wishes;
        CREATE TRIGGER trg_student_wishes_school_id
            BEFORE INSERT OR UPDATE ON public.student_wishes
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_student_wishes_set_school_id();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_wishes') THEN
        ALTER TABLE public.student_wishes ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "student_wishes_select"           ON public.student_wishes;
        DROP POLICY IF EXISTS "student_wishes_insert"           ON public.student_wishes;
        DROP POLICY IF EXISTS "student_wishes_upsert"           ON public.student_wishes;
        DROP POLICY IF EXISTS "student_wishes_update"           ON public.student_wishes;
        DROP POLICY IF EXISTS "Student can manage own wishes"   ON public.student_wishes;
        DROP POLICY IF EXISTS "Authenticated can view wishes"   ON public.student_wishes;

        -- SELECT: الأمنيات بيانات شخصية — يُقصر على أدوار النشاط والإدارة
        -- وصول الطالب لأمنيته الخاصة يستلزم policy منفصل يربط auth.uid()
        -- بـ student_profiles.user_id (يُطبَّق عند إضافة student portal)
        CREATE POLICY "student_wishes_select" ON public.student_wishes
            FOR SELECT TO authenticated
            USING (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'student_counselor',
                        'activity_leader', 'teacher'
                    )
                )
            );

        -- INSERT: system_owner فرع OR مستقل
        CREATE POLICY "student_wishes_upsert" ON public.student_wishes
            FOR INSERT TO authenticated
            WITH CHECK (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'activity_leader', 'teacher'
                    )
                )
            );

        -- UPDATE: WITH CHECK يمنع طفرة school_id — system_owner فرع OR مستقل
        CREATE POLICY "student_wishes_update" ON public.student_wishes
            FOR UPDATE TO authenticated
            USING (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR (
                    school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
                    AND (auth.jwt()->'app_metadata'->>'role') IN (
                        'school_admin', 'school_principal',
                        'student_affairs_vp', 'activity_leader'
                    )
                )
            )
            WITH CHECK (
                (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
                OR school_id = (auth.jwt()->'app_metadata'->>'school_id')::uuid
            );

        RAISE NOTICE 'student_wishes: RLS مُصلَح ✓';
    END IF;
END $$;

-- ─── Validation ───────────────────────────────────────────────

DO $$
DECLARE
    v_col_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='case_actions'
          AND column_name='school_id' AND is_nullable='NO'
    ) INTO v_col_exists;
    IF v_col_exists THEN
        RAISE NOTICE '✅ case_actions.school_id NOT NULL ✓';
    ELSE
        RAISE NOTICE '⚠ case_actions.school_id لم يُضَف (قد لا يكون الجدول موجوداً)';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_honors'
          AND column_name='school_id' AND is_nullable='NO'
    ) INTO v_col_exists;
    IF v_col_exists THEN
        RAISE NOTICE '✅ student_honors.school_id NOT NULL ✓';
    ELSE
        RAISE NOTICE '⚠ student_honors.school_id لم يُضَف';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_wishes'
          AND column_name='school_id' AND is_nullable='NO'
    ) INTO v_col_exists;
    IF v_col_exists THEN
        RAISE NOTICE '✅ student_wishes.school_id NOT NULL ✓';
    ELSE
        RAISE NOTICE '⚠ student_wishes.school_id لم يُضَف';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📋 action_idempotency: عمداً بدون school_id — user-scoped infrastructure.';
    RAISE NOTICE '   UNIQUE(user_id, idempotency_key) كافٍ لضمان عدم التكرار.';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Phase 2 اكتمل.';
END $$;

COMMIT;
