-- Rename 'grade' to 'grade_level' to match application usage
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'classes'
        AND column_name = 'grade'
) THEN
ALTER TABLE classes
    RENAME COLUMN grade TO grade_level;
END IF;
END $$;