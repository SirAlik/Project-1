-- =================================================================
-- R01: حذف الجداول والدوال والأنواع legacy
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   حذف الطبقة legacy بالكامل بترتيب آمن (FK order).
--   هذه الجداول لا تمتلك school_id ولا تتبع نمط multi-tenant.
--
-- ما يُحذف:
--   الجداول (10):
--     meeting_attendees → meetings → hr_inquiries → attendance_logs
--     → assignment_letters → procurement_requests
--     student_attendance → student_assets → behavioral_contracts
--     → employees (الجدول الأصل)
--   الدوال (4):
--     fn_check_late_arrival, fn_check_referral_threshold,
--     fn_validate_exit, sync_fingerprint_to_events
--   الأنواع (4):
--     inquiry_type, inquiry_status, letter_type, student_attendance_status
--   جداول phase2-audit (2، إن وُجدت):
--     import_run_items, import_runs
--
-- ما لا يُحذف هنا:
--   user_roles — تُرحَّل بياناتها إلى user_personas في R04
--
-- ملاحظة: behavioral_referrals تُحذف هنا صراحةً (بدلاً من الاعتماد على CASCADE)
-- لأنها كانت تُسقط عبر سلسلة CASCADE غير متوقعة. ستُعاد بناؤها كاملاً في R02.
--
-- التعويض:
--   employees       → user_personas
--   attendance_logs → staff_attendance_logs (Layer 6b)
--   hr_inquiries    → hr_accountability_tickets (Layer 6)
--   meetings        → meeting_sessions (Layer 6)
--   student_attendance → student_daily_attendance (Layer 6)
--
-- التبعيات: R00 ✅ (get_my_school_id تعمل بشكل صحيح)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من عدم وجود FK من جداول حديثة للجداول legacy
-- ============================================================
-- هذا الفحص يمنع الحذف إذا كانت Layer 5-6-7 تشير لهذه الجداول عن طريق خطأ.
-- مؤكد من الاستكشاف أنه لا توجد — لكن الفحص ضروري كضمان.

DO $$
DECLARE
    v_ref_count integer;
    v_ref_info  text;
BEGIN
    SELECT
        COUNT(*),
        string_agg(from_table.relname || '.' || a.attname || ' → ' || ref_table.relname, ', ')
    INTO v_ref_count, v_ref_info
    FROM pg_constraint c
    JOIN pg_class ref_table  ON ref_table.oid  = c.confrelid
    JOIN pg_class from_table ON from_table.oid = c.conrelid
    JOIN pg_attribute a      ON a.attrelid = c.conrelid
                             AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND ref_table.relnamespace  = 'public'::regnamespace
      AND from_table.relnamespace = 'public'::regnamespace
      AND ref_table.relname IN (
          'employees', 'attendance_logs', 'hr_inquiries',
          'meetings', 'meeting_attendees', 'assignment_letters',
          'procurement_requests', 'student_attendance',
          'student_assets', 'behavioral_contracts'
      )
      -- استثناء: الجداول التي تشير لبعضها (كلها في قائمة الحذف)
      AND from_table.relname NOT IN (
          'employees', 'attendance_logs', 'hr_inquiries',
          'meetings', 'meeting_attendees', 'assignment_letters',
          'procurement_requests', 'student_attendance',
          'student_assets', 'behavioral_contracts'
      );

    IF v_ref_count > 0 THEN
        RAISE EXCEPTION
            'PREFLIGHT FAILED: % FK خارجية تشير للجداول legacy: [%] — '
            'تحقق من هذه العلاقات قبل المتابعة',
            v_ref_count, v_ref_info;
    END IF;

    RAISE NOTICE 'Preflight: لا FK خارجية من جداول حديثة تشير للجداول legacy ✓';
END $$;

-- ============================================================
-- حذف دوال الـ Triggers legacy
-- ============================================================
-- الترتيب: الدوال أولاً قبل الجداول لأن CASCADE سيحذف
-- الـ triggers تلقائياً مع الجداول لكن الدوال تبقى.

-- دالة تُنشئ hr_inquiry تلقائياً عند التأخر (مرتبطة بـ attendance_logs)
DROP FUNCTION IF EXISTS public.fn_check_late_arrival() CASCADE;

-- دالة تُنشئ behavioral_referral تلقائياً عند تجاوز حد الغياب/التأخر
-- (كانت مرتبطة بـ student_attendance — سيُعوَّض منطقها بـ fn_auto_referral_on_absence
--  الموجودة على student_daily_attendance)
DROP FUNCTION IF EXISTS public.fn_check_referral_threshold() CASCADE;

-- دالة تتحقق من هوية ولي الأمر عند خروج الطالب (مرتبطة بـ student_attendance)
DROP FUNCTION IF EXISTS public.fn_validate_exit() CASCADE;

-- دالة تزامن بصمة الحضور مع events (من phase2-audit.sql — تشير لجداول غير موجودة)
DROP FUNCTION IF EXISTS public.sync_fingerprint_to_events() CASCADE;

-- ============================================================
-- حذف الجداول legacy (ترتيب FK: الأبناء قبل الآباء)
-- ============================================================

-- مجموعة الاجتماعات (تعتمد على employees)
DROP TABLE IF EXISTS public.meeting_attendees CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;

-- مجموعة الحضور والمساءلة (تعتمد على employees)
DROP TABLE IF EXISTS public.hr_inquiries CASCADE;
DROP TABLE IF EXISTS public.attendance_logs CASCADE;

-- مجموعة المراسلات والمشتريات (تعتمد على employees)
DROP TABLE IF EXISTS public.assignment_letters CASCADE;
DROP TABLE IF EXISTS public.procurement_requests CASCADE;

-- مجموعة الطلاب (لا تعتمد على employees لكن بدون school_id)
DROP TABLE IF EXISTS public.student_attendance CASCADE;
DROP TABLE IF EXISTS public.student_assets CASCADE;
DROP TABLE IF EXISTS public.behavioral_contracts CASCADE;

-- behavioral_referrals — تُحذف صراحةً لمنع الحذف غير المتوقع عبر CASCADE
-- (ستُعاد بناؤها من الصفر في R02 بـ school_id + user_personas FKs)
DROP TABLE IF EXISTS public.behavioral_referrals CASCADE;

-- الجدول الأصل — يُحذف أخيراً بعد حذف كل المعتمدين عليه
DROP TABLE IF EXISTS public.employees CASCADE;

-- ============================================================
-- حذف الأنواع (ENUMs) legacy
-- ============================================================

DROP TYPE IF EXISTS public.inquiry_type CASCADE;
DROP TYPE IF EXISTS public.inquiry_status CASCADE;
DROP TYPE IF EXISTS public.letter_type CASCADE;
DROP TYPE IF EXISTS public.student_attendance_status CASCADE;

-- ============================================================
-- حذف جداول phase2-audit.sql (إن وُجدت)
-- ============================================================
-- import_run_items + import_runs — تعريفهما في phase2-audit.sql
-- to_regclass('public.import_run_items') أعاد NULL → لا تحتاج حذف
-- لكن نُدرجهما هنا بـ IF EXISTS للتأكيد الكامل

DROP TABLE IF EXISTS public.import_run_items CASCADE;
DROP TABLE IF EXISTS public.import_runs CASCADE;

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_remaining_tables text;
    v_remaining_funcs  text;
BEGIN
    -- تحقق من الجداول
    SELECT string_agg(table_name, ', ') INTO v_remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'employees', 'attendance_logs', 'hr_inquiries',
          'meetings', 'meeting_attendees', 'assignment_letters',
          'procurement_requests', 'student_attendance',
          'student_assets', 'behavioral_contracts',
          'behavioral_referrals',
          'import_runs', 'import_run_items'
      );

    IF v_remaining_tables IS NOT NULL THEN
        RAISE EXCEPTION 'التحقق فشل: الجداول التالية لا تزال موجودة: [%]', v_remaining_tables;
    END IF;

    -- تحقق من الدوال
    SELECT string_agg(proname, ', ') INTO v_remaining_funcs
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN (
          'fn_check_late_arrival', 'fn_check_referral_threshold',
          'fn_validate_exit', 'sync_fingerprint_to_events'
      );

    IF v_remaining_funcs IS NOT NULL THEN
        RAISE EXCEPTION 'التحقق فشل: الدوال التالية لا تزال موجودة: [%]', v_remaining_funcs;
    END IF;

    -- تأكيد أن user_roles لا تزال موجودة (محفوظة لـ R04)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        RAISE WARNING 'تنبيه: user_roles غير موجودة — ربما حُذفت مسبقاً (تحقق قبل تطبيق R04)';
    END IF;

    RAISE NOTICE '✓ 11 جداول legacy محذوفة: employees, attendance_logs, hr_inquiries, meetings,';
    RAISE NOTICE '  meeting_attendees, assignment_letters, procurement_requests,';
    RAISE NOTICE '  student_attendance, student_assets, behavioral_contracts,';
    RAISE NOTICE '  behavioral_referrals (ستُعاد بناؤها في R02)';
    RAISE NOTICE '✓ 4 دوال trigger legacy محذوفة';
    RAISE NOTICE '✓ 4 أنواع legacy محذوفة: inquiry_type, inquiry_status, letter_type, student_attendance_status';
    RAISE NOTICE '✓ import_runs + import_run_items محذوفتان (إن وُجدتا)';
    RAISE NOTICE '✓ user_roles محفوظة → R04';
    RAISE NOTICE '✓ R01 اكتمل — الطبقة legacy محذوفة بالكامل';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — لا يُنصح به: هذه الجداول مستبدَلة بـ Layer 6
-- ============================================================
-- إذا احتجت الرجوع لأسباب طارئة مؤقتة:
--   طبّق db/migration_secretary_v2.sql لاسترجاع جداول السكرتارية
--   طبّق db/migration_student_affairs_v1.sql لاسترجاع جداول الشؤون الطلابية
--   ملاحظة: هذه الجداول ستعود بدون school_id وبدون RLS صحيح.
--   الـ Rollback هنا طارئ ومؤقت فقط.
