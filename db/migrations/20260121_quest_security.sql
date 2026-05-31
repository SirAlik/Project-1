-- =============================================
-- SMART SCHOOL OS - QUEST SYSTEM SECURITY LOCKDOWN
-- Security Hotfix: Server-Side Authority for Quest Completion
-- =============================================

-- 1) REVOKE DIRECT WRITE ACCESS
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Students manage own quest progress" ON quest_progress;

-- 2) GRANT READ-ONLY ACCESS
CREATE POLICY "Students read own quest progress" ON quest_progress 
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Staff read all quest progress" ON quest_progress 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'principal', 'teacher', 'counselor')
    )
);

-- 3) SECURE RPC: Complete Quest with Server-Side Validation
CREATE OR REPLACE FUNCTION rpc_complete_quest(
    p_quest_node_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_quest RECORD;
    v_existing_progress RECORD;
    v_reward_coins bigint;
    v_reward_xp bigint;
BEGIN
    -- 1. Verify student is authenticated
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 2. Fetch quest details
    SELECT * INTO v_quest FROM quest_nodes WHERE id = p_quest_node_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quest not found';
    END IF;

    -- 3. Check if already completed (Idempotency)
    SELECT * INTO v_existing_progress 
    FROM quest_progress 
    WHERE student_id = v_student_id AND node_id = p_quest_node_id;

    IF FOUND AND v_existing_progress.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Quest already completed',
            'status', 'completed'
        );
    END IF;

    -- 4. Extract rewards from quest JSON
    v_reward_coins := COALESCE((v_quest.rewards_json->>'coins')::bigint, 0);
    v_reward_xp := COALESCE((v_quest.rewards_json->>'xp')::bigint, 0);

    -- 5. Mark quest as completed (UPSERT for idempotency)
    INSERT INTO quest_progress (student_id, node_id, status, completed_at)
    VALUES (v_student_id, p_quest_node_id, 'completed', now())
    ON CONFLICT (student_id, node_id) 
    DO UPDATE SET 
        status = 'completed', 
        completed_at = now()
    WHERE quest_progress.status != 'completed'; -- Only update if not already completed

    -- 6. Award rewards via secure ledger (if rewards exist)
    IF v_reward_coins > 0 OR v_reward_xp > 0 THEN
        PERFORM rpc_process_transaction(
            v_student_id,
            v_reward_coins,
            v_reward_xp,
            'quest_reward',
            'quest',
            p_quest_node_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Quest completed successfully',
        'rewards', jsonb_build_object(
            'coins', v_reward_coins,
            'xp', v_reward_xp
        )
    );
END;
$$;

-- 4) GRANT EXECUTE PERMISSION
GRANT EXECUTE ON FUNCTION rpc_complete_quest(uuid) TO authenticated;
