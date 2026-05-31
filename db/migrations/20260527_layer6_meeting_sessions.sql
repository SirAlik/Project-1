-- =================================================================
-- Migration 45: Layer 6 — جدولا meeting_sessions + meeting_session_attendees
-- التاريخ: 2026-05-27
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   إنشاء جدولَي الاجتماع الخاصَّين بـ workflow MEETING:
--   • meeting_sessions      — بيانات الاجتماع والمحضر
--   • meeting_session_attendees — الحضور ووقت التوقيع
--
--   ملاحظة معمارية:
--   هذان الجدولان يختلفان عن جدول meetings الموروث:
--   - meetings: لا school_id — يرجع لـ employees(id) — غير multi-tenant
--   - meeting_sessions: multi-tenant — يرجع لـ user_personas(id)
--   الجدولان يتعايشان بلا تعارض في الاسم.
--
-- يتضمن هذا الـ migration:
--   1. إنشاء جدول meeting_sessions مع FK اختياري لـ workflow_instances
--   2. إنشاء جدول meeting_session_attendees مع composite FK
--   3. Indexes على الجدولين
--   4. RLS على الجدولين: SELECT + INSERT + UPDATE — لا DELETE
--
-- التبعيات: workflow_instances ✅ (Migration 39) — user_personas ✅ — schools ✅
-- آخر جدول في Layer 6 Core
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
-- إنشاء جدول meeting_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id               uuid        NOT NULL REFERENCES public.schools(id),

    -- رابط اختياري بـ workflow instance
    workflow_instance_id    uuid,

    -- تعريف الاجتماع
    session_number          text        NOT NULL,
    title                   text        NOT NULL,
    meeting_type            text        NOT NULL
                            CHECK (meeting_type IN (
                                'regular',
                                'emergency',
                                'specialized',
                                'management_review',
                                'other'
                            )),

    -- التوقيت المجدول
    scheduled_date          date        NOT NULL,
    start_time              time        NOT NULL,
    end_time                time,

    -- التوقيت الفعلي — يُملأ عند الانتهاء
    actual_start_time       timestamptz,
    actual_end_time         timestamptz,

    location                text,

    -- المنظِّم
    organizer_persona_id    uuid        NOT NULL REFERENCES public.user_personas(id),
    organizer_name_snapshot text        NOT NULL,

    -- محتوى الاجتماع
    agenda_items            jsonb       NOT NULL DEFAULT '[]',
    minutes                 text,
    decisions               jsonb       NOT NULL DEFAULT '[]',
    recommendations         jsonb       NOT NULL DEFAULT '[]',
    attachments             text[]      NOT NULL DEFAULT '{}',

    -- الحالة
    status                  text        NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN (
                                'scheduled',
                                'in_progress',
                                'ended',
                                'awaiting_signatures',
                                'minutes_signed',
                                'cancelled'
                            )),

    created_at              timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: يضمن تطابق school_id مع workflow_instance
    CONSTRAINT fk_ms_workflow FOREIGN KEY (workflow_instance_id, school_id)
        REFERENCES public.workflow_instances (id, school_id),

    -- رقم الجلسة فريد داخل كل مدرسة
    CONSTRAINT ms_number_school_unique UNIQUE (school_id, session_number),

    -- UNIQUE(id, school_id) لدعم composite FK من meeting_session_attendees
    UNIQUE (id, school_id),

    -- وقت الانتهاء يجب أن يكون بعد وقت البداية
    CONSTRAINT ms_time_order_valid CHECK (
        end_time IS NULL OR end_time > start_time
    )
);

COMMENT ON TABLE  public.meeting_sessions                            IS 'Layer 6: جلسات الاجتماع — الكيان الموضوعي لـ MEETING workflow';
COMMENT ON COLUMN public.meeting_sessions.workflow_instance_id      IS 'FK اختياري — يُعيَّن عند ربط الاجتماع بدورة workflow';
COMMENT ON COLUMN public.meeting_sessions.agenda_items              IS 'بنود جدول الأعمال كـ JSON array';
COMMENT ON COLUMN public.meeting_sessions.decisions                 IS 'القرارات المتخذة كـ JSON array';
COMMENT ON COLUMN public.meeting_sessions.recommendations           IS 'التوصيات كـ JSON array';

-- ============================================================
-- إنشاء جدول meeting_session_attendees
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_session_attendees (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Composite FK: يضمن تطابق school_id مع meeting_sessions
    meeting_session_id  uuid        NOT NULL,
    school_id           uuid        NOT NULL,

    -- الحاضر — nullable لاستيعاب الضيوف الخارجيين
    persona_id          uuid        REFERENCES public.user_personas(id),
    name_snapshot       text        NOT NULL,
    role_snapshot       text,

    is_invited          boolean     NOT NULL DEFAULT true,
    attended            boolean     NOT NULL DEFAULT false,
    apology_reason      text,
    signature_time      timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),

    -- Composite FK إلى meeting_sessions(id, school_id)
    CONSTRAINT fk_msa_session FOREIGN KEY (meeting_session_id, school_id)
        REFERENCES public.meeting_sessions (id, school_id),

    -- منع تكرار نفس الـ persona في الاجتماع الواحد
    -- NULLs مسموحة بتعدد (ضيوف خارجيون بدون persona)
    CONSTRAINT msa_persona_session_unique UNIQUE (meeting_session_id, persona_id)
);

COMMENT ON TABLE  public.meeting_session_attendees                       IS 'Layer 6: حضور جلسات الاجتماع — مرتبط بـ meeting_sessions';
COMMENT ON COLUMN public.meeting_session_attendees.persona_id            IS 'NULL للحضور الخارجيين — يمكن أن يتعدد NULL في نفس الاجتماع';
COMMENT ON COLUMN public.meeting_session_attendees.signature_time        IS 'وقت توقيع المحضر — يُملأ في مرحلة awaiting_signatures';

-- ============================================================
-- Indexes: meeting_sessions
-- ============================================================

-- للوحة الاجتماعات حسب الحالة (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_ms_school_status
    ON public.meeting_sessions (school_id, status);

-- للتقويم والجدولة
CREATE INDEX IF NOT EXISTS idx_ms_school_date
    ON public.meeting_sessions (school_id, scheduled_date DESC);

-- للبحث عن اجتماعات مرتبطة بـ workflow
CREATE INDEX IF NOT EXISTS idx_ms_workflow_instance
    ON public.meeting_sessions (workflow_instance_id)
    WHERE workflow_instance_id IS NOT NULL;

-- ============================================================
-- Indexes: meeting_session_attendees
-- ============================================================

-- لعرض كل حضور اجتماع محدد
CREATE INDEX IF NOT EXISTS idx_msa_session
    ON public.meeting_session_attendees (meeting_session_id);

-- للبحث عن اجتماعات شخص محدد
CREATE INDEX IF NOT EXISTS idx_msa_persona
    ON public.meeting_session_attendees (persona_id)
    WHERE persona_id IS NOT NULL;

-- ============================================================
-- Row Level Security: meeting_sessions
-- ============================================================
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: جميع موظفي المدرسة + system_owner
DROP POLICY IF EXISTS "ms_select" ON public.meeting_sessions;
CREATE POLICY "ms_select" ON public.meeting_sessions
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: المنظِّمون الطبيعيون للاجتماعات
DROP POLICY IF EXISTS "ms_insert" ON public.meeting_sessions;
CREATE POLICY "ms_insert" ON public.meeting_sessions
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal',
            'school_admin',
            'school_secretary',
            'quality_coordinator'
        )
    );

-- UPDATE: المنظِّم الأصلي + الإدارة
DROP POLICY IF EXISTS "ms_update" ON public.meeting_sessions;
CREATE POLICY "ms_update" ON public.meeting_sessions
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            organizer_persona_id IN (
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
-- Row Level Security: meeting_session_attendees
-- ============================================================
ALTER TABLE public.meeting_session_attendees ENABLE ROW LEVEL SECURITY;

-- SELECT: جميع موظفي المدرسة + system_owner
DROP POLICY IF EXISTS "msa_select" ON public.meeting_session_attendees;
CREATE POLICY "msa_select" ON public.meeting_session_attendees
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: منظِّمو الاجتماعات
DROP POLICY IF EXISTS "msa_insert" ON public.meeting_session_attendees;
CREATE POLICY "msa_insert" ON public.meeting_session_attendees
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal',
            'school_admin',
            'school_secretary',
            'quality_coordinator'
        )
    );

-- UPDATE: الحاضر نفسه (لتسجيل توقيعه) + المنظِّمون (لتحديث الحضور)
DROP POLICY IF EXISTS "msa_update" ON public.meeting_session_attendees;
CREATE POLICY "msa_update" ON public.meeting_session_attendees
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            -- الحاضر نفسه
            persona_id IN (
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
    _rls_ms  boolean;
    _rls_msa boolean;
BEGIN
    -- التحقق من وجود الجدولين
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_sessions'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول meeting_sessions لم يُنشأ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_session_attendees'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول meeting_session_attendees لم يُنشأ';
    END IF;

    -- التحقق من RLS
    SELECT relrowsecurity INTO _rls_ms
    FROM   pg_class
    WHERE  relname      = 'meeting_sessions'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_ms THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على meeting_sessions';
    END IF;

    SELECT relrowsecurity INTO _rls_msa
    FROM   pg_class
    WHERE  relname      = 'meeting_session_attendees'
      AND  relnamespace = 'public'::regnamespace;

    IF NOT _rls_msa THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على meeting_session_attendees';
    END IF;

    -- التحقق من UNIQUE(id, school_id) الضروري للـ composite FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname  = 'meeting_sessions_id_school_id_key'
          AND  conrelid = 'public.meeting_sessions'::regclass
          AND  contype  = 'u'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: UNIQUE(id, school_id) غير موجود على meeting_sessions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE  schemaname = 'public'
          AND  tablename  = 'meeting_sessions'
          AND  indexname  = 'idx_ms_school_status'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: idx_ms_school_status غير موجود';
    END IF;

    RAISE NOTICE '✓ meeting_sessions أُنشئ بنجاح';
    RAISE NOTICE '✓ meeting_session_attendees أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل على الجدولين';
    RAISE NOTICE '✓ UNIQUE(id, school_id) موجود على meeting_sessions';
    RAISE NOTICE '✓ Migration 45 اكتمل بنجاح';
    RAISE NOTICE '✓ Layer 6 Core Tables مكتملة: nonconformance_reports + hr_accountability_tickets + staff_evaluations + meeting_sessions + meeting_session_attendees';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تعليمات الرجوع اليدوي فقط
-- لا تُنفَّذ تلقائياً — لا CASCADE
-- يبدأ الرجوع من meeting_session_attendees ثم meeting_sessions
-- ============================================================
--
-- الخطوة 1: حذف سياسات RLS لـ meeting_session_attendees
--   DROP POLICY IF EXISTS "msa_select" ON public.meeting_session_attendees;
--   DROP POLICY IF EXISTS "msa_insert" ON public.meeting_session_attendees;
--   DROP POLICY IF EXISTS "msa_update" ON public.meeting_session_attendees;
--   ALTER TABLE public.meeting_session_attendees DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 2: حذف جدول meeting_session_attendees (بدون CASCADE)
--   DROP TABLE IF EXISTS public.meeting_session_attendees;
--
-- الخطوة 3: حذف سياسات RLS لـ meeting_sessions
--   DROP POLICY IF EXISTS "ms_select" ON public.meeting_sessions;
--   DROP POLICY IF EXISTS "ms_insert" ON public.meeting_sessions;
--   DROP POLICY IF EXISTS "ms_update" ON public.meeting_sessions;
--   ALTER TABLE public.meeting_sessions DISABLE ROW LEVEL SECURITY;
--
-- الخطوة 4: حذف جدول meeting_sessions (بدون CASCADE)
--   DROP TABLE IF EXISTS public.meeting_sessions;
