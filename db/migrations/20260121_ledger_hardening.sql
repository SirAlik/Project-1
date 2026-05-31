-- =============================================
-- SMART SCHOOL OS - LEDGER HARDENING (V5)
-- Banking-grade security for the student economy
-- =============================================

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) IDEMPOTENCY (Anti-Double-Spend)
-- Prevent multiple rewards for the same physical/digital event
ALTER TABLE transaction_logs 
ADD CONSTRAINT unique_student_source_event 
UNIQUE (student_id, source_event_id);

-- 2) SECURE CONFIGURATION (Circuit Breakers & Salts)
CREATE SCHEMA IF NOT EXISTS vault;

CREATE TABLE IF NOT EXISTS vault.secrets (
    name text PRIMARY KEY,
    secret text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Seed with a default salt if not present (User should change this in production)
INSERT INTO vault.secrets (name, secret) 
VALUES ('ledger_secret_salt', 'cyb3r_ch1ll_s3cr3t_2026_s3nt1n3l')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS system_config (
    key text PRIMARY KEY,
    value_json jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

INSERT INTO system_config (key, value_json)
VALUES 
('economy_limits', '{"max_earn_per_event": 500, "max_mint_per_hour": 10000}'),
('circuit_breaker', '{"is_active": false, "reason": "none"}')
ON CONFLICT (key) DO NOTHING;

-- 3) ATOMIC TRANSACTION RPC
CREATE OR REPLACE FUNCTION rpc_process_transaction(
    p_student_id uuid,
    p_delta_coins bigint,
    p_delta_xp bigint,
    p_type text,
    p_source_type text,
    p_source_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_hash text;
    v_new_hash text;
    v_current_coins bigint;
    v_current_xp bigint;
    v_salt text;
    v_limits jsonb;
    v_circuit_breaker jsonb;
    v_now timestamptz := now();
    v_hourly_mint bigint;
BEGIN
    -- 1. Serialized Lock (Anti-Race Condition)
    -- Acquire a transaction-level advisory lock for this student
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text));

    -- 2. Check Circuit Breaker
    SELECT value_json INTO v_circuit_breaker FROM system_config WHERE key = 'circuit_breaker';
    IF (v_circuit_breaker->>'is_active')::boolean THEN
        RAISE EXCEPTION 'Economy system is currently in maintenance mode: %', v_circuit_breaker->>'reason';
    END IF;

    -- 3. Guardrail: Limits & Signs
    SELECT value_json INTO v_limits FROM system_config WHERE key = 'economy_limits';
    
    -- Earn vs Spend validation
    IF p_delta_coins > 0 AND p_delta_coins > (v_limits->>'max_earn_per_event')::bigint THEN
        -- Auto-flag for Sentinel
        INSERT INTO sentinel_flags (student_id, severity, reason, metadata)
        VALUES (p_student_id, 'high', 'Limit breach attempt', jsonb_build_object('attempted', p_delta_coins, 'limit', v_limits->>'max_earn_per_event'));
        RAISE EXCEPTION 'Transaction exceeds maximum earning limit';
    END IF;

    IF p_delta_coins < 0 AND p_type != 'purchase' AND p_type != 'penalty' THEN
        RAISE EXCEPTION 'Negative delta only allowed for purchase or penalty types';
    END IF;

    -- 4. Global Hourly Mint Check (Circuit Breaker Logic)
    SELECT COALESCE(SUM(delta_coins), 0) INTO v_hourly_mint 
    FROM transaction_logs 
    WHERE delta_coins > 0 AND created_at > now() - interval '1 hour';

    IF (v_hourly_mint + p_delta_coins) > (v_limits->>'max_mint_per_hour')::bigint THEN
        UPDATE system_config SET value_json = jsonb_build_object('is_active', true, 'reason', 'Hourly mint limit exceeded') WHERE key = 'circuit_breaker';
        RAISE EXCEPTION 'Global mint limit exceeded. System locked.';
    END IF;

    -- 5. Fetch Ledger State
    SELECT secret INTO v_salt FROM vault.secrets WHERE name = 'ledger_secret_salt';
    
    SELECT coins, xp INTO v_current_coins, v_current_xp 
    FROM student_wallet 
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        -- Initialize wallet if missing
        INSERT INTO student_wallet (student_id, coins, xp) VALUES (p_student_id, 0, 0);
        v_current_coins := 0;
        v_current_xp := 0;
    END IF;

    -- 6. Fetch Prev Hash
    SELECT hash INTO v_last_hash 
    FROM transaction_logs 
    WHERE student_id = p_student_id 
    ORDER BY created_at DESC LIMIT 1;
    
    v_last_hash := COALESCE(v_last_hash, 'GENESIS_SENTINEL');

    -- 7. Calculate New Totals
    v_current_coins := v_current_coins + p_delta_coins;
    v_current_xp := v_current_xp + p_delta_xp;

    IF v_current_coins < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 8. Generate Immutable Hash (Simplified for SQL, use crypto.digest in production/edge)
    -- In Postgres, we can use pgcrypto if installed, or just a logical concat-hash for tracking
    v_new_hash := encode(digest(v_last_hash || p_student_id::text || p_delta_coins::text || p_delta_xp::text || v_salt || v_now::text, 'sha256'), 'hex');

    -- 9. Atomic Update & Log
    UPDATE student_wallet 
    SET coins = v_current_coins, 
        xp = v_current_xp, 
        last_updated = v_now 
    WHERE student_id = p_student_id;

    INSERT INTO transaction_logs (
        student_id, delta_coins, delta_xp, type, source_type, source_event_id,
        current_total_coins, current_total_xp, hash, prev_hash, created_at
    )
    VALUES (
        p_student_id, p_delta_coins, p_delta_xp, p_type, p_source_type, p_source_event_id,
        v_current_coins, v_current_xp, v_new_hash, v_last_hash, v_now
    );

    RETURN jsonb_build_object(
        'success', true, 
        'new_coins', v_current_coins, 
        'new_xp', v_current_xp, 
        'tx_hash', v_new_hash
    );
END;
$$;

-- 4) RECONCILIATION FUNCTION (Self-Healing Audit)
CREATE OR REPLACE FUNCTION rpc_reconcile_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reconciled_count int := 0;
    v_error_count int := 0;
    v_row RECORD;
BEGIN
    FOR v_row IN 
        SELECT 
            w.student_id, 
            w.coins as wallet_coins, 
            SUM(t.delta_coins) as ledger_coins,
            s.name as student_name
        FROM student_wallet w
        JOIN transaction_logs t ON w.student_id = t.student_id
        JOIN student_profiles s ON w.student_id = s.id
        GROUP BY w.student_id, w.coins, s.name
    LOOP
        IF v_row.wallet_coins != v_row.ledger_coins THEN
            -- Inconsistency found
            INSERT INTO sentinel_flags (student_id, severity, reason, metadata)
            VALUES (v_row.student_id, 'critical', 'Wallet mismatch detected', jsonb_build_object('wallet', v_row.wallet_coins, 'ledger', v_row.ledger_coins));
            
            -- Optional: Auto-correction (disabled by default for safety)
            -- UPDATE student_wallet SET coins = v_row.ledger_coins WHERE student_id = v_row.student_id;
            
            v_error_count := v_error_count + 1;
        ELSE
            v_reconciled_count := v_reconciled_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'reconciled', v_reconciled_count,
        'errors_detected', v_error_count,
        'status', CASE WHEN v_error_count = 0 THEN 'HEALTHY' ELSE 'COMPROMISED' END
    );
END;
$$;
