-- =================================================================
-- M70: توسعة طبقة Events
-- التاريخ: 2026-05-31
-- =================================================================
-- العملية:
--   events — ADD COLUMN IF NOT EXISTS (لا DROP — الجدول موجود)
--
-- الحقول المضافة:
--   teacher_id          uuid FK → profiles
--   subject_id          uuid FK → subjects
--   period_id           uuid FK → periods   (UUID — ليس INT)
--   timetable_slot_id   uuid FK → timetable_slots
--   term_id             uuid FK → terms
--   source_module       text CHECK — المصدر الذي ولّد الحدث
--   metadata            jsonb — بيانات إضافية حسب المصدر
--   created_by_persona_id uuid FK → user_personas
--   event_timestamp     timestamptz — وقت الحدث الفعلي
--
-- التبعيات:
--   ✅ events (موجود من مراحل أقدم)
--   ✅ profiles · subjects · periods · timetable_slots · terms
--   ✅ user_personas · schools
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'events'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: events غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'periods'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: periods غير موجودة — طبّق 20260530_academic_structure أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'terms'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: terms غير موجودة — طبّق 20260530_academic_structure أولاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- توسعة جدول events
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.events
    -- مصدر الحدث: الوحدة التي ولّدته
    ADD COLUMN IF NOT EXISTS source_module          text
        CHECK (source_module IN (
            'attendance',   -- حضور يومي / حضور حصص
            'behavioral',   -- إحالات سلوكية / عقود
            'lrc',          -- مصادر التعلم (زيارات / إعارات)
            'health',       -- الصحة المدرسية
            'activity',     -- الأنشطة
            'counselor',    -- المرشد الطلابي
            'qa',           -- ضمان الجودة
            'system',       -- أحداث النظام الداخلية
            'other'
        )),

    -- المعلم المرتبط بالحدث
    ADD COLUMN IF NOT EXISTS teacher_id             uuid
        REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- المادة المرتبطة
    ADD COLUMN IF NOT EXISTS subject_id             uuid
        REFERENCES public.subjects(id) ON DELETE SET NULL,

    -- الحصة الدراسية (UUID — مرجع لجدول periods المُنشأ في M59)
    ADD COLUMN IF NOT EXISTS period_id              uuid
        REFERENCES public.periods(id) ON DELETE SET NULL,

    -- خانة الجدول الدراسي المحددة
    ADD COLUMN IF NOT EXISTS timetable_slot_id      uuid
        REFERENCES public.timetable_slots(id) ON DELETE SET NULL,

    -- الفصل الدراسي
    ADD COLUMN IF NOT EXISTS term_id                uuid
        REFERENCES public.terms(id) ON DELETE SET NULL,

    -- بيانات إضافية مرنة حسب source_module
    ADD COLUMN IF NOT EXISTS metadata               jsonb
        NOT NULL DEFAULT '{}',

    -- الشخصية التي أنشأت الحدث (للتتبع الدقيق)
    ADD COLUMN IF NOT EXISTS created_by_persona_id  uuid
        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    -- وقت الحدث الفعلي (قد يختلف عن created_at)
    ADD COLUMN IF NOT EXISTS event_timestamp        timestamptz
        NOT NULL DEFAULT now();

-- ────────────────────────────────────────────────────────────────
-- فهارس للاستعلامات الشائعة
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_source_module
    ON public.events (school_id, source_module);

CREATE INDEX IF NOT EXISTS idx_events_teacher
    ON public.events (teacher_id)
    WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_period
    ON public.events (period_id)
    WHERE period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_term
    ON public.events (term_id)
    WHERE term_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_timestamp
    ON public.events (school_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_metadata
    ON public.events USING GIN (metadata)
    WHERE metadata != '{}';

-- ════════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_col text;
BEGIN
    FOREACH v_col IN ARRAY ARRAY[
        'source_module', 'teacher_id', 'subject_id',
        'period_id', 'timetable_slot_id', 'term_id',
        'metadata', 'created_by_persona_id', 'event_timestamp'
    ]
    LOOP
        PERFORM 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
          AND column_name = v_col;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'FAIL: % لم يُضَف إلى events', v_col;
        END IF;
        RAISE NOTICE '✓ events.%', v_col;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ M70 اكتمل: events توسّع بـ 9 حقول جديدة';
    RAISE NOTICE '   ✓ source_module CHECK (9 قيم)';
    RAISE NOTICE '   ✓ period_id → UUID FK (ليس INT)';
    RAISE NOTICE '   ✓ metadata JSONB DEFAULT {}';
    RAISE NOTICE '   ✓ 6 فهارس جديدة';
END $$;

COMMIT;
