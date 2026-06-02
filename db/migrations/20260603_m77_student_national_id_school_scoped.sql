-- ============================================================================
-- Migration M77: student_profiles — school-scoped national_id uniqueness
-- ============================================================================
-- السبب: onConflict: 'national_id' في bulk-upload كان عالمياً (cross-tenant).
-- يعني: طالب في مدرسة A بنفس الرقم الوطني لطالب في مدرسة B سيُعيد كتابة بيانات مدرسة B.
-- الحل: unique constraint على (school_id, national_id) بدلاً من national_id وحده.
-- ============================================================================

BEGIN;

-- 1. إزالة أي unique constraint عالمي موجود على national_id
ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_national_id_key;

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_national_id_unique;

-- 2. إضافة unique constraint محدد بالمدرسة
--    يسمح بنفس الرقم الوطني في مدارس مختلفة لكن يمنع تكراره داخل نفس المدرسة
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_school_national_unique
  UNIQUE (school_id, national_id);

-- 3. تحسين أداء lookup بـ national_id داخل المدرسة
CREATE INDEX IF NOT EXISTS idx_student_profiles_school_national_id
  ON public.student_profiles (school_id, national_id)
  WHERE national_id IS NOT NULL;

COMMIT;
