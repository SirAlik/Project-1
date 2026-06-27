-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 7 — تقدّم المنهج للمعلّم (Curriculum Progress)
-- ════════════════════════════════════════════════════════════════════════════
--
-- الخلفية (أكّدها تدقيق Sprint 6):
--   لا توجد ميزة حقيقية لتقدّم المنهج، ولا جداول منهج/درس/وحدة. الحقول
--   `curriculumProgress`/`curriculumDetails`/`curriculumCompletion` في تحليلات
--   المدير كانت placeholders ميتة (لا مصدر بيانات). هذه الهجرة تُنشئ الأساس
--   الحقيقي: بنية منهج لكل (مادة + صف) + تتبّع إنجاز لكل (فصل + درس)، والنسبة
--   تُشتقّ من إنجاز فعلي: completed_lessons / total_active_lessons * 100.
--
-- النموذج:
--   • `curriculum_units`   — وحدات المنهج لمادة عند صفّ معيّن (الخطة/المنهج).
--   • `curriculum_lessons` — دروس داخل كل وحدة.
--   • `class_curriculum_progress` — حالة إنجاز كل درس لفصل محدّد (لا نسبة مخزَّنة
--     يدوياً؛ النسبة تُحسب من عدّ الدروس المكتملة فعلياً).
--
-- العزل والصلاحيات (RLS):
--   • كل جدول tenant عليه `school_id NOT NULL` + RLS مفعّلة (لا USING(true)).
--   • تأليف المنهج (units/lessons): school_admin/school_principal/academic_vp
--     لمدرستهم فقط (المعلّم يستهلك المنهج ويُحدّث الإنجاز، لا يؤلّف الخطة).
--   • تقدّم الفصل: المعلّم يقرأ/يُحدّث **فقط للفصول المُسنَدة إليه** (يُفرَض عبر
--     الدالة الآمنة `is_assigned_class_teacher`)؛ الإدارة/الإشراف تقرأ على مستوى
--     المدرسة. لا قراءة/كتابة عابرة للمدارس.
--   • القراءة فقط لـ system_owner (مثل اصطلاح classroom_rewards) — بلا كتابة.
--
-- اصطلاحات مطابِقة للمشروع:
--   • `public.get_my_school_id()` لنطاق المدرسة · `auth.jwt()->'app_metadata'->>'role'`
--     للدور · `updated_by = auth.uid()` (بلا FK صارم لـ auth، مثل events/rewards).
--   • دالة SECURITY DEFINER لها search_path ثابت وEXECUTE لـ authenticated فقط
--     (مطلوبة للـ RLS مثل get_my_school_id) — متوافقة مع Security Hardening Sprint.
--
-- أثر التراجع:
--   جداول + دالة + فهارس + سياسات جديدة فقط (لا تغيير لأي كائن قائم). PRE-LAUNCH:
--   لا بيانات. التراجع:
--     DROP TABLE public.class_curriculum_progress CASCADE;
--     DROP TABLE public.curriculum_lessons CASCADE;
--     DROP TABLE public.curriculum_units CASCADE;
--     DROP FUNCTION public.is_assigned_class_teacher(uuid);
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) curriculum_units ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.curriculum_units (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
    subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    grade_level integer NOT NULL,
    title       text NOT NULL,
    description text,
    sort_order  integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT curriculum_units_unique UNIQUE (school_id, subject_id, grade_level, title)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_units_subject_grade
    ON public.curriculum_units (school_id, subject_id, grade_level);

-- ── 2) curriculum_lessons ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.curriculum_lessons (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    unit_id           uuid NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
    title             text NOT NULL,
    description       text,
    sort_order        integer NOT NULL DEFAULT 0,
    estimated_periods integer NOT NULL DEFAULT 1,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT curriculum_lessons_unique UNIQUE (unit_id, title)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_unit   ON public.curriculum_lessons (unit_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_school ON public.curriculum_lessons (school_id);

-- ── 3) class_curriculum_progress ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_curriculum_progress (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id     uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    lesson_id    uuid NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'not_started'
                 CHECK (status IN ('not_started', 'in_progress', 'completed')),
    completed_at timestamptz,
    notes        text,
    updated_by   uuid,                          -- auth.uid() لآخر مُحدِّث (بلا FK صارم)
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT class_curriculum_progress_unique UNIQUE (class_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_ccp_school ON public.class_curriculum_progress (school_id);
CREATE INDEX IF NOT EXISTS idx_ccp_lesson ON public.class_curriculum_progress (lesson_id);

-- ── 4) دالة فحص تكليف المعلّم (آمنة، تُستخدم في RLS) ──────────────────────────
-- تتجنّب تكرار RLS-within-RLS؛ تُرجع true إن كان المُستدعي معلّماً مُسنَداً للفصل.
CREATE OR REPLACE FUNCTION public.is_assigned_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        WHERE ta.class_id = p_class_id
          AND ta.teacher_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_assigned_class_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assigned_class_teacher(uuid) TO authenticated;

-- ── 5) RLS: curriculum_units ─────────────────────────────────────────────────
ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY cu_select ON public.curriculum_units FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['teacher','school_admin','school_principal','academic_vp']))
);

CREATE POLICY cu_insert ON public.curriculum_units FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

CREATE POLICY cu_update ON public.curriculum_units FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

CREATE POLICY cu_delete ON public.curriculum_units FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

-- ── 6) RLS: curriculum_lessons ───────────────────────────────────────────────
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY cl_select ON public.curriculum_lessons FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['teacher','school_admin','school_principal','academic_vp']))
);

CREATE POLICY cl_insert ON public.curriculum_lessons FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

CREATE POLICY cl_update ON public.curriculum_lessons FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

CREATE POLICY cl_delete ON public.curriculum_lessons FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role')
        = ANY (ARRAY['school_admin','school_principal','academic_vp'])
);

-- ── 7) RLS: class_curriculum_progress ────────────────────────────────────────
ALTER TABLE public.class_curriculum_progress ENABLE ROW LEVEL SECURITY;

-- قراءة: system_owner · إدارة/إشراف المدرسة · المعلّم للفصول المُسنَدة إليه فقط
CREATE POLICY ccp_select ON public.class_curriculum_progress FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
        AND public.is_assigned_class_teacher(class_id))
);

-- إدراج: إدارة/إشراف المدرسة لأي فصل · المعلّم للفصول المُسنَدة فقط
CREATE POLICY ccp_insert ON public.class_curriculum_progress FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
        ((auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
        OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
            AND public.is_assigned_class_teacher(class_id))
    )
);

-- تحديث: نفس قاعدة الإدراج (USING + WITH CHECK لمنع تهريب الصف لمدرسة/فصل آخر)
CREATE POLICY ccp_update ON public.class_curriculum_progress FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (
        ((auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
        OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
            AND public.is_assigned_class_teacher(class_id))
    )
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
        ((auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
        OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
            AND public.is_assigned_class_teacher(class_id))
    )
);

-- حذف: إدارة المدرسة · المعلّم للفصول المُسنَدة فقط
CREATE POLICY ccp_delete ON public.class_curriculum_progress FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (
        ((auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal']))
        OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
            AND public.is_assigned_class_teacher(class_id))
    )
);
