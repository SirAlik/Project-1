-- M57: student_daily_attendance
-- الحضور اليومي للطلاب مع إحالة آلية عند تجاوز حد الغيابات
-- يعتمد على: schools · student_profiles · classes · academic_years
--           user_personas · behavioral_referrals · notifications (M49)

-- ─── الجدول الرئيسي ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_daily_attendance (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                 uuid        NOT NULL REFERENCES public.schools(id),
  student_id                uuid        NOT NULL REFERENCES public.student_profiles(id),
  class_id                  uuid        REFERENCES public.classes(id),
  academic_year_id          uuid        REFERENCES public.academic_years(id),
  attendance_date           date        NOT NULL DEFAULT CURRENT_DATE,
  status                    text        NOT NULL
                            CHECK (status IN ('present','absent','late','excused')),
  is_excused                boolean     NOT NULL DEFAULT false,
  excuse_reason             text,
  recorded_by_persona_id    uuid        REFERENCES public.user_personas(id),
  recorded_by_name_snapshot text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  -- سجل واحد لكل طالب في كل يوم لكل مدرسة
  UNIQUE (student_id, attendance_date, school_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sda_school_date
  ON public.student_daily_attendance (school_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_sda_student_year
  ON public.student_daily_attendance (student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_sda_class_date
  ON public.student_daily_attendance (class_id, attendance_date DESC);

-- Partial index للغيابات غير المبررة (الأكثر استخداماً في التقارير)
CREATE INDEX IF NOT EXISTS idx_sda_unexcused_absence
  ON public.student_daily_attendance (student_id, school_id, academic_year_id)
  WHERE status = 'absent' AND is_excused = false;

-- ─── updated_at auto-update ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sda_updated_at ON public.student_daily_attendance;
CREATE TRIGGER trg_sda_updated_at
  BEFORE UPDATE ON public.student_daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ─── Trigger: إحالة آلية عند تجاوز حد الغيابات ───────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_auto_referral_on_absence()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_absent_count  integer;
  v_existing_ref  uuid;
  v_student_name  text;
BEGIN
  -- نتفاعل فقط مع الغيابات غير المبررة
  IF NEW.status != 'absent' OR NEW.is_excused = true THEN
    RETURN NEW;
  END IF;

  -- عدّ الغيابات غير المبررة في السنة الدراسية الحالية
  SELECT COUNT(*) INTO v_absent_count
  FROM public.student_daily_attendance
  WHERE student_id       = NEW.student_id
    AND school_id        = NEW.school_id
    AND academic_year_id = NEW.academic_year_id
    AND status           = 'absent'
    AND is_excused       = false;

  -- الحد: 3 غيابات غير مبررة
  IF v_absent_count < 3 THEN
    RETURN NEW;
  END IF;

  -- لا ننشئ إحالة مكررة إذا كانت توجد إحالة مفتوحة
  SELECT id INTO v_existing_ref
  FROM public.behavioral_referrals
  WHERE student_id    = NEW.student_id
    AND referral_type = 'absence'
    AND status IN ('draft','pending_counselor','in_progress')
  LIMIT 1;

  IF v_existing_ref IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- جلب اسم الطالب
  SELECT COALESCE(name, 'الطالب') INTO v_student_name
  FROM public.student_profiles WHERE id = NEW.student_id;

  -- إنشاء الإحالة السلوكية تلقائياً
  INSERT INTO public.behavioral_referrals (
    student_id, referral_type, trigger_count, trigger_period,
    vp_reason, status, vp_sent_at
  ) VALUES (
    NEW.student_id,
    'absence',
    v_absent_count,
    'السنة الدراسية الحالية',
    format('إحالة آلية: تجاوز الطالب %s حد الغيابات غير المبررة (%s غيابات)', v_student_name, v_absent_count),
    'pending_counselor',
    now()
  );

  -- إشعار للموجه الطلابي
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    INSERT INTO public.notifications (
      school_id, recipient_role, notification_type,
      title, body, source_table, source_record_id
    ) VALUES (
      NEW.school_id,
      'student_counselor',
      'hr_ticket',
      format('إحالة غياب آلية: %s', v_student_name),
      format('تجاوز الطالب %s حد الغيابات غير المبررة (%s غيابات في السنة الدراسية الحالية)',
             v_student_name, v_absent_count),
      'student_daily_attendance',
      NEW.id
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_referral_on_absence ON public.student_daily_attendance;
CREATE TRIGGER trg_auto_referral_on_absence
  AFTER INSERT OR UPDATE ON public.student_daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_referral_on_absence();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.student_daily_attendance ENABLE ROW LEVEL SECURITY;

-- قراءة: جميع موظفي المدرسة
CREATE POLICY "sda_select" ON public.student_daily_attendance FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

-- إدخال: الأدوار المصرح لها بتسجيل الحضور
CREATE POLICY "sda_insert" ON public.student_daily_attendance FOR INSERT
  WITH CHECK (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'teacher',
      'system_owner'
    )
  );

-- تحديث: نفس الأدوار
CREATE POLICY "sda_update" ON public.student_daily_attendance FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND (auth.jwt()->'app_metadata'->>'role') IN (
      'student_affairs_vp', 'school_affairs_vp',
      'school_principal', 'school_admin', 'teacher',
      'system_owner'
    )
  );
