-- =================================================================
-- Migration 40: Layer 5 — جدول workflow_transitions
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول workflow_transitions — سجل أثري append-only لكل
--   انتقال حالة في الـ workflow. لا يُعدَّل ولا يُحذف أبداً.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول workflow_transitions مع composite FK
--   2. Trigger يمنع UPDATE (defense in depth — يحمي حتى عبر service role)
--   3. Indexes
--   4. RLS: SELECT + INSERT فقط — لا UPDATE ولا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39)
-- الجدول التالي: Migration 41 → approval_gates
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من التبعيات
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'workflow_instances'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول workflow_instances غير موجود — طبّق Migration 39 أولاً';
    END IF;

    -- التحقق من UNIQUE(id, school_id) الضروري للـ composite FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname  = 'workflow_instances_id_school_id_key'
          AND  conrelid = 'public.workflow_instances'::regclass
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: UNIQUE(id, school_id) غير موجود على workflow_instances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE  proname      = 'get_my_school_id'
          AND  pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: دالة get_my_school_id() غير موجودة';
    END IF;

    RAISE NOTICE 'Preflight نجح: workflow_instances + get_my_school_id() موجودة';
END $$;

-- ============================================================
-- إنشاء جدول workflow_transitions (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Composite FK: يضمن أن school_id يطابق workflow_instance المرجعي
    workflow_instance_id uuid        NOT NULL,
    school_id            uuid        NOT NULL,

    from_state           text        NOT NULL,
    to_state             text        NOT NULL,

    -- action بدون CHECK — التحقق من صحة الانتقال يتم في Service Layer
    -- بالمقارنة مع workflow_definitions.states.transitions
    action               text        NOT NULL,

    -- هل هذا انتقال تلقائي من النظام (cron، escalation، trigger)؟
    is_system_action     boolean     NOT NULL DEFAULT false,

    -- بيانات الممثل البشري (NULL عند is_system_action = true)
    actor_persona_id     uuid        REFERENCES public.user_personas(id),
    actor_user_id        uuid,               -- snapshot من auth.uid() عند الانتقال
    actor_role_snapshot  text,               -- snapshot من دور الممثل
    actor_name_snapshot  text,               -- snapshot من اسم الممثل

    decision_notes       text,
    attachments          text[]      NOT NULL DEFAULT '{}',
    signature_hash       text,
    ip_address           inet,
    created_at           timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: يربط بـ workflow_instances(id, school_id)
    -- يضمن تطابق school_id عبر الجداول دون استعلامات JOIN إضافية في RLS
    CONSTRAINT fk_wft_instance FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- إما انتقال نظام (جميع actor fields = NULL)
    -- أو انتقال بشري (جميع actor fields NOT NULL)
    CONSTRAINT actor_consistency CHECK (
        (
            is_system_action = true
            AND actor_persona_id  IS NULL
            AND actor_user_id     IS NULL
            AND actor_role_snapshot IS NULL
            AND actor_name_snapshot IS NULL
        )
        OR (
            is_system_action = false
            AND actor_persona_id  IS NOT NULL
            AND actor_user_id     IS NOT NULL
            AND actor_role_snapshot IS NOT NULL
            AND actor_name_snapshot IS NOT NULL
        )
    )
);

COMMENT ON TABLE  public.workflow_transitions                    IS 'Layer 5: سجل أثري append-only لانتقالات الـ workflow — لا تعديل ولا حذف';
COMMENT ON COLUMN public.workflow_transitions.action            IS 'اسم الإجراء — يُتحقق من صحته في Service Layer مقارنةً بـ workflow_definitions.states';
COMMENT ON COLUMN public.workflow_transitions.is_system_action  IS 'true عند الانتقالات التلقائية (escalation, cron) — actor fields تكون NULL';
COMMENT ON COLUMN public.workflow_transitions.actor_user_id     IS 'snapshot من auth.uid() عند الانتقال — لا يتأثر بتغييرات user_personas لاحقاً';

-- ============================================================
-- Trigger: منع UPDATE على workflow_transitions
-- Defense in depth — يحمي حتى عند الوصول عبر service role
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_wft_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'workflow_transitions هو append-only — التعديل ممنوع منعاً باتاً (id: %)',
        OLD.id;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_wft_update ON public.workflow_transitions;
CREATE TRIGGER trg_prevent_wft_update
    BEFORE UPDATE ON public.workflow_transitions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_wft_update();

-- ============================================================
-- Indexes
-- ============================================================

-- الأكثر استخداماً: جلب تاريخ انتقالات instance بترتيب زمني
CREATE INDEX IF NOT EXISTS idx_wft_instance_time
    ON public.workflow_transitions (workflow_instance_id, created_at);

-- للاستعلامات على مستوى المدرسة (تقارير، audit)
CREATE INDEX IF NOT EXISTS idx_wft_school_time
    ON public.workflow_transitions (school_id, created_at);

-- ============================================================
-- Row Level Security — append-only: SELECT + INSERT فقط
-- ============================================================
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

-- SELECT: موظفو المدرسة أو system_owner
DROP POLICY IF EXISTS "wft_select" ON public.workflow_transitions;
CREATE POLICY "wft_select" ON public.workflow_transitions
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: موظفو المدرسة فقط
DROP POLICY IF EXISTS "wft_insert" ON public.workflow_transitions;
CREATE POLICY "wft_insert" ON public.workflow_transitions
    FOR INSERT
    WITH CHECK (school_id = get_my_school_id());

-- لا wft_update — لا wft_delete
-- الحماية المزدوجة: RLS (بدون write policies) + trigger fn_prevent_wft_update

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active   boolean;
    _trigger_exists boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'workflow_transitions'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول workflow_transitions لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'workflow_transitions'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على workflow_transitions';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE  event_object_schema = 'public'
          AND  event_object_table  = 'workflow_transitions'
          AND  trigger_name        = 'trg_prevent_wft_update'
    ) INTO _trigger_exists;

    IF NOT _trigger_exists THEN
        RAISE EXCEPTION 'التحقق فشل: trigger trg_prevent_wft_update غير موجود';
    END IF;

    -- التحقق من غياب سياسات UPDATE/DELETE (append-only integrity)
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE  schemaname = 'public'
          AND  tablename  = 'workflow_transitions'
          AND  cmd IN ('UPDATE', 'DELETE')
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: وُجدت سياسات UPDATE/DELETE على workflow_transitions — يجب أن تكون append-only';
    END IF;

    RAISE NOTICE '✓ workflow_transitions أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT فقط)';
    RAISE NOTICE '✓ trigger trg_prevent_wft_update موجود';
    RAISE NOTICE '✓ لا سياسات UPDATE/DELETE — append-only مؤكّد';
    RAISE NOTICE '✓ Migration 40 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE — لا حذف ضمني
-- يجب تنفيذ rollback لـ 41 قبل هذا الملف
-- ============================================================
--
-- الخطوة 1: حذف الـ trigger
--   DROP TRIGGER IF EXISTS trg_prevent_wft_update ON public.workflow_transitions;
--   DROP FUNCTION IF EXISTS public.fn_prevent_wft_update();
--
-- الخطوة 2: حذف سياسات RLS
--   DROP POLICY IF EXISTS "wft_select" ON public.workflow_transitions;
--   DROP POLICY IF EXISTS "wft_insert" ON public.workflow_transitions;
--
-- الخطوة 3: تعطيل RLS
--   ALTER TABLE public.workflow_transitions DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 4: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.workflow_transitions;
--
-- ملاحظة: الخطوة 4 ستفشل إذا كانت Migration 41 مُطبَّقة — هذا مقصود.
