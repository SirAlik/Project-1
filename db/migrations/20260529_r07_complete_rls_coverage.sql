-- =================================================================
-- R07: تغطية RLS الكاملة — 23 جدول بدون حماية
-- التاريخ: 2026-05-28
-- =================================================================
-- CLAUDE.md mandate:
--   ✅ "There is no data to migrate"
--   ✅ "Destroy and rebuild correctly"
--   ❌ HARD REJECT: Nullable school_id on any active table
--   ❌ HARD REJECT: Backfill logic / any assumption that data exists
--
-- الاستراتيجية:
--   كل جدول يحتاج school_id →
--     DROP COLUMN IF EXISTS school_id CASCADE   (يُزيل السياسات والـ indexes القديمة)
--     ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id)
--
-- لا يوجد IF NOT EXISTS. لا يوجد backfill. لا nullable. أبداً.
-- إذا فشل الـ ADD COLUMN NOT NULL → هناك بيانات يجب حذفها أولاً.
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_my_school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة — طبّق R00 أولاً';
    END IF;
    RAISE NOTICE 'Preflight ✓';
END $$;

-- ============================================================
-- تنظيف البيانات التجريبية
-- CLAUDE.md: "There are zero real users. There is zero live data."
-- أي بيانات موجودة هي تجريبية — الـ TRUNCATE واجب قبل ADD COLUMN NOT NULL
-- ============================================================
TRUNCATE TABLE public.attendance_scans        CASCADE;
TRUNCATE TABLE public.cases                   CASCADE;
TRUNCATE TABLE public.classroom_metadata      CASCADE;
TRUNCATE TABLE public.employee_leaves         CASCADE;
TRUNCATE TABLE public.gradebook_items         CASCADE;
TRUNCATE TABLE public.health_awareness        CASCADE;
TRUNCATE TABLE public.health_referrals        CASCADE;
TRUNCATE TABLE public.health_visits           CASCADE;
TRUNCATE TABLE public.interventions           CASCADE;
TRUNCATE TABLE public.lab_bookings            CASCADE;
TRUNCATE TABLE public.lab_experiments         CASCADE;
TRUNCATE TABLE public.lab_inventory           CASCADE;
TRUNCATE TABLE public.lrc_books               CASCADE;
TRUNCATE TABLE public.lrc_loans               CASCADE;
TRUNCATE TABLE public.lrc_visit_attendance    CASCADE;
TRUNCATE TABLE public.lrc_visits              CASCADE;
TRUNCATE TABLE public.parent_notes            CASCADE;
TRUNCATE TABLE public.qa_kpis_daily           CASCADE;
TRUNCATE TABLE public.qa_observations         CASCADE;
TRUNCATE TABLE public.secretary_correspondence CASCADE;
TRUNCATE TABLE public.student_risk_flags      CASCADE;

-- ============================================================
-- تطبيق school_id NOT NULL على جميع الجداول التي تحتاجه
-- الترتيب: DROP CASCADE (يُزيل كل التبعيات القديمة) ثم ADD NOT NULL
-- ============================================================

-- 1. attendance_scans
ALTER TABLE public.attendance_scans DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.attendance_scans ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 2. cases  (R06 أضافها nullable — نُعيد بناءها NOT NULL)
ALTER TABLE public.cases DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.cases ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 3. classroom_metadata
ALTER TABLE public.classroom_metadata DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.classroom_metadata ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 4. employee_leaves
ALTER TABLE public.employee_leaves DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.employee_leaves ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 5. gradebook_items
ALTER TABLE public.gradebook_items DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.gradebook_items ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 6. health_awareness
ALTER TABLE public.health_awareness DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.health_awareness ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 7. health_referrals
ALTER TABLE public.health_referrals DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.health_referrals ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 8. health_visits
ALTER TABLE public.health_visits DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.health_visits ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 9. interventions
ALTER TABLE public.interventions DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.interventions ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 10. lab_bookings
ALTER TABLE public.lab_bookings DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lab_bookings ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 11. lab_experiments
ALTER TABLE public.lab_experiments DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lab_experiments ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 12. lab_inventory
ALTER TABLE public.lab_inventory DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lab_inventory ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 13. lrc_books
ALTER TABLE public.lrc_books DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lrc_books ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 14. lrc_loans
ALTER TABLE public.lrc_loans DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lrc_loans ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 15. lrc_visit_attendance
ALTER TABLE public.lrc_visit_attendance DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lrc_visit_attendance ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 16. lrc_visits
ALTER TABLE public.lrc_visits DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.lrc_visits ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 17. parent_notes
ALTER TABLE public.parent_notes DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.parent_notes ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 18. qa_kpis_daily
ALTER TABLE public.qa_kpis_daily DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.qa_kpis_daily ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 19. qa_observations
ALTER TABLE public.qa_observations DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.qa_observations ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 20. secretary_correspondence
ALTER TABLE public.secretary_correspondence DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.secretary_correspondence ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- 21. student_risk_flags
ALTER TABLE public.student_risk_flags DROP COLUMN IF EXISTS school_id CASCADE;
ALTER TABLE public.student_risk_flags ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id);

-- ============================================================
-- فهارس الأداء (تُعاد بعد DROP CASCADE)
-- ============================================================

CREATE INDEX idx_attendance_scans_school         ON public.attendance_scans         (school_id);
CREATE INDEX idx_cases_school                    ON public.cases                    (school_id);
CREATE INDEX idx_classroom_metadata_school       ON public.classroom_metadata       (school_id);
CREATE INDEX idx_employee_leaves_school          ON public.employee_leaves          (school_id);
CREATE INDEX idx_gradebook_items_school          ON public.gradebook_items          (school_id);
CREATE INDEX idx_health_awareness_school         ON public.health_awareness         (school_id);
CREATE INDEX idx_health_referrals_school         ON public.health_referrals         (school_id);
CREATE INDEX idx_health_visits_school            ON public.health_visits            (school_id);
CREATE INDEX idx_interventions_school            ON public.interventions            (school_id);
CREATE INDEX idx_lab_bookings_school             ON public.lab_bookings             (school_id);
CREATE INDEX idx_lab_experiments_school          ON public.lab_experiments          (school_id);
CREATE INDEX idx_lab_inventory_school            ON public.lab_inventory            (school_id);
CREATE INDEX idx_lrc_books_school                ON public.lrc_books                (school_id);
CREATE INDEX idx_lrc_loans_school                ON public.lrc_loans                (school_id);
CREATE INDEX idx_lrc_visit_attendance_school     ON public.lrc_visit_attendance     (school_id);
CREATE INDEX idx_lrc_visits_school               ON public.lrc_visits               (school_id);
CREATE INDEX idx_parent_notes_school             ON public.parent_notes             (school_id);
CREATE INDEX idx_qa_kpis_daily_school            ON public.qa_kpis_daily            (school_id);
CREATE INDEX idx_qa_observations_school          ON public.qa_observations           (school_id);
CREATE INDEX idx_secretary_correspondence_school ON public.secretary_correspondence  (school_id);
CREATE INDEX idx_student_risk_flags_school       ON public.student_risk_flags        (school_id);

-- ============================================================
-- تفعيل RLS على جميع الـ 23 جدول
-- ============================================================

ALTER TABLE public.action_idempotency      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_scans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_metadata      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leaves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebook_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_awareness        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_experiments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lrc_books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lrc_loans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lrc_visit_attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lrc_visits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_kpis_daily           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_observations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_correspondence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_risk_flags      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- السياسات
-- النمط الذهبي: system_owner يرى الكل | باقي الأدوار: school_id = get_my_school_id()
-- ============================================================

-- ── 1. action_idempotency — عزل بـ user_id (لا school context)
DROP POLICY IF EXISTS "ai_own" ON public.action_idempotency;
CREATE POLICY "ai_own" ON public.action_idempotency
    FOR ALL
    USING  (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── 2. schools — id هو الـ school context
DROP POLICY IF EXISTS "schools_system_owner" ON public.schools;
DROP POLICY IF EXISTS "schools_own_read"     ON public.schools;
CREATE POLICY "schools_system_owner" ON public.schools
    FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner');
CREATE POLICY "schools_own_read" ON public.schools
    FOR SELECT USING (id = public.get_my_school_id());

-- ── 3. cases
DROP POLICY IF EXISTS "cases_select" ON public.cases;
DROP POLICY IF EXISTS "cases_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_update" ON public.cases;
CREATE POLICY "cases_select" ON public.cases FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','student_affairs_vp','student_counselor','teacher'))
);
CREATE POLICY "cases_insert" ON public.cases FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin','school_principal','student_affairs_vp','student_counselor','teacher')
);
CREATE POLICY "cases_update" ON public.cases FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'school_admin','school_principal','student_affairs_vp','student_counselor'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin','school_principal','student_affairs_vp','student_counselor'));

-- ── 4. attendance_scans
DROP POLICY IF EXISTS "as_select" ON public.attendance_scans;
DROP POLICY IF EXISTS "as_insert" ON public.attendance_scans;
CREATE POLICY "as_select" ON public.attendance_scans FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp',
            'student_affairs_vp','health_coordinator','teacher','school_secretary'))
);
CREATE POLICY "as_insert" ON public.attendance_scans FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator','student_affairs_vp','school_admin','school_principal')
);

-- ── 5. employee_leaves
DROP POLICY IF EXISTS "el_select" ON public.employee_leaves;
DROP POLICY IF EXISTS "el_insert" ON public.employee_leaves;
DROP POLICY IF EXISTS "el_update" ON public.employee_leaves;
CREATE POLICY "el_select" ON public.employee_leaves FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','school_secretary'))
);
CREATE POLICY "el_insert" ON public.employee_leaves FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_secretary','school_admin','school_principal')
);
CREATE POLICY "el_update" ON public.employee_leaves FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin','school_principal'));

-- ── 6. health_visits
DROP POLICY IF EXISTS "hv_select" ON public.health_visits;
DROP POLICY IF EXISTS "hv_insert" ON public.health_visits;
DROP POLICY IF EXISTS "hv_update" ON public.health_visits;
CREATE POLICY "hv_select" ON public.health_visits FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','student_affairs_vp','health_coordinator'))
);
CREATE POLICY "hv_insert" ON public.health_visits FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator','school_admin','school_principal')
);
CREATE POLICY "hv_update" ON public.health_visits FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('health_coordinator','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('health_coordinator','school_admin'));

-- ── 7. health_referrals
DROP POLICY IF EXISTS "hr_select" ON public.health_referrals;
DROP POLICY IF EXISTS "hr_insert" ON public.health_referrals;
CREATE POLICY "hr_select" ON public.health_referrals FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','health_coordinator','student_affairs_vp'))
);
CREATE POLICY "hr_insert" ON public.health_referrals FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator','school_admin','school_principal')
);

-- ── 8. health_awareness (قراءة مفتوحة لكل طاقم المدرسة — محتوى توعوي)
DROP POLICY IF EXISTS "ha_select" ON public.health_awareness;
DROP POLICY IF EXISTS "ha_insert" ON public.health_awareness;
DROP POLICY IF EXISTS "ha_update" ON public.health_awareness;
CREATE POLICY "ha_select" ON public.health_awareness FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
CREATE POLICY "ha_insert" ON public.health_awareness FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator','school_admin','school_principal')
);
CREATE POLICY "ha_update" ON public.health_awareness FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('health_coordinator','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('health_coordinator','school_admin'));

-- ── 9. interventions
DROP POLICY IF EXISTS "iv_select" ON public.interventions;
DROP POLICY IF EXISTS "iv_insert" ON public.interventions;
DROP POLICY IF EXISTS "iv_update" ON public.interventions;
CREATE POLICY "iv_select" ON public.interventions FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','student_affairs_vp','student_counselor'))
);
CREATE POLICY "iv_insert" ON public.interventions FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_counselor','student_affairs_vp','school_principal')
);
CREATE POLICY "iv_update" ON public.interventions FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'student_counselor','student_affairs_vp','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'student_counselor','student_affairs_vp','school_principal'));

-- ── 10. lab_inventory
DROP POLICY IF EXISTS "li_select" ON public.lab_inventory;
DROP POLICY IF EXISTS "li_insert" ON public.lab_inventory;
DROP POLICY IF EXISTS "li_update" ON public.lab_inventory;
CREATE POLICY "li_select" ON public.lab_inventory FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp','lab_technician','teacher'))
);
CREATE POLICY "li_insert" ON public.lab_inventory FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'lab_technician','school_admin','school_principal')
);
CREATE POLICY "li_update" ON public.lab_inventory FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('lab_technician','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('lab_technician','school_admin'));

-- ── 11. lab_experiments
DROP POLICY IF EXISTS "le_select" ON public.lab_experiments;
DROP POLICY IF EXISTS "le_insert" ON public.lab_experiments;
DROP POLICY IF EXISTS "le_update" ON public.lab_experiments;
CREATE POLICY "le_select" ON public.lab_experiments FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp','lab_technician','teacher'))
);
CREATE POLICY "le_insert" ON public.lab_experiments FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'lab_technician','school_admin','school_principal')
);
CREATE POLICY "le_update" ON public.lab_experiments FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('lab_technician','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('lab_technician','school_admin'));

-- ── 12. lab_bookings
DROP POLICY IF EXISTS "lbk_select" ON public.lab_bookings;
DROP POLICY IF EXISTS "lbk_insert" ON public.lab_bookings;
DROP POLICY IF EXISTS "lbk_update" ON public.lab_bookings;
CREATE POLICY "lbk_select" ON public.lab_bookings FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp','lab_technician','teacher'))
);
CREATE POLICY "lbk_insert" ON public.lab_bookings FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'teacher','lab_technician','school_admin','school_principal')
);
CREATE POLICY "lbk_update" ON public.lab_bookings FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'lab_technician','school_admin','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'lab_technician','school_admin','school_principal'));

-- ── 13. lrc_books
DROP POLICY IF EXISTS "lrcb_select" ON public.lrc_books;
DROP POLICY IF EXISTS "lrcb_insert" ON public.lrc_books;
DROP POLICY IF EXISTS "lrcb_update" ON public.lrc_books;
CREATE POLICY "lrcb_select" ON public.lrc_books FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','school_librarian','teacher','student_affairs_vp'))
);
CREATE POLICY "lrcb_insert" ON public.lrc_books FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_librarian','school_admin','school_principal')
);
CREATE POLICY "lrcb_update" ON public.lrc_books FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_librarian','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_librarian','school_admin'));

-- ── 14. lrc_loans
DROP POLICY IF EXISTS "lrcl_select" ON public.lrc_loans;
DROP POLICY IF EXISTS "lrcl_insert" ON public.lrc_loans;
DROP POLICY IF EXISTS "lrcl_update" ON public.lrc_loans;
CREATE POLICY "lrcl_select" ON public.lrc_loans FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian','school_admin','school_principal'))
);
CREATE POLICY "lrcl_insert" ON public.lrc_loans FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_librarian','school_admin')
);
CREATE POLICY "lrcl_update" ON public.lrc_loans FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_librarian','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_librarian','school_admin'));

-- ── 15. lrc_visits
DROP POLICY IF EXISTS "lrcv_select" ON public.lrc_visits;
DROP POLICY IF EXISTS "lrcv_insert" ON public.lrc_visits;
CREATE POLICY "lrcv_select" ON public.lrc_visits FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian','teacher','school_admin','school_principal','academic_vp'))
);
CREATE POLICY "lrcv_insert" ON public.lrc_visits FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_librarian','teacher','school_admin')
);

-- ── 16. lrc_visit_attendance
DROP POLICY IF EXISTS "lrcva_select" ON public.lrc_visit_attendance;
DROP POLICY IF EXISTS "lrcva_insert" ON public.lrc_visit_attendance;
CREATE POLICY "lrcva_select" ON public.lrc_visit_attendance FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian','teacher','school_admin','school_principal'))
);
CREATE POLICY "lrcva_insert" ON public.lrc_visit_attendance FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_librarian','teacher','school_admin')
);

-- ── 17. parent_notes
DROP POLICY IF EXISTS "pn_select" ON public.parent_notes;
DROP POLICY IF EXISTS "pn_insert" ON public.parent_notes;
CREATE POLICY "pn_select" ON public.parent_notes FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher','student_affairs_vp','student_counselor','school_principal','school_admin'))
);
CREATE POLICY "pn_insert" ON public.parent_notes FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'teacher','student_affairs_vp','student_counselor')
);

-- ── 18. qa_observations
DROP POLICY IF EXISTS "qo_select" ON public.qa_observations;
DROP POLICY IF EXISTS "qo_insert" ON public.qa_observations;
DROP POLICY IF EXISTS "qo_update" ON public.qa_observations;
CREATE POLICY "qo_select" ON public.qa_observations FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp','quality_coordinator'))
);
CREATE POLICY "qo_insert" ON public.qa_observations FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'quality_coordinator','school_principal','academic_vp')
);
CREATE POLICY "qo_update" ON public.qa_observations FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('quality_coordinator','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('quality_coordinator','school_principal'));

-- ── 19. qa_kpis_daily
DROP POLICY IF EXISTS "qk_select" ON public.qa_kpis_daily;
DROP POLICY IF EXISTS "qk_insert" ON public.qa_kpis_daily;
CREATE POLICY "qk_select" ON public.qa_kpis_daily FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','academic_vp','quality_coordinator'))
);
CREATE POLICY "qk_insert" ON public.qa_kpis_daily FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'quality_coordinator','school_admin','school_principal')
);

-- ── 20. secretary_correspondence
DROP POLICY IF EXISTS "sc_select" ON public.secretary_correspondence;
DROP POLICY IF EXISTS "sc_insert" ON public.secretary_correspondence;
DROP POLICY IF EXISTS "sc_update" ON public.secretary_correspondence;
CREATE POLICY "sc_select" ON public.secretary_correspondence FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_secretary','school_admin','school_principal'))
);
CREATE POLICY "sc_insert" ON public.secretary_correspondence FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_secretary','school_admin','school_principal')
);
CREATE POLICY "sc_update" ON public.secretary_correspondence FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_secretary','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_secretary','school_admin'));

-- ── 21. student_risk_flags
DROP POLICY IF EXISTS "srf_select" ON public.student_risk_flags;
DROP POLICY IF EXISTS "srf_insert" ON public.student_risk_flags;
DROP POLICY IF EXISTS "srf_update" ON public.student_risk_flags;
CREATE POLICY "srf_select" ON public.student_risk_flags FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin','school_principal','student_affairs_vp','student_counselor'))
);
CREATE POLICY "srf_insert" ON public.student_risk_flags FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_counselor','student_affairs_vp','school_admin')
);
CREATE POLICY "srf_update" ON public.student_risk_flags FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'student_counselor','student_affairs_vp','school_admin'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'student_counselor','student_affairs_vp','school_admin'));

-- ── 22. classroom_metadata
DROP POLICY IF EXISTS "cm_select" ON public.classroom_metadata;
DROP POLICY IF EXISTS "cm_insert" ON public.classroom_metadata;
DROP POLICY IF EXISTS "cm_update" ON public.classroom_metadata;
CREATE POLICY "cm_select" ON public.classroom_metadata FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher','school_admin','school_principal','academic_vp'))
);
CREATE POLICY "cm_insert" ON public.classroom_metadata FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'teacher','school_admin','school_principal')
);
CREATE POLICY "cm_update" ON public.classroom_metadata FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'teacher','school_admin','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'teacher','school_admin','school_principal'));

-- ── 23. gradebook_items
DROP POLICY IF EXISTS "gi_select" ON public.gradebook_items;
DROP POLICY IF EXISTS "gi_insert" ON public.gradebook_items;
DROP POLICY IF EXISTS "gi_update" ON public.gradebook_items;
CREATE POLICY "gi_select" ON public.gradebook_items FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher','school_admin','school_principal','academic_vp'))
);
CREATE POLICY "gi_insert" ON public.gradebook_items FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'teacher','school_admin','school_principal')
);
CREATE POLICY "gi_update" ON public.gradebook_items FOR UPDATE
USING (school_id = public.get_my_school_id()
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
           'teacher','school_admin','school_principal'))
WITH CHECK (school_id = public.get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'teacher','school_admin','school_principal'));

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_open integer;
    v_targets text[] := ARRAY[
        'action_idempotency','attendance_scans','cases','classroom_metadata',
        'employee_leaves','gradebook_items','health_awareness','health_referrals',
        'health_visits','interventions','lab_bookings','lab_experiments',
        'lab_inventory','lrc_books','lrc_loans','lrc_visit_attendance',
        'lrc_visits','parent_notes','qa_kpis_daily','qa_observations',
        'schools','secretary_correspondence','student_risk_flags'
    ];
    v_nullable integer;
BEGIN
    SELECT COUNT(*) INTO v_open
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      AND NOT relrowsecurity
      AND relname = ANY(v_targets);

    IF v_open > 0 THEN
        RAISE EXCEPTION 'FAIL: % جدول لا يزال بدون RLS — تحقق من الترتيب', v_open;
    END IF;

    SELECT COUNT(*) INTO v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'school_id'
      AND is_nullable = 'YES'
      AND table_name = ANY(v_targets);

    IF v_nullable > 0 THEN
        RAISE EXCEPTION 'FAIL: % جدول لديه school_id nullable — CLAUDE.md يرفض هذا', v_nullable;
    END IF;

    RAISE NOTICE '✅ R07 اكتمل: 23 جدول — RLS مُفعَّل + school_id NOT NULL';
END $$;

COMMIT;

-- ── بوابة التحقق السريع (بعد COMMIT):
-- SELECT relname FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace
--   AND relkind = 'r' AND NOT relrowsecurity ORDER BY relname;
-- النتيجة المتوقعة: صفر جداول من القائمة الـ 23
