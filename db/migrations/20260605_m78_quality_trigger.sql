-- =================================================================
-- M78: trigger جودة — period_attendance → quality_evidence
-- التاريخ: 2026-06-05
-- =================================================================
-- يُنشئ دليل جودة تلقائياً (auto_generated=true) عند تسجيل
-- أي غياب (absent) أو تأخر (late) في period_attendance.
--
-- المتطلبات:
--   ✅ M63: quality_indicators + quality_evidence (20260530_quality_layer.sql)
--   ✅ M58: period_attendance (20260528_period_attendance.sql)
--
-- منطق العمل:
--   1. فقط status IN ('absent', 'late') — الحضور لا يُنتج دليلاً
--   2. مؤشر ATT-001 يجب أن يكون موجوداً + نشطاً + is_auto_fillable
--   3. سنة دراسية نشطة يجب أن تكون موجودة للمدرسة
--   4. إيدمبوتنسية: ON CONFLICT (source_event_id) DO NOTHING
--   5. تسامح مع الأخطاء: إذا لم يُفعَّل نظام الجودة للمدرسة → تخطي صامت
--
-- القيم:
--   absent → 1.0 (غياب كامل)
--   late   → 0.5 (نصف وحدة)
-- =================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. Preflight
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'period_attendance'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: period_attendance غير موجود — طبِّق M58 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quality_evidence'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quality_evidence غير موجود — طبِّق M63 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quality_indicators'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quality_indicators غير موجود — طبِّق M63 أولاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 2. UNIQUE partial index — يضمن idempotency الـ trigger
-- ════════════════════════════════════════════════════════════════
-- كل period_attendance row يُنتج دليلاً واحداً فقط
-- (ON CONFLICT يحتاج UNIQUE index ليعمل)
CREATE UNIQUE INDEX IF NOT EXISTS idx_qe_source_event_unique
    ON public.quality_evidence (source_event_id)
    WHERE source_event_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 3. دالة الـ trigger
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_quality_evidence_from_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_indicator_id  uuid;
    v_year_id       uuid;
BEGIN
    -- فقط للغياب والتأخر — الحضور لا يُنتج دليل جودة
    IF NEW.status NOT IN ('absent', 'late') THEN
        RETURN NEW;
    END IF;

    -- البحث عن مؤشر ATT-001 للمدرسة
    -- يُضبط عند تفعيل نظام الجودة (يُدرَج عبر QA coordinator أو migration seed)
    SELECT id INTO v_indicator_id
    FROM public.quality_indicators
    WHERE school_id        = NEW.school_id
      AND code             = 'ATT-001'
      AND is_auto_fillable = true
      AND is_active        = true
    LIMIT 1;

    -- إذا لم يُفعَّل نظام الجودة للمدرسة بعد → تخطي بدون خطأ
    IF v_indicator_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- السنة الدراسية: من السجل نفسه أولاً، ثم النشطة في المدرسة كـ fallback
    v_year_id := NEW.academic_year_id;

    IF v_year_id IS NULL THEN
        SELECT id INTO v_year_id
        FROM public.academic_years
        WHERE school_id = NEW.school_id
          AND is_active = true
        LIMIT 1;
    END IF;

    -- إذا لم توجد سنة دراسية نشطة → تخطي
    IF v_year_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- إدراج دليل الجودة
    -- ON CONFLICT DO NOTHING يضمن idempotency في حالة إعادة تطبيق Migration
    INSERT INTO public.quality_evidence (
        school_id,
        indicator_id,
        source_event_id,
        source_module,
        evidence_date,
        value,
        notes,
        auto_generated,
        academic_year_id
    ) VALUES (
        NEW.school_id,
        v_indicator_id,
        NEW.id,
        'attendance',
        NEW.period_date,
        CASE WHEN NEW.status = 'absent' THEN 1.0 ELSE 0.5 END,
        NEW.status,
        true,
        v_year_id
    )
    ON CONFLICT (source_event_id)
    WHERE source_event_id IS NOT NULL
    DO NOTHING;

    RETURN NEW;
END;
$$;

-- تقييد التنفيذ على postgres فقط (SECURITY DEFINER تعمل بصلاحية المالك)
REVOKE EXECUTE ON FUNCTION public.fn_quality_evidence_from_attendance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_quality_evidence_from_attendance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_quality_evidence_from_attendance() FROM authenticated;

-- ════════════════════════════════════════════════════════════════
-- 4. الـ trigger
-- ════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_quality_from_attendance ON public.period_attendance;

CREATE TRIGGER trg_quality_from_attendance
    AFTER INSERT ON public.period_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_quality_evidence_from_attendance();

-- ════════════════════════════════════════════════════════════════
-- 5. التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_trigger_exists boolean;
    v_index_exists   boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relname = 'period_attendance'
          AND t.tgname  = 'trg_quality_from_attendance'
    ) INTO v_trigger_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename  = 'quality_evidence'
          AND indexname  = 'idx_qe_source_event_unique'
    ) INTO v_index_exists;

    IF NOT v_trigger_exists THEN
        RAISE EXCEPTION 'FAIL: trigger trg_quality_from_attendance غير موجود';
    END IF;

    IF NOT v_index_exists THEN
        RAISE EXCEPTION 'FAIL: idx_qe_source_event_unique غير موجود';
    END IF;

    RAISE NOTICE '✅ M78 اكتمل:';
    RAISE NOTICE '   ✓ idx_qe_source_event_unique — partial UNIQUE على quality_evidence.source_event_id';
    RAISE NOTICE '   ✓ fn_quality_evidence_from_attendance() — SECURITY DEFINER — لا تُستدعى يدوياً';
    RAISE NOTICE '   ✓ trg_quality_from_attendance — AFTER INSERT على period_attendance';
    RAISE NOTICE '   ✓ يُنتج قيمة 1.0 للغياب و0.5 للتأخر على مؤشر ATT-001';
    RAISE NOTICE '   ✓ idempotent: ON CONFLICT (source_event_id) DO NOTHING';
    RAISE NOTICE '   ✓ fault-tolerant: يتخطى إذا لم يُفعَّل ATT-001 أو لم توجد سنة نشطة';
END $$;

COMMIT;
