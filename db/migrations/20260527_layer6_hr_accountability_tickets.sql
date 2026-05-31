-- =================================================================
-- Migration 43: Layer 6 — جدول hr_accountability_tickets
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدول hr_accountability_tickets — تذاكر مساءلة الحضور
--   الخاصة بـ workflow HR_ATTENDANCE.
--
--   ملاحظة معمارية:
--   هذا الجدول يختلف جوهرياً عن جدول hr_inquiries الموروث:
--   - hr_inquiries: لا school_id — يرجع لـ employees(id) — غير multi-tenant
--   - hr_accountability_tickets: multi-tenant — يرجع لـ user_personas(id)
--   الجدولان يتعايشان بلا تعارض: hr_inquiries للوحدة القديمة،
--   hr_accountability_tickets لـ workflow Layer 5.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول hr_accountability_tickets مع FK اختياري لـ workflow_instances
--   2. Indexes
--   3. RLS: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39) — user_personas ✅ — schools ✅
-- الجدول التالي: Migration 44 → staff_evaluations
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
-- إنشاء جدول hr_accountability_tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hr_accountability_tickets (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                   uuid        NOT NULL REFERENCES public.schools(id),

    -- رابط اختياري بـ workflow instance
    workflow_instance_id        uuid,

    -- تعريف التذكرة
    ticket_number               text        NOT NULL,
    violation_type              text        NOT NULL
                                CHECK (violation_type IN (
                                    'late',
                                    'absence',
                                    'early_departure',
                                    'other'
                                )),
    violation_date              date        NOT NULL,
    violation_details           text,
    supporting_evidence         text[]      NOT NULL DEFAULT '{}',

    -- الموظف المحاسَب
    employee_persona_id         uuid        REFERENCES public.user_personas(id),
    employee_name_snapshot      text        NOT NULL,
    employee_role_snapshot      text        NOT NULL,

    -- رد الموظف — يُملأ في حالة awaiting_response
    employee_response           text,
    employee_responded_at       timestamptz,

    -- قرار المدير — يُملأ في حالة awaiting_decision
    principal_decision          text        CHECK (
                                    principal_decision IN (
                                        'justified',
                                        'not_justified',
                                        'deduction',
                                        'warning',
                                        'dismissed'
                                    ) OR principal_decision IS NULL
                                ),
    principal_notes             text,
    decided_by_persona_id       uuid        REFERENCES public.user_personas(id),
    decided_by_name_snapshot    text,
    decided_at                  timestamptz,

    -- الحالة
    status                      text        NOT NULL DEFAULT 'open'
                                CHECK (status IN (
                                    'open',
                                    'awaiting_response',
                                    'awaiting_decision',
                                    'decided',
                                    'archived',
                                    'cancelled'
                                )),

    -- المُنشئ
    created_by_persona_id       uuid        NOT NULL REFERENCES public.user_personas(id),
    created_by_name_snapshot    text        NOT NULL,
    created_at                  timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: يضمن تطابق school_id
    CONSTRAINT fk_hat_workflow FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- رقم التذكرة فريد داخل كل مدرسة
    CONSTRAINT hat_number_school_unique UNIQUE (school_id, ticket_number),

    -- إذا decided_at موجودة → جميع حقول القرار يجب أن تكون موجودة والعكس صحيح
    CONSTRAINT hat_decision_consistency CHECK (
        (
            decided_at                 IS NULL
            AND decided_by_persona_id    IS NULL
            AND decided_by_name_snapshot IS NULL
            AND principal_decision       IS NULL
        )
        OR (
            decided_at                 IS NOT NULL
            AND decided_by_persona_id    IS NOT NULL
            AND decided_by_name_snapshot IS NOT NULL
            AND principal_decision       IS NOT NULL
        )
    )
);

COMMENT ON TABLE  public.hr_accountability_tickets                             IS 'Layer 6: تذاكر مساءلة الحضور — الكيان الموضوعي لـ HR_ATTENDANCE workflow';
COMMENT ON COLUMN public.hr_accountability_tickets.workflow_instance_id        IS 'FK اختياري — يُعيَّن عند إطلاق دورة المساءلة';
COMMENT ON COLUMN public.hr_accountability_tickets.employee_persona_id         IS 'الموظف المحاسَب — يرجع لـ user_personas لا employees (multi-tenant)';
COMMENT ON COLUMN public.hr_accountability_tickets.supporting_evidence         IS 'مسارات الأدلة الداعمة (صور، تقارير) في Supabase Storage';

-- ============================================================
-- Indexes
-- ============================================================

-- للوحة السكرتارية (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_hat_school_status
    ON public.hr_accountability_tickets (school_id, status);

-- للبحث عن تذاكر موظف محدد
CREATE INDEX IF NOT EXISTS idx_hat_employee_status
    ON public.hr_accountability_tickets (employee_persona_id, status);

-- للتقارير الزمنية
CREATE INDEX IF NOT EXISTS idx_hat_school_date
    ON public.hr_accountability_tickets (school_id, violation_date DESC);

-- للبحث عن سجلات مرتبطة بـ workflow instance
CREATE INDEX IF NOT EXISTS idx_hat_workflow_instance
    ON public.hr_accountability_tickets (workflow_instance_id)
    WHERE workflow_instance_id IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.hr_accountability_tickets ENABLE ROW LEVEL SECURITY;

-- SELECT: الموظف المحاسَب + الأدوار الإدارية + system_owner
DROP POLICY IF EXISTS "hat_select" ON public.hr_accountability_tickets;
CREATE POLICY "hat_select" ON public.hr_accountability_tickets
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (
                -- الموظف المحاسَب يمكنه رؤية تذكرته الخاصة
                employee_persona_id IN (
                    SELECT up.id
                    FROM   public.user_personas up
                    WHERE  up.user_id   = auth.uid()
                      AND  up.school_id = get_my_school_id()
                )
                -- أو الأدوار الإدارية المختصة
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                    'school_secretary',
                    'school_principal',
                    'school_admin',
                    'quality_coordinator'
                )
            )
        )
    );

-- INSERT: السكرتارية (المُنشئ الطبيعي للتذاكر) + الإدارة
DROP POLICY IF EXISTS "hat_insert" ON public.hr_accountability_tickets;
CREATE POLICY "hat_insert" ON public.hr_accountability_tickets
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_secretary',
            'school_principal',
            'school_admin'
        )
    );

-- UPDATE: الموظف (لإضافة رده) + السكرتارية والإدارة (لتحديث الحالة والقرار)
DROP POLICY IF EXISTS "hat_update" ON public.hr_accountability_tickets;
CREATE POLICY "hat_update" ON public.hr_accountability_tickets
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            employee_persona_id IN (
                SELECT up.id
                FROM   public.user_personas up
                WHERE  up.user_id   = auth.uid()
                  AND  up.school_id = get_my_school_id()
            )
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_secretary',
                'school_principal',
                'school_admin'
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
        WHERE  table_schema = 'public' AND table_name = 'hr_accountability_tickets'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول hr_accountability_tickets لم يُنشأ';
    END IF;

    SELECT relrowsecurity INTO _rls_active
    FROM   pg_class
    WHERE  relname      = 'hr_accountability_tickets'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_active THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على hr_accountability_tickets';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE  schemaname = 'public'
          AND  tablename  = 'hr_accountability_tickets'
          AND  indexname  = 'idx_hat_school_status'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: idx_hat_school_status غير موجود';
    END IF;

    RAISE NOTICE '✓ hr_accountability_tickets أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل (SELECT + INSERT + UPDATE)';
    RAISE NOTICE '✓ idx_hat_school_status موجود';
    RAISE NOTICE '✓ Migration 43 اكتمل بنجاح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS
--   DROP POLICY IF EXISTS "hat_select" ON public.hr_accountability_tickets;
--   DROP POLICY IF EXISTS "hat_insert" ON public.hr_accountability_tickets;
--   DROP POLICY IF EXISTS "hat_update" ON public.hr_accountability_tickets;
--
-- الخطوة 2: تعطيل RLS
--   ALTER TABLE public.hr_accountability_tickets DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 3: حذف الجدول (بدون CASCADE)
--   DROP TABLE IF EXISTS public.hr_accountability_tickets;
