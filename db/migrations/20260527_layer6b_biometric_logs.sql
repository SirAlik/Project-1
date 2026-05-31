-- =================================================================
-- Migration 47: Layer 6b — جدول biometric_logs
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول biometric_logs — سجلات البصمة الخام من الأجهزة.
--   يُغذّي staff_attendance_logs بعد المعالجة.
--
--   الجهاز يُرسل: device_id + raw_employee_id (رقم وزارة) + punch_time + punch_type
--   النظام يُطابق raw_employee_id مع user_personas عبر biometric_device_mappings (مستقبلاً)
--   أو يتركه NULL لمعالجة يدوية لاحقة.
--
-- يتضمن هذا الـ migration:
--   1. جدول biometric_logs مع UNIQUE(device_id, raw_employee_id, punch_time)
--   2. FK عكسي: staff_attendance_logs.biometric_log_id → biometric_logs(id)
--   3. Indexes
--   4. RLS: قراءة للإدارة فقط — الكتابة عبر webhook (service role)
--
-- التبعيات: staff_attendance_logs ✅ (M46) — schools ✅ — get_my_school_id() ✅
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'staff_attendance_logs'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: staff_attendance_logs غير موجود — طبّق Migration 46 أولاً';
    END IF;

    RAISE NOTICE 'Preflight نجح: staff_attendance_logs موجود';
END $$;

-- ============================================================
-- إنشاء جدول biometric_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.biometric_logs (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           uuid        NOT NULL REFERENCES public.schools(id),

    -- بيانات الجهاز
    device_id           text        NOT NULL,   -- معرّف الجهاز المادي
    raw_employee_id     text        NOT NULL,   -- ID كما أرسله الجهاز (رقم وزارة أو بطاقة)

    -- الموظف المُطابَق (يُملأ بعد المطابقة مع user_personas)
    persona_id          uuid        REFERENCES public.user_personas(id),

    -- بيانات البصمة
    punch_time          timestamptz NOT NULL,
    punch_type          text        NOT NULL DEFAULT 'unknown'
                        CHECK (punch_type IN ('in','out','unknown')),

    -- الحمولة الخام من الجهاز (للمرجعية والتصحيح)
    raw_payload         jsonb,

    -- حالة المعالجة
    processed           boolean     NOT NULL DEFAULT false,
    processed_at        timestamptz,
    attendance_log_id   uuid        REFERENCES public.staff_attendance_logs(id),
    processing_error    text,

    created_at          timestamptz NOT NULL DEFAULT now(),

    -- منع تكرار نفس البصمة من نفس الجهاز لنفس الموظف في نفس اللحظة
    CONSTRAINT bio_unique_punch UNIQUE (device_id, raw_employee_id, punch_time)
);

COMMENT ON TABLE  public.biometric_logs                  IS 'Layer 6b: سجلات البصمة الخام من أجهزة الحضور — للاستخدام الداخلي عبر Webhook فقط';
COMMENT ON COLUMN public.biometric_logs.raw_employee_id  IS 'المعرّف كما أرسله الجهاز (رقم وزارة أو رقم بطاقة) — يُطابَق مع user_personas لاحقاً';
COMMENT ON COLUMN public.biometric_logs.persona_id       IS 'يُملأ بعد مطابقة raw_employee_id مع user_personas';
COMMENT ON COLUMN public.biometric_logs.processed        IS 'true بعد تحويل البصمة لسجل في staff_attendance_logs';

-- ============================================================
-- FK عكسي: staff_attendance_logs.biometric_log_id → biometric_logs(id)
-- (لم يكن ممكناً في Migration 46 لأن biometric_logs لم يكن موجوداً)
-- ============================================================
ALTER TABLE public.staff_attendance_logs
    ADD CONSTRAINT fk_sal_biometric_log
    FOREIGN KEY (biometric_log_id) REFERENCES public.biometric_logs(id);

-- ============================================================
-- Indexes
-- ============================================================
-- للاستعلام عن سجلات غير معالجة (webhook processor)
CREATE INDEX IF NOT EXISTS idx_bio_unprocessed
    ON public.biometric_logs (school_id, punch_time)
    WHERE processed = false;

-- لتاريخ موظف محدد (بعد حل persona_id)
CREATE INDEX IF NOT EXISTS idx_bio_persona_time
    ON public.biometric_logs (persona_id, punch_time DESC)
    WHERE persona_id IS NOT NULL;

-- للإدارة: عرض سجلات جهاز معين
CREATE INDEX IF NOT EXISTS idx_bio_device_time
    ON public.biometric_logs (device_id, punch_time DESC);

CREATE INDEX IF NOT EXISTS idx_bio_school_time
    ON public.biometric_logs (school_id, punch_time DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.biometric_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: الإدارة + السكرتارية + system_owner فقط (بيانات خام حساسة)
DROP POLICY IF EXISTS "bio_select" ON public.biometric_logs;
CREATE POLICY "bio_select" ON public.biometric_logs
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_principal',
                'school_admin',
                'school_secretary'
            )
        )
    );

-- INSERT: عبر service role (Webhook API) — RLS لا تمنع service role
-- المستخدمون العاديون لا يُدخلون سجلات يدوياً
DROP POLICY IF EXISTS "bio_insert" ON public.biometric_logs;
CREATE POLICY "bio_insert" ON public.biometric_logs
    FOR INSERT
    WITH CHECK (school_id = get_my_school_id());

-- لا UPDATE — لا DELETE (سجلات خام غير قابلة للتعديل)

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    _rls_active boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'biometric_logs'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول biometric_logs لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname = 'biometric_logs' AND relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على biometric_logs';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE  table_schema    = 'public'
          AND  table_name      = 'staff_attendance_logs'
          AND  constraint_name = 'fk_sal_biometric_log'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: FK fk_sal_biometric_log لم يُضَف';
    END IF;

    RAISE NOTICE '✓ biometric_logs أُنشئ بنجاح';
    RAISE NOTICE '✓ fk_sal_biometric_log أُضيف لـ staff_attendance_logs';
    RAISE NOTICE '✓ RLS مُفعّل';
    RAISE NOTICE '✓ Migration 47 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL
-- ============================================================
-- ALTER TABLE public.staff_attendance_logs DROP CONSTRAINT IF EXISTS fk_sal_biometric_log;
-- DROP TABLE IF EXISTS public.biometric_logs;
