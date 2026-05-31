-- M58: period_attendance
-- حضور الطلاب على مستوى الحصة الدراسية — مرتبط بالجدول الدراسي
-- المتطلب: تطبيق 20260121_setup_production.sql أولاً (timetable_slots · subjects)

CREATE TABLE IF NOT EXISTS public.period_attendance (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id               uuid        NOT NULL REFERENCES public.schools(id),
  student_id              uuid        NOT NULL REFERENCES public.student_profiles(id),
  class_id                uuid        REFERENCES public.classes(id),
  timetable_slot_id       uuid        REFERENCES public.timetable_slots(id),
  subject_id              uuid        REFERENCES public.subjects(id),
  academic_year_id        uuid        REFERENCES public.academic_years(id),
  period_date             date        NOT NULL DEFAULT CURRENT_DATE,
  period_number           int         NOT NULL CHECK (period_number BETWEEN 1 AND 10),
  status                  text        NOT NULL
                          CHECK (status IN ('present','absent','late','excused')),
  is_excused              boolean     NOT NULL DEFAULT false,
  excuse_reason           text,
  note                    text,
  source                  text        NOT NULL DEFAULT 'teacher'
                          CHECK (source IN ('teacher','vp','system')),
  marked_by_persona_id    uuid        REFERENCES public.user_personas(id),
  marked_by_name_snapshot text,
  marked_at               timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, period_date, period_number, school_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pa_school_date
  ON public.period_attendance (school_id, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_pa_class_date_period
  ON public.period_attendance (class_id, period_date DESC, period_number);

CREATE INDEX IF NOT EXISTS idx_pa_student_year
  ON public.period_attendance (student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_pa_timetable_slot
  ON public.period_attendance (timetable_slot_id);

CREATE INDEX IF NOT EXISTS idx_pa_unexcused
  ON public.period_attendance (student_id, school_id, academic_year_id)
  WHERE status = 'absent' AND is_excused = false;

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.period_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_select" ON public.period_attendance FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

CREATE POLICY "pa_insert" ON public.period_attendance FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'teacher', 'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'system_owner'
    )
  );

CREATE POLICY "pa_update" ON public.period_attendance FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'teacher', 'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'system_owner'
    )
  );
