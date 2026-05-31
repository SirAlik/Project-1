-- =================================================================
-- Migration 42: Layer 6 — جدول nonconformance_reports
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول nonconformance_reports — كيان عدم المطابقة الموضوعي
--   الخاص بـ workflow CORRECTIVE_ACTION (ISO 9001:2015 بند 10.2).
--   يمثّل السجل الدائم لكل حالة عدم مطابقة مُكتشفة داخل المدرسة.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول nonconformance_reports مع FK اختياري لـ workflow_instances
--   2. Indexes
--   3. RLS: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39) — user_personas ✅ — schools ✅
-- الجدول التالي: Migration 43 → hr_accountability_tickets
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
-- إنشاء جدول nonconformance_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nonconformance_reports (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                   uuid        NOT NULL REFERENCES public.schools(id),

    -- رابط اختياري بـ workflow instance — يُعيَّن عند إطلاق دورة الإجراء التصحيحي
    workflow_instance_id        uuid,

    -- تعريف التقرير
    report_number               text        NOT NULL,
    iso_clause                  text,
    source                      text        NOT NULL
                                CHECK (source IN (
                                    'internal_audit',
                                    'external_audit',
                                    'management_review',
                                    'complaint',
                                    'observation',
                                    'other'
                                )),
    description                 text        NOT NULL,

    -- المكتشِف
    detected_by_persona_id      uuid        REFERENCES public.user_personas(id),
    detected_by_name_snapshot   text,
    detected_at                 timestamptz NOT NULL DEFAULT now(),

    -- تحليل السبب الجذري وخطة التصحيح — تُملأ أثناء دورة الـ workflow
    root_cause                  text,
    corrective_action_plan      text,
    evidence_attachments        text[]      NOT NULL DEFAULT '{}',

    -- التحقق من الفعالية — تُكتب عند إغلاق الـ workflow
    verification_result         text        CHECK (
                                    verification_result IN ('effective', 'ineffective')
                                    OR verification_result IS NULL
                                ),
    verified_by_persona_id      uuid        REFERENCES public.user_personas(id),
    verified_by_name_snapshot   text,
    verified_at                 timestamptz,

    -- الحالة
    status                      text        NOT NULL DEFAULT 'open'
                                CHECK (status IN (
                                    'open',
                                    'in_progress',
                                    'awaiting_verification',
                                    'closed_effective',
                                    'closed_ineffective',
                                    'cancelled'
                                )),

    created_at                  timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: يضمن تطابق school_id مع workflow_instance المرجعي
    -- NULL في workflow_instance_id يعطّل التحقق (سلوك FK المعياري في PostgreSQL)
    CONSTRAINT fk_ncr_workflow FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- رقم التقرير فريد داخل كل مدرسة
    CONSTRAINT ncr_number_school_unique UNIQUE (school_id, report_number),

    -- إذا verified_at موجودة → جميع حقول التحقق يجب أن تكون موجودة والعكس صحيح
    CONSTRAINT verification_consistency CHECK (
        (
            verified_at                IS NULL
            AND verified_by_persona_id   IS NULL
            AND verified_by_name_snapshot IS NULL
            AND verification_result      IS NULL
        )
        OR (
            verified_at                IS NOT NULL
            AND verified_by_persona_id   IS NOT NULL
            AND verified_by_name_snapshot IS NOT NULL
            AND verification_result      IS NOT NULL
        )
    )
);

COMMENT ON TABLE  public.nonconformance_reports                                IS 'Layer 6: سجل عدم المطابقة — الكيان الموضوعي لـ CORRECTIVE_ACTION workflow (ISO 10.2)';
COMMENT ON COLUMN public.nonconformance_reports.workflow_instance_id           IS 'FK اختياري — NULL حتى يُطلق منسق الجودة دورة الإجراء التصحيحي';
COMMENT ON COLUMN public.nonconformance_reports.evidence_attachments           IS 'مسارات مرفقات الأدلة في Supabase Storage';
COMMENT ON COLUMN public.nonconformance_reports.verification_result            IS 'نتيجة التحقق من الفعالية — تُكتب عند إغلاق الـ workflow من المنسق';

-- ============================================================
-- Indexes
-- ============================================================

-- للوحة رصد منسق الجودة (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_ncr_school_status
    ON public.nonconformance_reports (school_id, status);

-- للتقارير الزمنية
CREATE INDEX IF NOT EXISTS idx_ncr_school_created
    ON public.nonconformance_reports (school_id, created_at DESC);

-- للبحث عن سجلات مرتبطة بـ workflow instance محدد
CREATE INDEX IF NOT EXISTS idx_ncr_workflow_instance
    ON public.nonconformance_reports (workflow_instance_id)
    WHERE workflow_instance_id IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.nonconformance_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: جميع موظفي المدرسة (الشفافية داخل المدرسة) + system_owner
DROP POLICY IF EXISTS "ncr_select" ON public.nonconformance_reports;
CREATE POLICY "ncr_select" ON public.nonconformance_reports
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: منسق الجودة + المدير الإداري (في حالات استثنائية)
DROP POLICY IF EXISTS "ncr_insert" ON public.nonconformance_reports;
CREATE POLICY "ncr_insert" ON public.nonconformance_reports
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_principal',
            'school_admin'
        )
    );

-- UPDATE: منسق الجودة + المدير + مدير المدرسة
DROP POLICY IF EXISTS "ncr_update" ON public.nonconformance_reports;
CREATE POLICY "ncr_update" ON public.nonconformance_reports
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_principal',
            'school_admin'
        )
    );

-- لا DELETE policy — تقارير عدم المطابقة لا تُحذف (سجل أثري دائم)

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'nonconformance_reports'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول nonconformance_reports لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'nonconformance_reports'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على nonconformance_reports';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE  schemaname = 'public'
          AND  tablename  = 'nonconformance_reports'
          AND  indexname  = 'idx_ncr_school_status'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: idx_ncr_school_status غير موجود';
    END IF;

    RAISE NOTICE '✓ nonconformance_reports أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT + UPDATE)';
    RAISE NOTICE '✓ idx_ncr_school_status موجود';
    RAISE NOTICE '✓ Migration 42 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS
--   DROP POLICY IF EXISTS "ncr_select" ON public.nonconformance_reports;
--   DROP POLICY IF EXISTS "ncr_insert" ON public.nonconformance_reports;
--   DROP POLICY IF EXISTS "ncr_update" ON public.nonconformance_reports;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.nonconformance_reports DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.nonconformance_reports;
