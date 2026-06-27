-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 8 — تصحيح نموذج توزيع المنهج (Teacher-authored Curriculum Distribution)
-- ════════════════════════════════════════════════════════════════════════════
--
-- الخطأ التصميمي في Sprint 7:
--   • `curriculum_units` كانت بنطاق عالمي (subject_id + grade_level) — خطة واحدة
--     مشتركة لكل فصول الصف، يؤلّفها admin/principal/academic_vp فقط.
--   • القيد UNIQUE(school_id, subject_id, grade_level, title) يمنع فصلين/معلّمين
--     من امتلاك توزيعهما الخاص بنفس العنوان.
--   • RLS كانت تسمح بالتأليف للإدارة فقط، والمعلّم يُحدّث الإنجاز فقط.
--
-- التصحيح الميداني الصحيح في سِدرة:
--   الإدارة **تُسند** المعلّم للمادة/الفصل فقط؛ والمعلّم المُسنَد **يؤلّف ويدير**
--   توزيع المنهج (وحدات/دروس/تواريخ مخطّطة/ترتيب/حالة/ملاحظات) لفصله ومادته.
--   الإدارة/الإشراف **يتابعون** الإنجاز فقط (قراءة)، بلا تأليف افتراضي.
--
-- النموذج المصحّح (إعادة تحجيم — "adapt current tables"):
--   • `curriculum_units`   → بنطاق (class_id + subject_id)، يؤلّفها المعلّم المُسنَد.
--   • `curriculum_lessons` → تحت `unit_id`، وتحمل حالتها بنفسها (status/completed_at)
--     + planned_date + notes (الدرس خاص بالفصل، فلا حاجة لجدول تقدّم منفصل).
--   • `class_curriculum_progress` → **يُحذف** (التقدّم صار على الدرس مباشرةً).
--   النسبة تبقى من إنجاز فعلي: completed_lessons / total_active_lessons * 100.
--
-- العزل والصلاحيات (RLS):
--   • كل صف: school_id NOT NULL + RLS + لا USING(true).
--   • التأليف (INSERT/UPDATE/DELETE على units/lessons): المعلّم المُسنَد فقط
--     (is_assigned_subject_teacher للوحدات · is_unit_owner_teacher للدروس).
--   • القراءة: system_owner + إدارة/إشراف المدرسة (متابعة) + المعلّم المُسنَد.
--   • **لا تأليف للإدارة** (school_admin/principal/academic_vp = قراءة فقط).
--   • school_id = get_my_school_id() (يقرأ مدرسة التوكن) → عبر-المدارس مستحيل.
--
-- أمان البيانات: DB حيّة = 0 صفوف في الجداول الثلاثة (PRE-LAUNCH) — drop آمن.
-- التراجع:
--   DROP TABLE public.curriculum_lessons CASCADE;
--   DROP TABLE public.curriculum_units CASCADE;
--   DROP FUNCTION public.is_assigned_subject_teacher(uuid, uuid);
--   DROP FUNCTION public.is_unit_owner_teacher(uuid);
--   (ولإعادة Sprint 7: أعد تطبيق 20260701_curriculum_progress.sql)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0) إسقاط كائنات Sprint 7 (PRE-LAUNCH · 0 صفوف) ───────────────────────────
DROP TABLE IF EXISTS public.class_curriculum_progress CASCADE;
DROP TABLE IF EXISTS public.curriculum_lessons CASCADE;
DROP TABLE IF EXISTS public.curriculum_units CASCADE;
DROP FUNCTION IF EXISTS public.is_assigned_class_teacher(uuid);

-- ── 1) curriculum_units — بنطاق (فصل + مادة)، يؤلّفها المعلّم ──────────────────
CREATE TABLE public.curriculum_units (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
    class_id    uuid NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
    subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    sort_order  integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_by  uuid,                      -- auth.uid() للمعلّم المؤلِّف (بلا FK صارم)
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT curriculum_units_unique UNIQUE (class_id, subject_id, title)
);
CREATE INDEX idx_curriculum_units_school        ON public.curriculum_units (school_id);
CREATE INDEX idx_curriculum_units_class_subject ON public.curriculum_units (class_id, subject_id, sort_order);

-- ── 2) curriculum_lessons — تحت الوحدة، تحمل الحالة + التاريخ المخطّط ─────────
CREATE TABLE public.curriculum_lessons (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    unit_id           uuid NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
    title             text NOT NULL,
    planned_date      date,
    sort_order        integer NOT NULL DEFAULT 0,
    estimated_periods integer NOT NULL DEFAULT 1,
    status            text NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started', 'in_progress', 'completed')),
    completed_at      timestamptz,
    notes             text,
    is_active         boolean NOT NULL DEFAULT true,
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT curriculum_lessons_unique UNIQUE (unit_id, title)
);
CREATE INDEX idx_curriculum_lessons_school ON public.curriculum_lessons (school_id);
CREATE INDEX idx_curriculum_lessons_unit   ON public.curriculum_lessons (unit_id, sort_order);

-- ── 3) دوال فحص التكليف (آمنة، تُستخدم في RLS) ───────────────────────────────
-- المعلّم مُسنَد لـ (فصل + مادة)؟ — لتأليف الوحدات.
CREATE OR REPLACE FUNCTION public.is_assigned_subject_teacher(p_class_id uuid, p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        WHERE ta.class_id = p_class_id
          AND ta.subject_id = p_subject_id
          AND ta.teacher_id = auth.uid()
    );
$$;
REVOKE ALL ON FUNCTION public.is_assigned_subject_teacher(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assigned_subject_teacher(uuid, uuid) TO authenticated;

-- المعلّم يملك الوحدة (مُسنَد لفصلها+مادتها)؟ — لتأليف الدروس تحتها.
CREATE OR REPLACE FUNCTION public.is_unit_owner_teacher(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.curriculum_units u
        JOIN public.teacher_assignments ta
          ON ta.class_id = u.class_id AND ta.subject_id = u.subject_id
        WHERE u.id = p_unit_id
          AND ta.teacher_id = auth.uid()
    );
$$;
REVOKE ALL ON FUNCTION public.is_unit_owner_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_unit_owner_teacher(uuid) TO authenticated;

-- ── 4) RLS: curriculum_units (تأليف للمعلّم المُسنَد · قراءة للإدارة) ──────────
ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;

-- قراءة: system_owner · إدارة/إشراف المدرسة (متابعة) · المعلّم المُسنَد
CREATE POLICY cu_select ON public.curriculum_units FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
        AND public.is_assigned_subject_teacher(class_id, subject_id))
);

-- تأليف (إدراج/تحديث/حذف): المعلّم المُسنَد فقط — لا تأليف للإدارة
CREATE POLICY cu_insert ON public.curriculum_units FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_assigned_subject_teacher(class_id, subject_id)
);
CREATE POLICY cu_update ON public.curriculum_units FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_assigned_subject_teacher(class_id, subject_id)
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_assigned_subject_teacher(class_id, subject_id)
);
CREATE POLICY cu_delete ON public.curriculum_units FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_assigned_subject_teacher(class_id, subject_id)
);

-- ── 5) RLS: curriculum_lessons (تأليف لمالك الوحدة · قراءة للإدارة) ───────────
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY cl_select ON public.curriculum_lessons FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role')
            = ANY (ARRAY['school_admin','school_principal','academic_vp']))
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
        AND public.is_unit_owner_teacher(unit_id))
);

CREATE POLICY cl_insert ON public.curriculum_lessons FOR INSERT
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_unit_owner_teacher(unit_id)
);
CREATE POLICY cl_update ON public.curriculum_lessons FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_unit_owner_teacher(unit_id)
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_unit_owner_teacher(unit_id)
);
CREATE POLICY cl_delete ON public.curriculum_lessons FOR DELETE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
    AND public.is_unit_owner_teacher(unit_id)
);
