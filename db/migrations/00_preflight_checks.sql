-- ============================================================================
-- SQL Step 00: Preflight Checks (Verify Current State)
-- ============================================================================
-- 1. Detect Tables Missing `school_id` (Tenant Column)
-- Expected: List of tables that store tenant data but lack isolation column.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
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
    AND table_name NOT IN (
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'school_id'
    );
-- 2. Detect Legacy Triggers (Hardcoded Time)
-- Expected: Confirm existence of the problematic trigger function
SELECT routine_name
FROM information_schema.routines
WHERE routine_definition ILIKE '%07:15:00%';
-- 3. Detect Enum Usage
-- Expected: Confirm user_role enum exists
SELECT typname,
    enumlabel
FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role';