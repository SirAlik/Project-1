-- ============================================================================
-- SQL Step 99: Rollback (Emergency Only)
-- ============================================================================
-- Drop Policies first
DROP POLICY IF EXISTS "Tenant Isolation: Read Students" ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Write Students" ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Read Classes" ON public.classes;
DROP POLICY IF EXISTS "Tenant Isolation: Read Events" ON public.events;
DROP POLICY IF EXISTS "User Private: Idempotency" ON public.action_idempotency;
DROP POLICY IF EXISTS "Admin Read: Audit Log" ON public.action_audit_log;
-- Drop Tables (Reverse Order)
DROP TABLE IF EXISTS public.action_audit_log;
DROP TABLE IF EXISTS public.action_idempotency;
DROP TABLE IF EXISTS public.student_guardians;
DROP TABLE IF EXISTS public.guardians;
DROP TABLE IF EXISTS public.academic_years;
-- Cascade will remove FKs
DROP TABLE IF EXISTS public.school_settings;
-- Remove Columns
ALTER TABLE public.classes DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.cases DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.attendance_scans DROP COLUMN IF EXISTS school_id;
-- ... repeat for others
-- Note: Data in school_id columns will be LOST.