-- =================================================================
-- Migration 41: Layer 5 — جدول approval_gates
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول approval_gates — نقاط توقف الموافقة داخل الـ workflow.
--   كل gate يُمثّل قراراً مطلوباً من شخص محدد أو دور محدد.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول approval_gates مع composite FK
--   2. Partial index للـ gates المعلقة (الأكثر استخداماً)
--   3. RLS: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39)
-- آخر جدول في Layer 5 Core
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
-- إنشاء جدول approval_gates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_gates (
    id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Composite FK: يضمن تطابق school_id مع workflow_instance المرجعي
    workflow_instance_id     uuid        NOT NULL,
    school_id                uuid        NOT NULL,

    -- تعريف الـ gate
    gate_name                text        NOT NULL,
    required_role            text        NOT NULL,   -- دور من school_role_type ENUM

    -- المُعيَّن للموافقة (قد يُعيَّن لاحقاً بعد الإنشاء)
    assigned_to_persona_id   uuid        REFERENCES public.user_personas(id),
    assigned_role            text        NOT NULL,   -- snapshot الدور المطلوب

    -- حالة الـ gate
    status                   text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                                 'pending',
                                 'approved',
                                 'rejected',
                                 'expired'
                             )),

    -- التفويض: gate يبقى pending لكن يُفوَّض لشخص آخر
    is_delegated             boolean     NOT NULL DEFAULT false,

    -- خيارات القرار (اختيارية — تختلف حسب نوع الـ workflow)
    decision_options         jsonb,
    selected_option          text,
    justification            text,

    -- بيانات صاحب القرار (NULL حتى يُتخذ القرار)
    decided_by_persona_id    uuid        REFERENCES public.user_personas(id),
    decided_by_user_id       uuid,               -- snapshot من auth.uid()
    decided_by_role_snapshot text,               -- snapshot الدور عند القرار
    decided_by_name_snapshot text,               -- snapshot الاسم عند القرار
    decided_at               timestamptz,

    signature_hash           text,
    due_date                 timestamptz,
    escalation_role          text,               -- الدور الذي يُصعَّد إليه عند انتهاء المهلة
    created_at               timestamptz NOT NULL DEFAULT now(),

    -- Composite FK إلى workflow_instances(id, school_id)
    CONSTRAINT fk_ag_instance FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- إذا decided_at موجودة → جميع decided_by fields يجب أن تكون موجودة
    -- إذا decided_at فارغة → جميع decided_by fields يجب أن تكون فارغة
    CONSTRAINT decision_consistency CHECK (
        (
            decided_at               IS NULL
            AND decided_by_persona_id  IS NULL
            AND decided_by_user_id     IS NULL
            AND decided_by_role_snapshot IS NULL
            AND decided_by_name_snapshot IS NULL
        )
        OR (
            decided_at               IS NOT NULL
            AND decided_by_persona_id  IS NOT NULL
            AND decided_by_user_id     IS NOT NULL
            AND decided_by_role_snapshot IS NOT NULL
            AND decided_by_name_snapshot IS NOT NULL
        )
    )
);

COMMENT ON TABLE  public.approval_gates                             IS 'Layer 5: نقاط توقف الموافقة داخل الـ workflow — قرار بشري مطلوب';
COMMENT ON COLUMN public.approval_gates.required_role              IS 'الدور المطلوب للموافقة — قيمة من school_role_type';
COMMENT ON COLUMN public.approval_gates.is_delegated              IS 'true عند التفويض — gate يبقى pending ويُعاد تعيينه';
COMMENT ON COLUMN public.approval_gates.decision_options           IS 'خيارات القرار المتاحة — بنيتها تختلف حسب workflow_code';
COMMENT ON COLUMN public.approval_gates.escalation_role           IS 'الدور الذي يُصعَّد إليه تلقائياً عند انتهاء due_date';
COMMENT ON COLUMN public.approval_gates.decided_by_user_id        IS 'snapshot من auth.uid() عند القرار — لا يتأثر بتغييرات user_personas لاحقاً';

-- ============================================================
-- Indexes
-- ============================================================

-- Partial index: للـ gates المعلقة — الأكثر استخداماً في الواجهة
-- (لوحة "بانتظار موافقتك")
CREATE INDEX IF NOT EXISTS idx_ag_pending
    ON public.approval_gates (assigned_to_persona_id, status)
    WHERE status = 'pending';

-- للاستعلامات على مستوى الـ instance (جلب كل gates لـ workflow معين)
CREATE INDEX IF NOT EXISTS idx_ag_instance_status
    ON public.approval_gates (workflow_instance_id, status);

-- للاستعلامات على مستوى المدرسة (تقارير، لوحة الإدارة)
CREATE INDEX IF NOT EXISTS idx_ag_school_status
    ON public.approval_gates (school_id, status);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.approval_gates ENABLE ROW LEVEL SECURITY;

-- SELECT: صاحب الـ gate + المدير + منسق الجودة + system_owner
DROP POLICY IF EXISTS "ag_select" ON public.approval_gates;
CREATE POLICY "ag_select" ON public.approval_gates
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (
                -- المُعيَّن مباشرة
                assigned_to_persona_id IN (
                    SELECT up.id
                    FROM   public.user_personas up
                    WHERE  up.user_id   = auth.uid()
                      AND  up.school_id = get_my_school_id()
                )
                -- أو أدوار ذات صلاحية عامة داخل المدرسة
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                    'school_principal',
                    'school_admin',
                    'quality_coordinator'
                )
            )
        )
    );

-- INSERT: موظفو المدرسة — Service Layer يُنشئ الـ gate بعد كل انتقال
DROP POLICY IF EXISTS "ag_insert" ON public.approval_gates;
CREATE POLICY "ag_insert" ON public.approval_gates
    FOR INSERT
    WITH CHECK (school_id = get_my_school_id());

-- UPDATE: المُعيَّن أو المدير فقط — لتسجيل القرار أو التفويض
DROP POLICY IF EXISTS "ag_update" ON public.approval_gates;
CREATE POLICY "ag_update" ON public.approval_gates
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            assigned_to_persona_id IN (
                SELECT up.id
                FROM   public.user_personas up
                WHERE  up.user_id   = auth.uid()
                  AND  up.school_id = get_my_school_id()
            )
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_principal',
                'school_admin'
            )
        )
    );

-- لا DELETE policy — approval gates لا تُحذف

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'approval_gates'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول approval_gates لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'approval_gates'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على approval_gates';
    END IF;

    -- التحقق من الـ partial index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE  schemaname = 'public'
          AND  tablename  = 'approval_gates'
          AND  indexname  = 'idx_ag_pending'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: idx_ag_pending غير موجود';
    END IF;

    RAISE NOTICE '✓ approval_gates أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT + UPDATE)';
    RAISE NOTICE '✓ idx_ag_pending (partial index) موجود';
    RAISE NOTICE '✓ Migration 41 اكتمل بنجاح';
    RAISE NOTICE '✓ Layer 5 Core Tables مكتملة: workflow_instances + workflow_transitions + approval_gates';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE — لا حذف ضمني
-- هذا آخر جدول في Layer 5 — يُبدأ منه عند الرجوع
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS
--   DROP POLICY IF EXISTS "ag_select" ON public.approval_gates;
--   DROP POLICY IF EXISTS "ag_insert" ON public.approval_gates;
--   DROP POLICY IF EXISTS "ag_update" ON public.approval_gates;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.approval_gates DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.approval_gates;
--
-- بعد ذلك: انتقل إلى rollback Migration 40 ثم Migration 39.
