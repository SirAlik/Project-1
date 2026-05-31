-- =================================================================
-- Migration 54: Layer 7 — جدول bulk_upload_jobs
-- التاريخ: 2026-05-27
-- الهدف: تتبع مهام الرفع المجمّع (CSV) مع دعم workflow الموافقة
-- =================================================================
-- يدعم أنواع الرفع: student_enrollment
-- التدفق: uploaded → validated → processing → completed / failed
-- التبعيات: schools ✅ · user_personas ✅ · workflow_instances ✅
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'workflow_instances'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: workflow_instances غير موجود — طبّق M39 أولاً';
    END IF;
    RAISE NOTICE 'Preflight نجح';
END $$;

-- ============================================================
-- إنشاء الجدول
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bulk_upload_jobs (
    id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                 uuid        NOT NULL REFERENCES public.schools(id),
    workflow_instance_id      uuid        REFERENCES public.workflow_instances(id),

    -- معرّف المهمة ونوعها
    job_type                  text        NOT NULL
                              CHECK (job_type IN ('student_enrollment')),
    job_number                text        NOT NULL,
    file_name                 text        NOT NULL,

    -- نتائج التحقق من الصحة
    validation_summary        jsonb,       -- { total_rows, valid_rows, error_rows, errors[] }
    parsed_rows               jsonb,       -- الصفوف الصحيحة الجاهزة للمعالجة

    -- تتبع التقدم
    total_rows                int         NOT NULL DEFAULT 0,
    processed_rows            int         NOT NULL DEFAULT 0,
    error_log                 jsonb       NOT NULL DEFAULT '[]',

    -- المُحمِّل
    uploaded_by_persona_id    uuid        NOT NULL REFERENCES public.user_personas(id),
    uploaded_by_name_snapshot text        NOT NULL,

    -- الموافق (اختياري — عند مسار الموافقة)
    approved_by_persona_id    uuid        REFERENCES public.user_personas(id),
    approved_by_name_snapshot text,
    approved_at               timestamptz,

    -- الحالة
    status                    text        NOT NULL DEFAULT 'uploaded'
                              CHECK (status IN (
                                  'uploaded',
                                  'validated',
                                  'validation_failed',
                                  'awaiting_approval',
                                  'processing',
                                  'completed',
                                  'failed',
                                  'rejected'
                              )),

    notes                     text,
    created_at                timestamptz NOT NULL DEFAULT now(),
    completed_at              timestamptz
);

COMMENT ON TABLE  public.bulk_upload_jobs                   IS 'Layer 7: مهام الرفع المجمّع بـ CSV';
COMMENT ON COLUMN public.bulk_upload_jobs.parsed_rows       IS 'الصفوف الصحيحة بعد التحقق — jsonb array — max 1000 صف';
COMMENT ON COLUMN public.bulk_upload_jobs.validation_summary IS '{ total_rows, valid_rows, error_rows, errors: [{row,column,message}] }';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_buj_school_status
    ON public.bulk_upload_jobs (school_id, status);

CREATE INDEX IF NOT EXISTS idx_buj_uploader
    ON public.bulk_upload_jobs (uploaded_by_persona_id);

CREATE INDEX IF NOT EXISTS idx_buj_school_created
    ON public.bulk_upload_jobs (school_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: كل موظفي المدرسة + system_owner
DROP POLICY IF EXISTS "buj_select" ON public.bulk_upload_jobs;
CREATE POLICY "buj_select" ON public.bulk_upload_jobs
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: المدير الإداري / السكرتير / مدير المدرسة
DROP POLICY IF EXISTS "buj_insert" ON public.bulk_upload_jobs;
CREATE POLICY "buj_insert" ON public.bulk_upload_jobs
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal', 'school_admin', 'school_secretary', 'system_owner'
        )
    );

-- UPDATE: نفس الأدوار فقط
DROP POLICY IF EXISTS "buj_update" ON public.bulk_upload_jobs;
CREATE POLICY "buj_update" ON public.bulk_upload_jobs
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal', 'school_admin', 'school_secretary', 'system_owner'
        )
    );

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bulk_upload_jobs'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول bulk_upload_jobs لم يُنشأ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'bulk_upload_jobs' AND c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل';
    END IF;

    RAISE NOTICE '✓ bulk_upload_jobs أُنشئ بنجاح';
    RAISE NOTICE '✓ Migration 54 (Layer 7) اكتمل';
END $$;

COMMIT;
