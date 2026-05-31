-- =================================================================
-- R00: إصلاح الدوال الأساسية المكسورة
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   ثلاث دوال حيّة في DB تعمل بمنطق خاطئ:
--
--   1. get_my_school_id()
--      النسخة الحية: SELECT school_id FROM profiles WHERE id = auth.uid()
--      المشكلة:  تقرأ من جدول profiles — بطيئة + تكسر RLS (recursive)
--      الإصلاح:  قراءة من JWT app_metadata مباشرة
--
--   2. is_super_admin()
--      النسخة الحية: profiles.role = 'super_admin'
--      المشكلة:  'super_admin' حُذف من school_role_type ENUM (2026-05-23)
--                دائماً تُعيد false = system_owner لا يملك صلاحيات
--      الإصلاح:  قراءة role من JWT app_metadata والمقارنة بـ 'system_owner'
--
--   3. prune_old_audit_logs()
--      المشكلة:  تشير إلى public.import_runs — الجدول غير موجود في DB
--                (مؤكد: to_regclass('public.import_runs') = NULL)
--                تفشل عند أي استدعاء مباشر
--      الإصلاح:  خياران — انظر القسم 3 أدناه
--
-- ⚠️  فحص يدوي مطلوب قبل تشغيل هذا الملف:
--   (أ) app_metadata: تأكد أن JWT يحتوي role و school_id
--       → Supabase Dashboard → Authentication → Users
--         اختر أي مستخدم فعّال → Raw JSON → تأكد وجود:
--         { "app_metadata": { "role": "...", "school_id": "..." } }
--         إذا كانت القيمتان فارغتين، يجب تعبئة app_metadata أولاً
--         قبل تطبيق R00 وإلا ستُعيد get_my_school_id() قيمة NULL.
--   (ب) pg_cron / scheduled jobs: راجع القسم 3 أدناه
--
-- التبعيات: لا شيء — هذه الدوال لا تعتمد على جداول أخرى بعد الإصلاح
-- التأثير الفوري: تبدأ Layer 5-6-7 RLS policies تعمل بشكل صحيح
--
-- الجداول التي تعتمد على get_my_school_id():
--   workflow_instances, workflow_transitions, approval_gates,
--   nonconformance_reports, hr_accountability_tickets, staff_evaluations,
--   meeting_sessions, meeting_session_attendees, notifications,
--   staff_attendance_logs, biometric_logs, student_daily_attendance,
--   period_attendance, generated_forms, bulk_upload_jobs
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight A: التحقق من وجود الدوال الحالية
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname      = 'get_my_school_id'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة أصلاً';
    END IF;

    RAISE NOTICE 'Preflight A: get_my_school_id() موجودة — سيتم استبدالها';
    RAISE NOTICE 'Preflight A: تذكير — راجع app_metadata يدوياً قبل المتابعة (انظر التعليقات أعلى الملف)';
END $$;

-- ============================================================
-- Preflight B: فحص pg_cron لاستدعاءات prune_old_audit_logs
-- ============================================================
-- pg_cron امتداد اختياري — إذا لم يكن مثبَّتاً فالاستعلام سيفشل.
-- هذا الـ Preflight يكشف الحالات المثبَّتة فقط.
-- إذا فشل بـ "relation does not exist" فـ pg_cron غير مثبَّت → لا jobs مجدوَلة.
--
-- ⚠️  فحص يدوي إضافي مطلوب:
--   Supabase Dashboard → Database → Extensions → تأكد عدم تفعيل pg_cron
--   إذا كان مفعَّلاً، نفّذ يدوياً في SQL Editor:
--     SELECT jobname, schedule, command FROM cron.job
--     WHERE command LIKE '%prune_old_audit_logs%';
--   يجب أن تعيد 0 صفوف قبل المتابعة.

DO $$
DECLARE
    v_cron_exists boolean;
    v_job_count   integer := 0;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO v_cron_exists;

    IF v_cron_exists THEN
        EXECUTE $q$
            SELECT COUNT(*) FROM cron.job
            WHERE command LIKE '%prune_old_audit_logs%'
        $q$ INTO v_job_count;

        IF v_job_count > 0 THEN
            RAISE EXCEPTION
                'PREFLIGHT FAILED: يوجد % job(s) في pg_cron يستدعي prune_old_audit_logs — '
                'احذف أو عدّل هذه الجداول أولاً قبل تطبيق R00',
                v_job_count;
        ELSE
            RAISE NOTICE 'Preflight B: pg_cron مثبَّت ولا يوجد job يستدعي prune_old_audit_logs ✓';
        END IF;
    ELSE
        RAISE NOTICE 'Preflight B: pg_cron غير مثبَّت — لا jobs مجدوَلة ✓';
    END IF;
END $$;

-- ============================================================
-- 1. get_my_school_id() — نسخة JWT الصحيحة
-- ============================================================
-- قبل الإصلاح: SELECT school_id FROM public.profiles WHERE id = auth.uid()
-- بعد الإصلاح: (auth.jwt()->'app_metadata'->>'school_id')::uuid
--
-- السبب: قراءة profiles تسبب recursive RLS عند استخدامها داخل
-- سياسات على جدول profiles نفسه، وتعتمد على مزامنة يدوية بين
-- جدول profiles وـ JWT قد لا تحدث دائماً.
-- JWT هو المصدر الوحيد الموثوق في Supabase Auth.

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_school_id() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;

-- ============================================================
-- 2. is_super_admin() — نسخة JWT الصحيحة
-- ============================================================
-- قبل الإصلاح: profiles.role = 'super_admin'
-- بعد الإصلاح: JWT role = 'system_owner'
--
-- 'super_admin' حُذف من school_role_type ENUM في migration 20260523.
-- الدالة الحالية دائماً تُعيد false لجميع المستخدمين بمن فيهم system_owner.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner';
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- 3. prune_old_audit_logs() — حذف (الخيار A مُفعَّل)
-- ============================================================
-- المشكلة: تشير إلى public.import_runs غير الموجودة (to_regclass = NULL مؤكد).
--          تفشل عند أي استدعاء مباشر.
--
-- سبب اختيار DROP:
--   • pg_cron غير مثبَّت (Preflight B أعاد "relation cron.job does not exist")
--     = لا jobs مجدوَلة تستدعيها
--   • المستخدم الوحيد في النظام (مرحلة ما قبل الإنتاج)
--   • لا edge function موجودة تستدعيها (يُوصى بالتأكيد من Dashboard →
--     Edge Functions قبل التنفيذ إذا تبيّن وجود functions لاحقاً)
--
-- الخيار B (استبدال بنسخة آمنة) موثَّق في ROLLBACK أسفل الملف
-- إذا احتجت استعادتها لاحقاً.

DROP FUNCTION IF EXISTS public.prune_old_audit_logs();

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_src_school  text;
    v_src_admin   text;
    v_has_sdf     boolean;
BEGIN
    -- التحقق من get_my_school_id
    SELECT prosrc INTO v_src_school
    FROM pg_proc
    WHERE proname      = 'get_my_school_id'
      AND pronamespace = 'public'::regnamespace;

    IF v_src_school IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: get_my_school_id() مفقودة بعد الإصلاح';
    END IF;

    IF position('app_metadata' IN v_src_school) = 0 THEN
        RAISE EXCEPTION 'التحقق فشل: get_my_school_id() لا تزال تقرأ من profiles';
    END IF;

    -- التحقق من is_super_admin
    SELECT prosrc INTO v_src_admin
    FROM pg_proc
    WHERE proname      = 'is_super_admin'
      AND pronamespace = 'public'::regnamespace;

    IF v_src_admin IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: is_super_admin() مفقودة بعد الإصلاح';
    END IF;

    IF position('system_owner' IN v_src_admin) = 0 THEN
        RAISE EXCEPTION 'التحقق فشل: is_super_admin() لا تزال تشير لـ super_admin';
    END IF;

    -- التحقق من SECURITY DEFINER + search_path على الدالتين
    SELECT (prosecdef AND proconfig @> ARRAY['search_path=public'])
    INTO v_has_sdf
    FROM pg_proc
    WHERE proname      = 'get_my_school_id'
      AND pronamespace = 'public'::regnamespace;

    IF NOT v_has_sdf THEN
        RAISE EXCEPTION 'التحقق فشل: get_my_school_id() لا تحمل SECURITY DEFINER + search_path';
    END IF;

    RAISE NOTICE '✓ get_my_school_id() تقرأ من JWT app_metadata';
    RAISE NOTICE '✓ is_super_admin() تتحقق من system_owner عبر JWT';
    RAISE NOTICE '✓ SECURITY DEFINER + search_path=public مُطبَّق على الدالتين';
    RAISE NOTICE '✓ prune_old_audit_logs() محذوفة (pg_cron غير مثبَّت — لا jobs مجدوَلة)';
    RAISE NOTICE '✓ R00 اكتمل — Layer 5-6-7 RLS policies تعمل الآن بشكل صحيح';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK MANUAL — تُنفَّذ يدوياً فقط عند الحاجة
-- ============================================================
-- إذا تبيّن أن app_metadata فارغ وأن get_my_school_id() تُعيد NULL
-- لجميع المستخدمين، أعد النسخة القديمة مؤقتاً حتى تعبئة app_metadata:
--
-- CREATE OR REPLACE FUNCTION public.get_my_school_id()
-- RETURNS uuid LANGUAGE sql STABLE AS $$
--     SELECT school_id FROM public.profiles WHERE id = auth.uid();
-- $$;
--
-- CREATE OR REPLACE FUNCTION public.is_super_admin()
-- RETURNS boolean LANGUAGE sql STABLE AS $$
--     SELECT EXISTS (
--         SELECT 1 FROM public.profiles
--         WHERE id = auth.uid() AND role = 'super_admin'
--     );
-- $$;
--
-- ملاحظة: النسختان القديمتان مكسورتان (super_admin لم يعد موجوداً).
-- Rollback هنا مؤقت فقط ريثما تُصحَّح بيانات app_metadata.
