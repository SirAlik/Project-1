-- ============================================================================
-- SQL Step 05: Audit & Idempotency
-- ============================================================================
BEGIN;
-- 1. Idempotency Store
CREATE TABLE IF NOT EXISTS public.action_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_name TEXT NOT NULL,
    result JSONB,
    transaction_ref UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON public.action_idempotency(user_id, idempotency_key);
-- 2. Unified Audit Log
CREATE TABLE IF NOT EXISTS public.action_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE
    SET NULL,
        role TEXT NOT NULL,
        -- Snapshotted role
        school_id UUID,
        -- Nullable for System Owner
        status TEXT NOT NULL CHECK (status IN ('success', 'error')),
        correlation_id UUID NOT NULL,
        transaction_ref UUID,
        payload_size INTEGER,
        ip_address TEXT,
        error_message TEXT,
        metadata JSONB,
        -- Masked
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_audit_school ON public.action_audit_log(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.action_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.action_audit_log(action_name);
COMMIT;