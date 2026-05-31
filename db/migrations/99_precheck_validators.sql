-- ============================================================================
-- SQL Step 0: HARD PRECHECKS & VALIDATION
-- Run this BEFORE executing any repair migration scripts.
-- ============================================================================
-- 0.1 Schools table exists and has data?
SELECT 'public.schools' as table_name,
    to_regclass('public.schools') as exists,
    (
        SELECT count(*)
        FROM public.schools
    ) as row_count;
-- 0.2 Confirm target tables exist (must not be NULL)
SELECT to_regclass('public.classes') AS classes,
    to_regclass('public.student_profiles') AS student_profiles,
    to_regclass('public.events') AS events,
    to_regclass('public.cases') AS cases,
    to_regclass('public.attendance_scans') AS attendance_scans,
    to_regclass('public.school_settings') AS school_settings,
    to_regclass('public.action_audit_log') AS action_audit_log;
-- Note: If school_settings or action_audit_log are NULL, ensure Script E does not fail on them.
-- 0.3 Confirm which tables still lack school_id
-- We expect this list to be EMPTY after Script A is run.
-- Before Script A, this should list all tables needing the column.
SELECT t.table_name as "Tables_Missing_School_ID"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'classes',
        'student_profiles',
        'events',
        'cases',
        'attendance_scans',
        'secretary_correspondence',
        'employee_leaves',
        'lab_inventory',
        'health_visits',
        'lrc_books',
        'qa_observations'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
            AND c.table_name = t.table_name
            AND c.column_name = 'school_id'
    )
ORDER BY t.table_name;