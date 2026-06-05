-- ============================================================
-- Migration: medium_risk_cleanup
-- Date: 2026-06-05
-- ============================================================
-- الهدف (Medium Risk — فحص DB الحية 2026-06-05):
--   1. حذف 8 indexes مكررة (regular index + UNIQUE constraint على نفس الأعمدة)
--   2. حذف 8 سياسات RLS قديمة/خاطئة/مكررة — permissive duplicates
--   3. إضافة indexes على school_id في 13 جدول tenant بلا تغطية
--   4. إضافة ~27 index على FKs عالية الاستخدام (تحسين أداء RLS والـ joins)
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- Section 1: حذف الـ Indexes المكررة
-- في كل حالة: UNIQUE constraint index يُغطي نفس الأعمدة
-- → الـ regular index مكرر تماماً، يُبطئ الكتابات بدون فائدة
-- ════════════════════════════════════════════════════════════════

-- student_profiles(national_id): كلاهما non-unique — نحذف الاسم القديم
DROP INDEX IF EXISTS idx_students_national_id;

-- action_idempotency(user_id, idempotency_key): UNIQUE constraint موجود
DROP INDEX IF EXISTS idx_idempotency_lookup;

-- canteen_checks(school_id, check_date): UNIQUE cc_one_per_day موجود
DROP INDEX IF EXISTS idx_cc_school_date;

-- class_weekly_summary(school_id, class_id, week_start): UNIQUE constraint موجود
DROP INDEX IF EXISTS idx_cws_school_class;

-- rate_limit_tracker(user_id, action_type, window_start): UNIQUE constraint موجود
DROP INDEX IF EXISTS idx_rlt_user_action_window;

-- student_assets(school_id, asset_identifier): UNIQUE sa_identifier_unique موجود
DROP INDEX IF EXISTS idx_sa_identifier;

-- quality_indicators(school_id, code): UNIQUE constraint موجود
DROP INDEX IF EXISTS idx_qi_code;

-- invites(token): UNIQUE invites_token_key موجود — idx_invites_token regular مكرر
DROP INDEX IF EXISTS idx_invites_token;


-- ════════════════════════════════════════════════════════════════
-- Section 2: حذف سياسات RLS القديمة/الخاطئة/المكررة
-- ════════════════════════════════════════════════════════════════

-- case_actions INSERT/SELECT:
-- "Write Actions" / "Read Actions" تتحققان فقط من وجود case مرتبط
-- بلا أي فحص لـ school_id أو الدور → أي مستخدم يملك case يستطيع القراءة/الكتابة في أي مدرسة
-- case_actions_insert / case_actions_select الجديدتان تُغنيان عنهما بشكل صحيح
DROP POLICY IF EXISTS "Write Actions" ON public.case_actions;
DROP POLICY IF EXISTS "Read Actions"  ON public.case_actions;

-- cases UPDATE:
-- cases_update يستخدم get_my_school_id() (security definer function)
-- cases_update_assigned أحدث: JWT مباشر + يدعم system_owner
DROP POLICY IF EXISTS cases_update ON public.cases;

-- invites SELECT:
-- "Users read invites" تستخدم subquery ثقيلة على user_personas + is_system_owner()
-- invites_select أبسط وتكفي: get_my_school_id() → JWT مباشر
DROP POLICY IF EXISTS "Users read invites" ON public.invites;

-- profiles SELECT/UPDATE:
-- "Users read own profile"   USING: (id = auth.uid())   ← مكرر تماماً مع users_read_own_profile
-- "Users update own profile" USING: (id = auth.uid())   ← مكرر تماماً مع users_update_own_profile
-- الفرق الوحيد ترتيب المتغيرات في المقارنة — متساويان دلالياً
DROP POLICY IF EXISTS "Users read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- student_honors SELECT:
-- "Students View Own Honors" USING: (student_id = auth.uid())
-- خاطئة بنيوياً: student_id يُشير إلى student_profiles.id وليس profiles.id (auth.uid())
-- → النتيجة = false دائماً لأي مستخدم حقيقي (سياسة ميتة)
-- student_honors_select تُغطي الاستخدام الصحيح
DROP POLICY IF EXISTS "Students View Own Honors" ON public.student_honors;

-- student_wishes SELECT:
-- نفس المشكلة: student_id ≠ auth.uid() → سياسة ميتة بنيوياً
-- student_wishes_select تُغطي الاستخدام الصحيح
DROP POLICY IF EXISTS "Students View Own Wishes" ON public.student_wishes;


-- ════════════════════════════════════════════════════════════════
-- Section 3: إضافة school_id indexes على 13 جدول tenant
-- هذه الجداول تملك FK constraint على school_id لكن بلا index
-- → RLS policy evaluation تصبح seq scan بدل index scan
-- ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_activity_trips_school         ON public.activity_trips            (school_id);
CREATE INDEX IF NOT EXISTS idx_club_assignments_school       ON public.club_assignments          (school_id);
CREATE INDEX IF NOT EXISTS idx_club_evaluations_school       ON public.club_evaluations          (school_id);
CREATE INDEX IF NOT EXISTS idx_corruption_states_school      ON public.corruption_states         (school_id);
CREATE INDEX IF NOT EXISTS idx_dorm_furniture_school         ON public.dorm_furniture            (school_id);
CREATE INDEX IF NOT EXISTS idx_guardians_school              ON public.guardians                 (school_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_legends_school        ON public.hall_of_legends           (school_id);
CREATE INDEX IF NOT EXISTS idx_msa_school                    ON public.meeting_session_attendees (school_id);
CREATE INDEX IF NOT EXISTS idx_parent_reports_school_id      ON public.parent_reports            (school_id);
CREATE INDEX IF NOT EXISTS idx_student_dorms_school          ON public.student_dorms             (school_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_school      ON public.student_guardians         (school_id);
CREATE INDEX IF NOT EXISTS idx_trip_consents_school          ON public.trip_consents             (school_id);
-- classes: لا FK constraint صريح لكنها مُستخدمة في RLS وتحتاج index
CREATE INDEX IF NOT EXISTS idx_classes_school                ON public.classes                   (school_id);


-- ════════════════════════════════════════════════════════════════
-- Section 4: إضافة indexes للـ FKs عالية الاستخدام
-- مُختارة بناءً على تكرار الظهور في مسارات RLS والـ joins الأساسية
-- ════════════════════════════════════════════════════════════════

-- period_attendance: مسارات الجدول الدراسي والحضور
CREATE INDEX IF NOT EXISTS idx_pa_class_id     ON public.period_attendance (class_id);
CREATE INDEX IF NOT EXISTS idx_pa_subject_id   ON public.period_attendance (subject_id);
CREATE INDEX IF NOT EXISTS idx_pa_persona_id   ON public.period_attendance (marked_by_persona_id);

-- events: مسارات الانضمام مع timetable والمواد
CREATE INDEX IF NOT EXISTS idx_events_persona_id ON public.events (created_by_persona_id);
CREATE INDEX IF NOT EXISTS idx_events_subject_id ON public.events (subject_id);
CREATE INDEX IF NOT EXISTS idx_events_slot_id    ON public.events (timetable_slot_id);

-- مسارات الطالب في الخدمات الأساسية
CREATE INDEX IF NOT EXISTS idx_health_visits_student  ON public.health_visits  (student_id);
CREATE INDEX IF NOT EXISTS idx_parent_notes_student   ON public.parent_notes   (student_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_flags_student ON public.sentinel_flags (student_id);
CREATE INDEX IF NOT EXISTS idx_dorm_furniture_student ON public.dorm_furniture (student_id);
CREATE INDEX IF NOT EXISTS idx_dorm_furniture_item    ON public.dorm_furniture (item_id);
CREATE INDEX IF NOT EXISTS idx_loot_chests_student    ON public.loot_chests    (student_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_legends_std    ON public.hall_of_legends (student_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_legends_ssn    ON public.hall_of_legends (season_id);

-- student_honors / student_wishes: مسارات البحث والتقارير
CREATE INDEX IF NOT EXISTS idx_student_honors_student ON public.student_honors (student_id);
CREATE INDEX IF NOT EXISTS idx_student_honors_by      ON public.student_honors (awarded_by);
CREATE INDEX IF NOT EXISTS idx_student_wishes_c1      ON public.student_wishes (first_choice);
CREATE INDEX IF NOT EXISTS idx_student_wishes_c2      ON public.student_wishes (second_choice);
CREATE INDEX IF NOT EXISTS idx_student_wishes_c3      ON public.student_wishes (third_choice);

-- cases: مسارات التدقيق والاستعلام
CREATE INDEX IF NOT EXISTS idx_cases_academic_year ON public.cases (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_cases_opened_by     ON public.cases (opened_by);

-- LRC: حجوزات الصفوف
CREATE INDEX IF NOT EXISTS idx_lrc_bookings_class ON public.lrc_bookings (class_id);

-- guardians: مسارات الولي/الطالب
CREATE INDEX IF NOT EXISTS idx_student_guardians_gid ON public.student_guardians (guardian_id);

COMMIT;
