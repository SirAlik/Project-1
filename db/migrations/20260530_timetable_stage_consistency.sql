-- =================================================================
-- M64: إحكام تكامل الجدول الدراسي — Composite FK
-- التاريخ: 2026-05-30
-- =================================================================
-- المشكلة:
--   timetable_slots يحتوي على class_id وperiod_id، كلاهما ينتمي
--   لـ stage_id معين. قاعدة البيانات لا ترفض ربط "فصل ابتدائي"
--   بـ"حصة متوسطة" لأن كلاهما UUIDs صحيحة.
--
-- الحل — Composite FK مع "مرساة مشتركة":
--   نضيف stage_id على timetable_slots ونجعل كلاً من class_id
--   وperiod_id يرتبطان به عبر Composite FK:
--
--     timetable_slots.stage_id ──┬──▶ classes(id, stage_id)
--                                └──▶ periods(id, school_stage_id)
--
--   قاعدة البيانات تُجبر على: stage_id الفصل = stage_id الحصة
--   لأن عمود stage_id الواحد لا يمكنه إرضاء الاثنين بقيم مختلفة.
--
-- الخطوات:
--   1. ADD UNIQUE (id, stage_id) على classes  ← شرط الـ Composite FK
--   2. ADD UNIQUE (id, school_stage_id) على periods
--   3. ADD stage_id على timetable_slots
--   4. DROP FKs البسيطة على class_id وperiod_id
--   5. ADD Composite FKs
--
-- التبعيات:
--   ✅ M59 (20260530_academic_structure.sql) — school_stages · periods
--       classes.stage_id موجود · periods.school_stage_id موجود
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    -- M59 يجب أن يكون قد طُبِّق (school_stages + periods + classes.stage_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'school_stages'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: school_stages غير موجودة — طبّق M59 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'classes'
          AND column_name = 'stage_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: classes.stage_id غير موجود — طبّق M59 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'periods'
          AND column_name = 'school_stage_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: periods.school_stage_id غير موجود — طبّق M59 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'timetable_slots'
          AND column_name = 'period_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: timetable_slots.period_id غير موجود — طبّق M59 أولاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'timetable_slots'
          AND column_name = 'stage_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: timetable_slots.stage_id موجود مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓ — جميع التبعيات موجودة';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. UNIQUE مركّب على classes (id, stage_id)
--    شرط ضروري لكي يستطيع Composite FK الإشارة إليه.
--    id وحده PK، لكن PostgreSQL يحتاج UNIQUE صريح على (id, stage_id)
--    كـ target للـ FK المركّب.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.classes
    ADD CONSTRAINT classes_id_stage_id_unique UNIQUE (id, stage_id);

-- ════════════════════════════════════════════════════════════════
-- 2. UNIQUE مركّب على periods (id, school_stage_id)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.periods
    ADD CONSTRAINT periods_id_school_stage_id_unique UNIQUE (id, school_stage_id);

-- ════════════════════════════════════════════════════════════════
-- 3. إضافة stage_id على timetable_slots — المرساة المشتركة
--    يُشير لـ school_stages مباشرة (كـ تحقق مستقل)
--    الـ Composite FKs ستُجبر على أن تتطابق قيمته مع stage_id
--    الفصل ومع school_stage_id الحصة في نفس الوقت.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.timetable_slots
    ADD COLUMN stage_id uuid NOT NULL REFERENCES public.school_stages(id) ON DELETE RESTRICT;

-- ════════════════════════════════════════════════════════════════
-- 4. حذف FKs البسيطة القديمة على class_id وperiod_id
--    (سيتم استبدالها بـ Composite FKs في الخطوة التالية)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.timetable_slots
    DROP CONSTRAINT IF EXISTS timetable_slots_class_id_fkey,
    DROP CONSTRAINT IF EXISTS timetable_slots_period_id_fkey;

-- ════════════════════════════════════════════════════════════════
-- 5. إضافة Composite FKs
--
--    ts_class_stage_fk:
--      تضمن أن (class_id, stage_id) يوجد في classes كـ زوج فعلي.
--      أي: stage_id في timetable_slots = stage_id للفصل المُختار.
--
--    ts_period_stage_fk:
--      تضمن أن (period_id, stage_id) يوجد في periods كـ زوج فعلي.
--      أي: stage_id في timetable_slots = school_stage_id للحصة المُختارة.
--
--    النتيجة المشتركة:
--      stage_id الفصل = stage_id الحصة (عبر عمود واحد مشترك)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.timetable_slots
    ADD CONSTRAINT ts_class_stage_fk
        FOREIGN KEY (class_id, stage_id)
        REFERENCES public.classes(id, stage_id)
        ON DELETE CASCADE,

    ADD CONSTRAINT ts_period_stage_fk
        FOREIGN KEY (period_id, stage_id)
        REFERENCES public.periods(id, school_stage_id)
        ON DELETE RESTRICT;

CREATE INDEX idx_ts_stage_id ON public.timetable_slots (stage_id);

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_fk_class  text;
    v_fk_period text;
    v_fk_stage  text;
    v_col_null  text;
BEGIN
    -- stage_id موجود كـ NOT NULL
    SELECT is_nullable INTO v_col_null
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timetable_slots'
      AND column_name = 'stage_id';

    IF v_col_null IS NULL THEN
        RAISE EXCEPTION 'FAIL: timetable_slots.stage_id غير موجود';
    END IF;
    IF v_col_null = 'YES' THEN
        RAISE EXCEPTION 'FAIL: timetable_slots.stage_id nullable — يجب أن يكون NOT NULL';
    END IF;

    -- Composite FK على class_id موجود
    SELECT constraint_name INTO v_fk_class
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'timetable_slots'
      AND constraint_name   = 'ts_class_stage_fk'
      AND constraint_type   = 'FOREIGN KEY';

    IF v_fk_class IS NULL THEN
        RAISE EXCEPTION 'FAIL: ts_class_stage_fk غير موجود';
    END IF;

    -- Composite FK على period_id موجود
    SELECT constraint_name INTO v_fk_period
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name        = 'timetable_slots'
      AND constraint_name   = 'ts_period_stage_fk'
      AND constraint_type   = 'FOREIGN KEY';

    IF v_fk_period IS NULL THEN
        RAISE EXCEPTION 'FAIL: ts_period_stage_fk غير موجود';
    END IF;

    -- FK البسيطة القديمة محذوفة
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'timetable_slots'
          AND constraint_name   IN (
              'timetable_slots_class_id_fkey',
              'timetable_slots_period_id_fkey'
          )
          AND constraint_type   = 'FOREIGN KEY'
    ) THEN
        RAISE EXCEPTION 'FAIL: FKs البسيطة القديمة لا تزال موجودة';
    END IF;

    -- UNIQUE المركّب على classes موجود
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'classes'
          AND constraint_name   = 'classes_id_stage_id_unique'
          AND constraint_type   = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'FAIL: classes_id_stage_id_unique غير موجود';
    END IF;

    -- UNIQUE المركّب على periods موجود
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'periods'
          AND constraint_name   = 'periods_id_school_stage_id_unique'
          AND constraint_type   = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'FAIL: periods_id_school_stage_id_unique غير موجود';
    END IF;

    RAISE NOTICE '✅ M64 اكتمل — Composite FK مُفعَّل:';
    RAISE NOTICE '   ✓ classes: UNIQUE (id, stage_id) أُضيف';
    RAISE NOTICE '   ✓ periods: UNIQUE (id, school_stage_id) أُضيف';
    RAISE NOTICE '   ✓ timetable_slots.stage_id NOT NULL أُضيف';
    RAISE NOTICE '   ✓ ts_class_stage_fk:  (class_id, stage_id) → classes(id, stage_id)';
    RAISE NOTICE '   ✓ ts_period_stage_fk: (period_id, stage_id) → periods(id, school_stage_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ الضمان:';
    RAISE NOTICE '   ربط فصل ابتدائي بحصة متوسطة → FOREIGN KEY violation فوري';
    RAISE NOTICE '   لا triggers، لا كود تطبيق — القيد في schema نفسه';
END $$;

COMMIT;
