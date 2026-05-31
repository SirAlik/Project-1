-- =============================================
-- SMART SCHOOL OS - INTEGRITY CONSTRAINTS & PERFORMANCE INDEXES
-- Security Hotfix: Database Foundation Layer
-- =============================================

-- 1) WALLET INTEGRITY: Prevent negative balances
ALTER TABLE student_wallet 
ADD CONSTRAINT coins_non_negative CHECK (coins >= 0);

ALTER TABLE student_wallet 
ADD CONSTRAINT xp_non_negative CHECK (xp >= 0);

-- 2) PERFORMANCE INDEXES

-- Middleware: Fast role lookups for authorization
CREATE INDEX IF NOT EXISTS idx_profiles_role_lookup ON profiles(role) WHERE role IS NOT NULL;

-- Ledger History: Optimized transaction log queries
CREATE INDEX IF NOT EXISTS idx_transaction_logs_student_time ON transaction_logs(student_id, created_at DESC);

-- Quest System: Fast progress lookups
CREATE INDEX IF NOT EXISTS idx_quest_progress_student_node ON quest_progress(student_id, node_id);

-- Gamification: Wallet lookups
CREATE INDEX IF NOT EXISTS idx_student_wallet_lookup ON student_wallet(student_id);

-- Analytics: Event queries by date and type
CREATE INDEX IF NOT EXISTS idx_events_date_type ON events(event_date, type);

-- 3) DATA INTEGRITY: Ensure critical fields are not null
-- (These should already exist from schema, but adding as safety)
DO $$ 
BEGIN
    -- Ensure student_wallet has valid student references
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'student_wallet_student_id_fkey'
    ) THEN
        ALTER TABLE student_wallet 
        ADD CONSTRAINT student_wallet_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4) AUDIT: Create security_logs table for middleware
CREATE TABLE IF NOT EXISTS security_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),
    attempted_route text NOT NULL,
    user_role text,
    action text NOT NULL, -- 'DENIED', 'GRANTED'
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action, created_at DESC);

-- Enable RLS on security_logs (only admins can read)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security logs" ON security_logs 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'principal')
    )
);
