-- =================================================================
-- Migration 39: Layer 5 — جدول workflow_instances
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول workflow_instances — السجل الحي لكل workflow مُشغَّل
--   داخل مدرسة محددة. يرتبط بـ workflow_definitions (القالب العالمي)
--   وبـ user_personas (الموظف المُبادِر).
--
-- يتضمن هذا الـ migration:
--   1. إنشاء دالة get_my_school_id() بشكل مشروط (إن لم تكن موجودة)
--   2. إنشاء جدول workflow_instances
--   3. Indexes للأداء
--   4. RLS: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: schools ✅، user_personas ✅، workflow_definitions ✅
-- الجدول التالي: Migration 40 → workflow_transitions
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من التبعيات
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'schools'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول schools غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'user_personas'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول user_personas غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'workflow_definitions'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول workflow_definitions غير موجود — طبّق Migration 38 أولاً';
    END IF;

    RAISE NOTICE 'Preflight نجح: schools + user_personas + workflow_definitions موجودة';
END $$;

-- ============================================================
-- إنشاء get_my_school_id() — مشروط (لا يُعيد الكتابة إن وُجدت)
-- تستخرج school_id من JWT app_metadata للمستخدم الحالي
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE  proname      = 'get_my_school_id'
          AND  pronamespace = 'public'::regnamespace
    ) THEN
        EXECUTE $func$
            CREATE FUNCTION public.get_my_school_id()
            RETURNS uuid
            LANGUAGE sql
            STABLE
            SECURITY DEFINER
            SET search_path = public
            AS $body$
                SELECT (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
            $body$
        $func$;
        RAISE NOTICE 'CREATED: get_my_school_id()';
    ELSE
        RAISE NOTICE 'SKIP: get_my_school_id() موجودة بالفعل';
    END IF;
END $$;

-- ============================================================
-- إنشاء جدول workflow_instances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id),
    workflow_code            text        NOT NULL REFERENCES public.workflow_definitions(workflow_code),
    current_state            text        NOT NULL,

    -- الموظف المُبادِر بالـ workflow
    initiator_persona_id     uuid        NOT NULL REFERENCES public.user_personas(id),
    -- لقطة بيانات المُبادِر عند الإنشاء — لا تتغير بعد INSERT
    initiator_role_snapshot  text        NOT NULL,
    initiator_name_snapshot  text        NOT NULL,

    -- الكيان موضوع الـ workflow (مثلاً: موظف، حادثة، رفع ملف)
    -- يجب احتواء: table, id, type, display, school_id
    subject_ref              jsonb       NOT NULL,

    -- بيانات سياقية إضافية (اختيارية — تختلف حسب نوع الـ workflow)
    context_data             jsonb,

    due_date                 timestamptz,
    status                   text        NOT NULL DEFAULT 'in_progress'
                             CHECK (status IN (
                                 'in_progress',
                                 'completed',
                                 'cancelled',
                                 'escalated'
                             )),
    completed_at             timestamptz,
    created_at               timestamptz NOT NULL DEFAULT now(),

    -- UNIQUE(id, school_id) لدعم composite FK من workflow_transitions و approval_gates
    -- يضمن أن school_id في الجداول التابعة يطابق school_id هنا دائماً
    UNIQUE (id, school_id),

    -- subject_ref يجب أن يحمل المفاتيح الخمسة الأساسية
    CONSTRAINT subject_ref_keys CHECK (
        (subject_ref ? 'table')
        AND (subject_ref ? 'id')
        AND (subject_ref ? 'type')
        AND (subject_ref ? 'display')
        AND (subject_ref ? 'school_id')
    ),

    -- school_id داخل subject_ref يجب أن يطابق school_id الصف
    -- يمنع الإشارة لكيانات من مدارس أخرى
    CONSTRAINT subject_ref_school_match CHECK (
        (subject_ref ->> 'school_id')::uuid = school_id
    )
);

COMMENT ON TABLE  public.workflow_instances                        IS 'Layer 5: السجل الحي لكل workflow مُشغَّل — مرتبط بمدرسة محددة';
COMMENT ON COLUMN public.workflow_instances.initiator_role_snapshot IS 'لقطة دور المُبادِر عند بدء الـ workflow — لا تتغير بعد الإنشاء';
COMMENT ON COLUMN public.workflow_instances.initiator_name_snapshot IS 'لقطة اسم المُبادِر عند بدء الـ workflow — لا تتغير بعد الإنشاء';
COMMENT ON COLUMN public.workflow_instances.subject_ref            IS 'مرجع الكيان موضوع الـ workflow: {table, id, type, display, school_id}';
COMMENT ON COLUMN public.workflow_instances.context_data           IS 'بيانات سياقية إضافية — بنيتها تختلف حسب workflow_code';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wi_school_status
    ON public.workflow_instances (school_id, status);

CREATE INDEX IF NOT EXISTS idx_wi_school_code
    ON public.workflow_instances (school_id, workflow_code);

CREATE INDEX IF NOT EXISTS idx_wi_initiator
    ON public.workflow_instances (initiator_persona_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

-- SELECT: موظفو المدرسة أو system_owner
DROP POLICY IF EXISTS "wi_select" ON public.workflow_instances;
CREATE POLICY "wi_select" ON public.workflow_instances
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: موظفو المدرسة فقط (school_id يجب أن يطابق سياق المستخدم)
DROP POLICY IF EXISTS "wi_insert" ON public.workflow_instances;
CREATE POLICY "wi_insert" ON public.workflow_instances
    FOR INSERT
    WITH CHECK (school_id = get_my_school_id());

-- UPDATE: موظفو المدرسة (التحقق من صحة الانتقال يتم في Service Layer)
DROP POLICY IF EXISTS "wi_update" ON public.workflow_instances;
CREATE POLICY "wi_update" ON public.workflow_instances
    FOR UPDATE
    USING (school_id = get_my_school_id());

-- لا DELETE policy — workflow instances لا تُحذف

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active boolean;
    _func_exists boolean;
BEGIN
    -- التحقق من الجدول
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'workflow_instances'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول workflow_instances لم يُنشأ';
    END IF;

    -- التحقق من RLS
    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'workflow_instances'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على workflow_instances';
    END IF;

    -- التحقق من get_my_school_id()
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE  proname      = 'get_my_school_id'
          AND  pronamespace = 'public'::regnamespace
    ) INTO _func_exists;

    IF NOT _func_exists THEN
        RAISE EXCEPTION 'التحقق فشل: دالة get_my_school_id() غير موجودة';
    END IF;

    -- التحقق من UNIQUE(id, school_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname    = 'workflow_instances_id_school_id_key'
          AND  conrelid   = 'public.workflow_instances'::regclass
          AND  contype    = 'u'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: UNIQUE(id, school_id) غير موجود على workflow_instances';
    END IF;

    RAISE NOTICE '✓ workflow_instances أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل';
    RAISE NOTICE '✓ get_my_school_id() موجودة';
    RAISE NOTICE '✓ UNIQUE(id, school_id) موجود';
    RAISE NOTICE '✓ Migration 39 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE — لا حذف ضمني
-- يجب تنفيذ rollback لـ 41 → 40 قبل هذا الملف
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS
--   DROP POLICY IF EXISTS "wi_select" ON public.workflow_instances;
--   DROP POLICY IF EXISTS "wi_insert" ON public.workflow_instances;
--   DROP POLICY IF EXISTS "wi_update" ON public.workflow_instances;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.workflow_instances DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.workflow_instances;
--
-- الخطوة 4: حذف الدالة (اختيارية — قد تستخدمها جداول أخرى)
--   DROP FUNCTION IF EXISTS public.get_my_school_id();
--
-- ملاحظة: الخطوة 3 ستفشل إذا كانت Migration 40 أو 41 مُطبَّقة —
-- هذا السلوك مقصود لحماية التسلسل.
