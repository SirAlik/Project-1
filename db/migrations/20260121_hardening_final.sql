-- =============================================
-- SMART SCHOOL OS - SECURITY HARDENING (PHASE 2)
-- =============================================

-- 1) FIX AR LOOPHOLE (Global Time-Fencing)
-- Ensure AR scans only work during school hours (07:00 AM - 02:00 PM)
CREATE OR REPLACE FUNCTION rpc_scan_ar_glyph(glyph_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_glyph RECORD;
    v_cooldown_check RECORD;
    v_now timestamptz := now();
    v_current_time time := now()::time;
    v_reward jsonb;
BEGIN
    -- [HARDENING] Global School Hours Check
    IF v_current_time < '07:00:00'::time OR v_current_time > '14:00:00'::time THEN
        RAISE EXCEPTION 'School Gates Closed. AR scanning is only available between 07:00 AM and 02:00 PM.';
    END IF;

    -- 1. Verify glyph exists
    SELECT * INTO v_glyph FROM ar_glyphs WHERE code_hash = glyph_hash;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Glyph not found';
    END IF;

    -- 2. Check individual glyph active hours (if any)
    IF v_glyph.active_hours IS NOT NULL THEN
        IF v_current_time < (v_glyph.active_hours->>'start')::time OR v_current_time > (v_glyph.active_hours->>'end')::time THEN
            RAISE EXCEPTION 'Glyph is not active at this time';
        END IF;
    END IF;

    -- 3. Check cooldown for student
    SELECT * INTO v_cooldown_check 
    FROM student_glyph_finds 
    WHERE student_id = v_student_id AND glyph_id = v_glyph.id
    ORDER BY found_at DESC LIMIT 1;

    IF FOUND THEN
        IF v_now < v_cooldown_check.found_at + (v_glyph.cooldown_minutes || ' minutes')::interval THEN
            RAISE EXCEPTION 'Glyph is on cooldown for you';
        END IF;
    END IF;

    -- 4. Award loot via SECURE LEDGER RPC
    IF v_glyph.reward_type = 'coin_drop' THEN
        PERFORM rpc_process_transaction(
            v_student_id,
            (v_glyph.reward_value->>'amount')::bigint,
            0,
            'ar_drop',
            'ar_glyph',
            v_glyph.id
        );
    END IF;

    -- 5. Log find
    INSERT INTO student_glyph_finds (student_id, glyph_id) VALUES (v_student_id, v_glyph.id);

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_glyph.reward_type,
        'reward_value', v_glyph.reward_value
    );
END;
$$;

-- 2) RLS LOCKDOWN (student_wallet)
-- Ensure student_wallet is READ-ONLY. All writes MUST go through rpc_process_transaction.
DROP POLICY IF EXISTS "Students manage own wallet" ON student_wallet;
DROP POLICY IF EXISTS "Anyone can update wallets" ON student_wallet;

-- Explicitly allow only SELECT
CREATE POLICY "Student Wallet - Read Only" 
ON student_wallet FOR SELECT 
USING (auth.uid() = student_id OR auth.role() = 'authenticated');

-- Deny all writes (Implicitly handled by lack of policy, but we can be explicit if needed)
-- Note: SECURITY DEFINER functions (like rpc_process_transaction) bypass RLS as they run as the table owner.

-- 3) REFACTOR INVENTORY RLS (Safety)
DROP POLICY IF EXISTS "Students manage own inventory" ON inventory;
CREATE POLICY "Inventory - Read Own" ON inventory FOR SELECT USING (auth.uid() = student_id);
-- Writes to inventory should also eventually move to RPC, but for Phase 2 we mainly focus on the Ledger.
