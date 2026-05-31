-- =================================================================
-- M74: إضافة timezone لجدول schools
-- التاريخ: 2026-06-01
-- =================================================================
-- السبب:
--   Edge Function تحتاج timezone المدرسة لحساب "اليوم المحلي"
--   بشكل صحيح عند إدراج سجلات ai_insights.
--   بدونه: CURRENT_DATE يُعيد تاريخ UTC — خطأ للمدارس في UTC+3.
--
-- الافتراضي: 'Asia/Riyadh' (UTC+3) لأن النظام مصمم أساساً للسعودية.
-- قابل للتخصيص لكل مدرسة إذا توسّع النظام لمناطق أخرى.
-- =================================================================

BEGIN;

-- Preflight: تأكد أن العمود غير موجود
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'schools'
          AND column_name  = 'timezone'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: schools.timezone موجود مسبقاً';
    END IF;
    RAISE NOTICE 'Preflight ✓';
END $$;

-- إضافة العمود مع قيمة افتراضية
ALTER TABLE public.schools
    ADD COLUMN timezone text NOT NULL DEFAULT 'Asia/Riyadh';

-- تحقق: قيمة منطقية (IANA timezone name) — لا نُقيّد بـ CHECK لأن القائمة ضخمة
-- التحقق يحدث في Edge Function عبر Intl.DateTimeFormat

-- التحقق النهائي
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'schools'
          AND column_name  = 'timezone'
          AND is_nullable  = 'NO'
    ) THEN
        RAISE EXCEPTION 'FAIL: schools.timezone لم تُضَف بشكل صحيح';
    END IF;

    RAISE NOTICE '✅ M74 اكتمل: schools.timezone NOT NULL DEFAULT ''Asia/Riyadh''';
    RAISE NOTICE '   Edge Function تقرأ هذا العمود لحساب generated_date بتوقيت المدرسة';
END $$;

COMMIT;
