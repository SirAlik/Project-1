-- ============================================================================
-- SQL Step 01: Core Tenancy (Enforce school_id Isolation)
-- ============================================================================
BEGIN;
-- 1. Add `school_id` to Core Tables
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
-- 2. Add `school_id` to Module Tables
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.attendance_scans
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
-- 3. Add `school_id` to Future Modules
ALTER TABLE public.secretary_correspondence
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.employee_leaves
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.lab_inventory
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.health_visits
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.lrc_books
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE public.qa_observations
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
-- ============================================================================
-- BACKFILL STRATEGY (Best Effort - Requires Manual Verification)
-- ============================================================================
-- Backfill Classes: Assuming existing classes belong to *some* school context.
-- Since current schema has no link, we might need to rely on 'created_by' profile school?
-- Or update manually. For now, we set a default ONLY if data exists.
DO $$ BEGIN -- Only run complex updates if data exists to avoid errors on empty specialized tables
-- Attempt: Link Classes via created_by profile (if tracked, otherwise ambiguous)
-- Since classes schema didn't have created_by, we might be stuck without manual intervention.
-- We will mark them as NULL for now (allowed) or require manual fix.
-- Backfill Students via Class (once Class is fixed)
UPDATE public.student_profiles s
SET school_id = c.school_id
FROM public.classes c
WHERE s.class_id = c.id
    AND s.school_id IS NULL
    AND c.school_id IS NOT NULL;
-- Backfill Events via Student
UPDATE public.events e
SET school_id = s.school_id
FROM public.student_profiles s
WHERE e.student_id = s.id
    AND e.school_id IS NULL
    AND s.school_id IS NOT NULL;
-- Backfill Cases via Student
UPDATE public.cases c
SET school_id = s.school_id
FROM public.student_profiles s
WHERE c.student_id = s.id
    AND c.school_id IS NULL
    AND s.school_id IS NOT NULL;
END $$;
-- 4. Indexing (Critical for RLS Performance)
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON public.student_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_events_school ON public.events(school_id);
CREATE INDEX IF NOT EXISTS idx_cases_school ON public.cases(school_id);
COMMIT;