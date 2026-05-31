-- =============================================
-- STUDENT GAMIFICATION METAVERSE (V4) - RPC FUNCTIONS
-- =============================================

-- 1) rpc_scan_ar_glyph(glyph_hash)
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
    -- 1. Verify glyph exists
    SELECT * INTO v_glyph FROM ar_glyphs WHERE code_hash = glyph_hash;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Glyph not found';
    END IF;

    -- 2. Check active hours
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

    -- 4. Award loot (Simple logic for now, can be expanded)
    IF v_glyph.reward_type = 'coin_drop' THEN
        UPDATE student_wallet 
        SET coins = coins + (v_glyph.reward_value->>'amount')::bigint 
        WHERE student_id = v_student_id;
        
        INSERT INTO transaction_logs (student_id, delta_coins, delta_xp, type, source_type, source_event_id)
        VALUES (v_student_id, (v_glyph.reward_value->>'amount')::bigint, 0, 'ar_drop', 'ar_glyph', v_glyph.id);
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

-- 2) rpc_purchase_furniture(item_id)
CREATE OR REPLACE FUNCTION rpc_purchase_furniture(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_item RECORD;
    v_wallet RECORD;
BEGIN
    -- 1. Verify item
    SELECT * INTO v_item FROM marketplace_items WHERE id = p_item_id AND type = 'furniture' AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Furniture item not found or inactive';
    END IF;

    -- 2. Check wallet
    SELECT * INTO v_wallet FROM student_wallet WHERE student_id = v_student_id;
    IF v_wallet.coins < v_item.cost THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- 3. Deduct coins
    UPDATE student_wallet SET coins = coins - v_item.cost WHERE student_id = v_student_id;

    -- 4. Add to inventory
    INSERT INTO inventory (student_id, item_id, status) VALUES (v_student_id, v_item.id, 'active');
    
    -- 5. Add to dorm furniture (available to place)
    INSERT INTO dorm_furniture (student_id, item_id, is_placed) VALUES (v_student_id, v_item.id, false);

    -- 6. Log transaction
    INSERT INTO transaction_logs (student_id, delta_coins, delta_xp, type, source_type, source_event_id)
    VALUES (v_student_id, -v_item.cost, 0, 'purchase', 'marketplace', v_item.id);

    RETURN jsonb_build_object('success', true, 'item_title', v_item.title);
END;
$$;

-- 3) rpc_corrupt_system(p_student_id uuid)
CREATE OR REPLACE FUNCTION rpc_corrupt_system(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Triggered if penalties > threshold (logic can be outside or here)
    INSERT INTO corruption_states (student_id, level, last_corruption_at)
    VALUES (p_student_id, 1, now())
    ON CONFLICT (student_id) DO UPDATE 
    SET level = corruption_states.level + 1, last_corruption_at = now();

    RETURN jsonb_build_object('success', true, 'new_level', (SELECT level FROM corruption_states WHERE student_id = p_student_id));
END;
$$;
