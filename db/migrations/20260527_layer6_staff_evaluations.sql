-- =================================================================
-- Migration 44: Layer 6 — جدول staff_evaluations
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول staff_evaluations — سجل تقييم الأداء الوظيفي
--   الخاص بـ workflow STAFF_EVAL (ISO 9001:2015 بند 9.1.3).
--   يحمل النتائج والدرجات والإقرار الرسمي لكل دورة تقييم.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول staff_evaluations مع FK اختياري لـ workflow_instances
--   2. Indexes
--   3. RLS: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39) — user_personas ✅ — schools ✅
-- الجدول التالي: Migration 45 → meeting_sessions
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
        SELECT 1 FROM pg_proc
        WHERE  proname      = 'get_my_school_id'
          AND  pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: دالة get_my_school_id() غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname  = 'workflow_instances_id_school_id_key'
          AND  conrelid = 'public.workflow_instances'::regclass
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: UNIQUE(id, school_id) غير موجود على workflow_instances';
    END IF;

    RAISE NOTICE 'Preflight نجح: workflow_instances + get_my_school_id() موجودة';
END $$;

-- ============================================================
-- إنشاء جدول staff_evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_evaluations (
    id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                       uuid        NOT NULL REFERENCES public.schools(id),

    -- رابط اختياري بـ workflow instance
    workflow_instance_id            uuid,

    -- تعريف التقييم
    evaluation_number               text        NOT NULL,
    academic_year                   text        NOT NULL,   -- مثال: '2025-2026'

    -- الموظف المُقيَّم
    evaluatee_persona_id            uuid        NOT NULL REFERENCES public.user_personas(id),
    evaluatee_name_snapshot         text        NOT NULL,
    evaluatee_role_snapshot         text        NOT NULL,

    -- المُقيِّم (عادةً المدير)
    evaluator_persona_id            uuid        REFERENCES public.user_personas(id),
    evaluator_name_snapshot         text,

    evaluation_period_start         date,
    evaluation_period_end           date,

    -- النتائج — يُملأ عند اكتمال التقييم
    scores                          jsonb,          -- درجات تفصيلية حسب بنود الاستمارة
    total_score                     numeric(6, 2),
    max_score                       numeric(6, 2),
    percentage                      numeric(5, 2),  -- يُحسب بواسطة Service Layer عند الحفظ
    performance_level               text        CHECK (
                                        performance_level IN (
                                            'excellent',
                                            'very_good',
                                            'good',
                                            'satisfactory',
                                            'needs_improvement'
                                        ) OR performance_level IS NULL
                                    ),

    evaluator_notes                 text,
    development_plan                text,

    -- إقرار الموظف المُقيَّم — يُملأ في مرحلة acknowledged
    evaluatee_acknowledgment_notes  text,
    acknowledged_by_persona_id      uuid        REFERENCES public.user_personas(id),
    acknowledged_at                 timestamptz,

    -- الحفظ الرسمي — يُملأ في مرحلة filed
    filed_by_persona_id             uuid        REFERENCES public.user_personas(id),
    filed_at                        timestamptz,

    -- الحالة
    status                          text        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN (
                                        'draft',
                                        'completed',
                                        'acknowledged',
                                        'filed',
                                        'cancelled'
                                    )),

    created_at                      timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: يضمن تطابق school_id
    CONSTRAINT fk_se_workflow FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- رقم التقييم فريد داخل كل مدرسة
    CONSTRAINT se_number_school_unique UNIQUE (school_id, evaluation_number),

    -- فترة التقييم: إما كلاهما موجود أو كلاهما NULL — والنهاية بعد البداية
    CONSTRAINT evaluation_period_valid CHECK (
        (
            evaluation_period_start IS NULL
            AND evaluation_period_end IS NULL
        )
        OR (
            evaluation_period_start IS NOT NULL
            AND evaluation_period_end IS NOT NULL
            AND evaluation_period_end >= evaluation_period_start
        )
    )
);

COMMENT ON TABLE  public.staff_evaluations                               IS 'Layer 6: تقييم الأداء الوظيفي — الكيان الموضوعي لـ STAFF_EVAL workflow (ISO 9.1.3)';
COMMENT ON COLUMN public.staff_evaluations.workflow_instance_id          IS 'FK اختياري — يُعيَّن عند إطلاق دورة التقييم';
COMMENT ON COLUMN public.staff_evaluations.scores                        IS 'درجات تفصيلية حسب بنود الاستمارة — بنيتها تختلف حسب نوع المنصب';
COMMENT ON COLUMN public.staff_evaluations.percentage                    IS 'النسبة المئوية — تُحسب في Service Layer: (total_score / max_score) * 100';

-- ============================================================
-- Indexes
-- ============================================================

-- لوحة المدير: تقييمات المدرسة مرتبة بالحالة
CREATE INDEX IF NOT EXISTS idx_se_school_status
    ON public.staff_evaluations (school_id, status);

-- للموظف: عرض تقييماته الخاصة
CREATE INDEX IF NOT EXISTS idx_se_evaluatee_year
    ON public.staff_evaluations (evaluatee_persona_id, academic_year);

-- للتقارير السنوية
CREATE INDEX IF NOT EXISTS idx_se_school_year
    ON public.staff_evaluations (school_id, academic_year);

-- للبحث عن سجلات مرتبطة بـ workflow instance
CREATE INDEX IF NOT EXISTS idx_se_workflow_instance
    ON public.staff_evaluations (workflow_instance_id)
    WHERE workflow_instance_id IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.staff_evaluations ENABLE ROW LEVEL SECURITY;

-- SELECT: الموظف المُقيَّم + المُقيِّم + الإدارة + system_owner
DROP POLICY IF EXISTS "se_select" ON public.staff_evaluations;
CREATE POLICY "se_select" ON public.staff_evaluations
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (
                -- الموظف المُقيَّم يمكنه رؤية تقييمه الخاص
                evaluatee_persona_id IN (
                    SELECT up.id
                    FROM   public.user_personas up
                    WHERE  up.user_id   = auth.uid()
                      AND  up.school_id = get_my_school_id()
                )
                -- أو المُقيِّم نفسه
                OR evaluator_persona_id IN (
                    SELECT up.id
                    FROM   public.user_personas up
                    WHERE  up.user_id   = auth.uid()
                      AND  up.school_id = get_my_school_id()
                )
                -- أو الإدارة
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                    'school_principal',
                    'school_admin',
                    'quality_coordinator'
                )
            )
        )
    );

-- INSERT: المدير (المُقيِّم الطبيعي)
DROP POLICY IF EXISTS "se_insert" ON public.staff_evaluations;
CREATE POLICY "se_insert" ON public.staff_evaluations
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal',
            'school_admin'
        )
    );

-- UPDATE: المدير (لإدخال النتائج) + السكرتارية (للحفظ الرسمي) + الموظف المُقيَّم (للإقرار)
DROP POLICY IF EXISTS "se_update" ON public.staff_evaluations;
CREATE POLICY "se_update" ON public.staff_evaluations
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            -- الموظف المُقيَّم للإقرار فقط
            evaluatee_persona_id IN (
                SELECT up.id
                FROM   public.user_personas up
                WHERE  up.user_id   = auth.uid()
                  AND  up.school_id = get_my_school_id()
            )
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_principal',
                'school_admin',
                'school_secretary'
            )
        )
    );

-- لا DELETE policy

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'staff_evaluations'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول staff_evaluations لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'staff_evaluations'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على staff_evaluations';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE  schemaname = 'public'
          AND  tablename  = 'staff_evaluations'
          AND  indexname  = 'idx_se_school_status'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: idx_se_school_status غير موجود';
    END IF;

    RAISE NOTICE '✓ staff_evaluations أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT + UPDATE)';
    RAISE NOTICE '✓ idx_se_school_status موجود';
    RAISE NOTICE '✓ Migration 44 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS
--   DROP POLICY IF EXISTS "se_select" ON public.staff_evaluations;
--   DROP POLICY IF EXISTS "se_insert" ON public.staff_evaluations;
--   DROP POLICY IF EXISTS "se_update" ON public.staff_evaluations;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.staff_evaluations DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.staff_evaluations;
