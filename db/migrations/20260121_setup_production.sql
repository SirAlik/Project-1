-- 20260121_setup_production.sql (REVISED)
-- البنية الأكاديمية: المواد · التسجيلات · تكليفات المعلمين · الجدول الدراسي
-- المتطلبات: schools · classes · student_profiles · profiles · user_personas
--
-- ملاحظة: academic_years موجودة من 03_academic_integrity.sql مع school_id
--         هذا الملف يضيف سياسات RLS المفقودة لها ثم ينشئ باقي الجداول

-- ─── 1. academic_years — سياسات RLS المفقودة ──────────────────────────────────
--
-- الجدول موجود بالفعل مع school_id لكن بدون أي سياسات RLS
-- (الجدول الموجود: id · school_id · name · start_date · end_date · is_active)

DROP POLICY IF EXISTS "Staff Read All Setup" ON public.academic_years;
DROP POLICY IF EXISTS "Admin Modify Setup"   ON public.academic_years;
DROP POLICY IF EXISTS "ay_select"            ON public.academic_years;
DROP POLICY IF EXISTS "ay_insert"            ON public.academic_years;
DROP POLICY IF EXISTS "ay_update"            ON public.academic_years;

CREATE POLICY "ay_select" ON public.academic_years FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "ay_insert" ON public.academic_years FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "ay_update" ON public.academic_years FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

-- ─── 2. subjects ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subjects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid        NOT NULL REFERENCES public.schools(id),
  name_ar     text        NOT NULL,
  code        text,
  icon        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sub_school ON public.subjects (school_id);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Read Subjects" ON public.subjects;
DROP POLICY IF EXISTS "sub_select"          ON public.subjects;
DROP POLICY IF EXISTS "sub_insert"          ON public.subjects;
DROP POLICY IF EXISTS "sub_update"          ON public.subjects;

CREATE POLICY "sub_select" ON public.subjects FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "sub_insert" ON public.subjects FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "sub_update" ON public.subjects FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

-- ─── 3. classes — إضافة section و academic_year_id ───────────────────────────

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS section          text,
  ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_class_year_section'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT unique_class_year_section
      UNIQUE (academic_year_id, grade_level, section);
  END IF;
END $$;

-- ─── 4. student_enrollments ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         uuid        NOT NULL REFERENCES public.schools(id),
  student_id        uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  class_id          uuid        NOT NULL REFERENCES public.classes(id)           ON DELETE CASCADE,
  academic_year_id  uuid        NOT NULL REFERENCES public.academic_years(id)    ON DELETE CASCADE,
  is_active         boolean     NOT NULL DEFAULT true,
  enrolled_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_se_class_year
  ON public.student_enrollments (class_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_se_student_year
  ON public.student_enrollments (student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_se_school_active
  ON public.student_enrollments (school_id, is_active);

-- Trigger: مزامنة class_id في student_profiles عند تسجيل الطالب
CREATE OR REPLACE FUNCTION public.sync_enrollment_to_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.student_profiles
    SET class_id    = NEW.class_id,
        grade_level = (SELECT grade_level FROM public.classes WHERE id = NEW.class_id)
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_enrollment ON public.student_enrollments;
CREATE TRIGGER trg_sync_enrollment
  AFTER INSERT OR UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sync_enrollment_to_profile();

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Read Enrollments" ON public.student_enrollments;
DROP POLICY IF EXISTS "se_select"               ON public.student_enrollments;
DROP POLICY IF EXISTS "se_insert"               ON public.student_enrollments;
DROP POLICY IF EXISTS "se_update"               ON public.student_enrollments;

CREATE POLICY "se_select" ON public.student_enrollments FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "se_insert" ON public.student_enrollments FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "se_update" ON public.student_enrollments FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'system_owner'
    )
  );

-- ─── 5. teacher_assignments ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         uuid        NOT NULL REFERENCES public.schools(id),
  teacher_id        uuid        NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  subject_id        uuid        NOT NULL REFERENCES public.subjects(id)        ON DELETE CASCADE,
  class_id          uuid        NOT NULL REFERENCES public.classes(id)         ON DELETE CASCADE,
  academic_year_id  uuid        NOT NULL REFERENCES public.academic_years(id)  ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_teacher_year
  ON public.teacher_assignments (teacher_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_ta_school_year
  ON public.teacher_assignments (school_id, academic_year_id);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Read Assignments" ON public.teacher_assignments;
DROP POLICY IF EXISTS "ta_select"               ON public.teacher_assignments;
DROP POLICY IF EXISTS "ta_insert"               ON public.teacher_assignments;
DROP POLICY IF EXISTS "ta_update"               ON public.teacher_assignments;

CREATE POLICY "ta_select" ON public.teacher_assignments FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "ta_insert" ON public.teacher_assignments FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "ta_update" ON public.teacher_assignments FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

-- ─── 6. timetable_slots ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         uuid        NOT NULL REFERENCES public.schools(id),
  class_id          uuid        NOT NULL REFERENCES public.classes(id)         ON DELETE CASCADE,
  day               int         NOT NULL CHECK (day BETWEEN 0 AND 6),          -- 0=الأحد
  period            int         NOT NULL CHECK (period BETWEEN 1 AND 10),
  subject_id        uuid        REFERENCES public.subjects(id)                 ON DELETE SET NULL,
  teacher_id        uuid        REFERENCES public.profiles(id)                 ON DELETE SET NULL,
  academic_year_id  uuid        NOT NULL REFERENCES public.academic_years(id)  ON DELETE CASCADE,
  term              int         NOT NULL DEFAULT 1 CHECK (term BETWEEN 1 AND 3),
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_class_timetable_slot'
  ) THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT unique_class_timetable_slot
      UNIQUE (class_id, day, period, academic_year_id, term);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_teacher_timetable_slot'
  ) THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT unique_teacher_timetable_slot
      UNIQUE (teacher_id, day, period, academic_year_id, term);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ts_class_day
  ON public.timetable_slots (class_id, day, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_ts_teacher_day
  ON public.timetable_slots (teacher_id, day, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_ts_school
  ON public.timetable_slots (school_id, academic_year_id);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff Read Timetable" ON public.timetable_slots;
DROP POLICY IF EXISTS "ts_select"             ON public.timetable_slots;
DROP POLICY IF EXISTS "ts_insert"             ON public.timetable_slots;
DROP POLICY IF EXISTS "ts_update"             ON public.timetable_slots;

CREATE POLICY "ts_select" ON public.timetable_slots FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "ts_insert" ON public.timetable_slots FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "ts_update" ON public.timetable_slots FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'school_principal', 'school_admin', 'system_owner'
    )
  );
