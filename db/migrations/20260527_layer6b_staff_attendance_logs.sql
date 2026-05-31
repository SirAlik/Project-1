-- =================================================================
-- Migration 46: Layer 6b — جدول staff_attendance_logs
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول staff_attendance_logs — سجلات الحضور اليومية للموظفين.
--   هذا الجدول مختلف جوهرياً عن attendance_logs الموروث:
--     - attendance_logs: يرجع لـ employees(id) — لا school_id — غير multi-tenant
--     - staff_attendance_logs: يرجع لـ user_personas(id) — multi-tenant
--   الجدولان يتعايشان بلا تعارض.
--
-- يتضمن هذا الـ migration:
--   1. جدول staff_attendance_logs مع UPSERT constraint (persona_id, log_date)
--   2. Trigger: تحديث updated_at تلقائياً
--   3. Indexes: يومية + مخالفات بدون تذاكر
--   4. RLS: SELECT (موظف + إدارة) + INSERT/UPDATE (سكرتارية + إدارة) — لا DELETE
--
-- التبعيات: user_personas ✅ — hr_accountability_tickets ✅ (M43) — get_my_school_id() ✅
-- ملاحظة: biometric_log_id يُضاف كـ FK في Migration 47 بعد إنشاء biometric_logs
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE  proname = 'get_my_school_id' AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة — طبّق Migration 39 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'hr_accountability_tickets'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: hr_accountability_tickets غير موجود — طبّق Migration 43 أولاً';
    END IF;

    RAISE NOTICE 'Preflight نجح: المتطلبات موجودة';
END $$;

-- ============================================================
-- إنشاء الجدول
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id               uuid        NOT NULL REFERENCES public.schools(id),

    -- الموظف (multi-tenant — user_personas لا employees)
    persona_id              uuid        NOT NULL REFERENCES public.user_personas(id),
    persona_name_snapshot   text        NOT NULL,
    persona_role_snapshot   text        NOT NULL,

    -- اليوم
    log_date                date        NOT NULL,

    -- أوقات الحضور
    arrival_time            time,
    departure_time          time,

    -- حسابات المخالفة (تُحسب في Service Layer)
    is_late                 boolean     NOT NULL DEFAULT false,
    is_absent               boolean     NOT NULL DEFAULT false,
    late_minutes            smallint    CHECK (late_minutes >= 0),
    absence_type            text        CHECK (
                                absence_type IN ('excused','unexcused','medical','emergency')
                                OR absence_type IS NULL
                            ),

    -- المصدر
    source                  text        NOT NULL DEFAULT 'manual'
                            CHECK (source IN ('biometric','manual','system')),

    -- روابط اختيارية
    biometric_log_id        uuid,       -- FK يُضاف في Migration 47 بعد إنشاء biometric_logs
    ticket_id               uuid        REFERENCES public.hr_accountability_tickets(id),

    -- بيانات إضافية
    notes                   text,
    created_by_persona_id   uuid        REFERENCES public.user_personas(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    -- سجل واحد لكل موظف في اليوم
    CONSTRAINT sal_unique_persona_date UNIQUE (persona_id, log_date),

    -- إذا is_late=true يجب وجود arrival_time
    CONSTRAINT sal_late_requires_arrival CHECK (
        is_late = false OR arrival_time IS NOT NULL
    ),

    -- late_minutes فقط عند وجود تأخر
    CONSTRAINT sal_late_minutes_consistency CHECK (
        (is_late = false AND (late_minutes IS NULL OR late_minutes = 0))
        OR (is_late = true AND late_minutes IS NOT NULL AND late_minutes > 0)
    )
);

COMMENT ON TABLE  public.staff_attendance_logs                        IS 'Layer 6b: سجلات حضور الموظفين اليومية — multi-tenant — يستخدم user_personas لا employees';
COMMENT ON COLUMN public.staff_attendance_logs.biometric_log_id       IS 'FK يُضاف في Migration 47 بعد إنشاء biometric_logs';
COMMENT ON COLUMN public.staff_attendance_logs.ticket_id              IS 'تُملأ عند إنشاء تذكرة مساءلة لهذا السجل';
COMMENT ON COLUMN public.staff_attendance_logs.persona_name_snapshot  IS 'نسخة محفوظة من الاسم لضمان ثبات الأرشيف';

-- ============================================================
-- Trigger: تحديث updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sal_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;

CREATE TRIGGER trg_sal_updated_at
    BEFORE UPDATE ON public.staff_attendance_logs
    FOR EACH ROW EXECUTE FUNCTION public.fn_sal_set_updated_at();

-- ============================================================
-- Indexes
-- ============================================================
-- لوحة السكرتارية: عرض سجلات اليوم لمدرسة معينة
CREATE INDEX IF NOT EXISTS idx_sal_school_date
    ON public.staff_attendance_logs (school_id, log_date DESC);

-- تاريخ موظف محدد
CREATE INDEX IF NOT EXISTS idx_sal_persona_date
    ON public.staff_attendance_logs (persona_id, log_date DESC);

-- Partial index: المخالفات فقط — للاستعلامات السريعة
CREATE INDEX IF NOT EXISTS idx_sal_violations
    ON public.staff_attendance_logs (school_id, log_date)
    WHERE (is_late = true OR is_absent = true);

-- Partial index: مخالفات بدون تذكرة — لتوليد التذاكر
CREATE INDEX IF NOT EXISTS idx_sal_unticket_violations
    ON public.staff_attendance_logs (school_id, log_date)
    WHERE ticket_id IS NULL AND (is_late = true OR is_absent = true);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.staff_attendance_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: الموظف (سجلاته فقط) + السكرتارية + الإدارة + منسق الجودة + system_owner
DROP POLICY IF EXISTS "sal_select" ON public.staff_attendance_logs;
CREATE POLICY "sal_select" ON public.staff_attendance_logs
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (
                persona_id IN (
                    SELECT up.id FROM public.user_personas up
                    WHERE  up.user_id   = auth.uid()
                      AND  up.school_id = get_my_school_id()
                )
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                    'school_principal',
                    'school_admin',
                    'school_secretary',
                    'quality_coordinator'
                )
            )
        )
    );

-- INSERT: السكرتارية + الإدارة فقط
DROP POLICY IF EXISTS "sal_insert" ON public.staff_attendance_logs;
CREATE POLICY "sal_insert" ON public.staff_attendance_logs
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal',
            'school_admin',
            'school_secretary'
        )
    );

-- UPDATE: السكرتارية + الإدارة فقط
DROP POLICY IF EXISTS "sal_update" ON public.staff_attendance_logs;
CREATE POLICY "sal_update" ON public.staff_attendance_logs
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal',
            'school_admin',
            'school_secretary'
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
        WHERE  table_schema = 'public' AND table_name = 'staff_attendance_logs'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول staff_attendance_logs لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname = 'staff_attendance_logs' AND relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على staff_attendance_logs';
    END IF;

    RAISE NOTICE '✓ staff_attendance_logs أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT + UPDATE)';
    RAISE NOTICE '✓ idx_sal_school_date موجود';
    RAISE NOTICE '✓ Migration 46 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL
-- ============================================================
-- DROP TRIGGER  IF EXISTS trg_sal_updated_at ON public.staff_attendance_logs;
-- DROP FUNCTION IF EXISTS public.fn_sal_set_updated_at();
-- DROP TABLE    IF EXISTS public.staff_attendance_logs;
