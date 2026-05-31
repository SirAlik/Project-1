-- ============================================================
-- Action Audit Log Table & Security Enhancements
-- Migration: 20260130_action_audit_log.sql
-- ============================================================
-- This migration creates the action_audit_log table for tracking
-- all sensitive mutations with PII masking, idempotency support,
-- and rate limiting infrastructure.
-- ============================================================
-- Create the action_audit_log table
CREATE TABLE IF NOT EXISTS public.action_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Action metadata
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    -- Actor context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE
    SET NULL,
        -- Input data (JSON - should have PII masked before insertion)
        input_data JSONB DEFAULT '{}',
        -- Result tracking
        result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'error')),
        error_message TEXT,
        -- Idempotency support
        idempotency_key VARCHAR(100),
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        -- Index for fast lookups
        UNIQUE(idempotency_key, user_id) -- Prevent duplicate actions per user
);
-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.action_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_school_id ON public.action_audit_log(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.action_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.action_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_result ON public.action_audit_log(result);
-- Composite index for filtering by action + date
CREATE INDEX IF NOT EXISTS idx_audit_log_action_date ON public.action_audit_log(action, created_at DESC);
-- ============================================================
-- Rate Limiting Table
-- ============================================================
-- Tracks action attempts per user for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    -- Unique per user + action + window
    UNIQUE(user_id, action_type, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON public.rate_limit_tracker(user_id, action_type, window_start);
-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================
-- Enable RLS
ALTER TABLE public.action_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;
-- Audit log policies
-- System Owners can see all audit logs
CREATE POLICY "super_admin_view_all_audit_logs" ON public.action_audit_log FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'super_admin'
        )
    );
-- School coordinators can see their school's audit logs
CREATE POLICY "coordinator_view_school_audit_logs" ON public.action_audit_log FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'system_coordinator'
                AND user_roles.school_id = action_audit_log.school_id
        )
    );
-- Users can see their own audit logs
CREATE POLICY "user_view_own_audit_logs" ON public.action_audit_log FOR
SELECT TO authenticated USING (user_id = auth.uid());
-- Only service role can INSERT audit logs (from server actions)
CREATE POLICY "service_insert_audit_logs" ON public.action_audit_log FOR
INSERT TO service_role WITH CHECK (true);
-- Rate limit tracker policies
-- Users can only see their own rate limits
CREATE POLICY "user_view_own_rate_limits" ON public.rate_limit_tracker FOR
SELECT TO authenticated USING (user_id = auth.uid());
-- Service role can manage rate limits
CREATE POLICY "service_manage_rate_limits" ON public.rate_limit_tracker FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ============================================================
-- Cleanup function for old rate limit entries
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- Delete rate limit entries older than 1 hour
DELETE FROM public.rate_limit_tracker
WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;
-- ============================================================
-- Audit log archive function (optional)
-- ============================================================
CREATE OR REPLACE FUNCTION archive_old_audit_logs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- This is a placeholder for archiving logic
    -- In production, you might move to an archive table or S3
    -- For now, delete logs older than 90 days
DELETE FROM public.action_audit_log
WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE public.action_audit_log IS 'Tracks all sensitive mutations with PII masking for compliance and debugging';
COMMENT ON TABLE public.rate_limit_tracker IS 'Tracks per-user action attempts for rate limiting';
COMMENT ON COLUMN public.action_audit_log.input_data IS 'Input data with PII fields masked (e.g., email -> u***@e***.com)';
COMMENT ON COLUMN public.action_audit_log.idempotency_key IS 'Client-provided key to prevent duplicate submissions';