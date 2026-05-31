-- ============================================================================
-- SQL Step 03 & 04: Academic Integrity & Guardians
-- ============================================================================
BEGIN;
-- 1. Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- "2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    UNIQUE(school_id, name)
);
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
-- Add academic_year_id to time-series tables
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);
ALTER TABLE public.attendance_scans
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);
-- 2. Guardians (Parents) - replacing simplistic 'parent_phone'
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID REFERENCES schools(id),
    -- Optional: Guardians might be shared? Safer to scope for now.
    full_name TEXT NOT NULL,
    national_id TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Join Table
CREATE TABLE IF NOT EXISTS public.student_guardians (
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    -- 'Father', 'Mother'
    is_emergency_contact BOOLEAN DEFAULT false,
    PRIMARY KEY (student_id, guardian_id)
);
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
COMMIT;