-- ============================================================================
-- SQL Step 02: PBAC & Configuration (Dynamic Logic)
-- ============================================================================
BEGIN;
-- 1. Create Permissions Registry (Optional if strictly using Code-Based PBAC)
-- We keep "user_role" Enum for now but support future expansion.
-- 2. School Settings (Replace Hardcoded Triggers)
CREATE TABLE IF NOT EXISTS public.school_settings (
    school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
    -- Schedule Config
    tardy_threshold TIME DEFAULT '07:15:00',
    day_start_time TIME DEFAULT '07:00:00',
    day_end_time TIME DEFAULT '13:30:00',
    -- JSON Config (Flexible)
    features_config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);
-- Enable RLS on Settings
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
-- 3. Replace Hardcoded Trigger Function
CREATE OR REPLACE FUNCTION sync_fingerprint_to_events() RETURNS TRIGGER AS $$
DECLARE v_student_name text;
v_class_id uuid;
v_class_name text;
v_school_id uuid;
v_tardy_threshold time;
v_tardy_duration interval;
BEGIN -- 1. Get student info & SCHOOL ID
SELECT s.name,
    s.class_id,
    c.name,
    s.school_id INTO v_student_name,
    v_class_id,
    v_class_name,
    v_school_id
FROM student_profiles s
    LEFT JOIN classes c ON s.class_id = c.id
WHERE s.id = NEW.student_id;
-- 2. Fetch School Settings (Dynamic Threshold)
SELECT tardy_threshold INTO v_tardy_threshold
FROM school_settings
WHERE school_id = v_school_id;
-- Fallback default if no settings found
IF v_tardy_threshold IS NULL THEN v_tardy_threshold := '07:15:00';
END IF;
-- 3. Calculate Logic
IF (NEW.scan_time::time > v_tardy_threshold) THEN v_tardy_duration := (NEW.scan_time::time - v_tardy_threshold);
-- Logic remains same (Update or Insert)
UPDATE events
SET type = 'تأخر',
    note = 'تأخر صباحي (بصمة) - المدة: ' || v_tardy_duration::text
WHERE student_id = NEW.student_id
    AND event_date = NEW.scan_time::date
    AND type = 'غياب';
IF NOT FOUND THEN
INSERT INTO events (
        student_id,
        school_id,
        type,
        note,
        event_date,
        class_id,
        student_name_cached,
        class_name_cached
    )
VALUES (
        NEW.student_id,
        v_school_id,
        'تأخر',
        'تأخر صباحي (بصمة) - المدة: ' || v_tardy_duration::text,
        NEW.scan_time::date,
        v_class_id,
        v_student_name,
        v_class_name
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMIT;