-- =================================================================
-- R03: إصلاح دوال SECURITY DEFINER — إضافة SET search_path
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   منع Function Hijacking بإضافة SET search_path = public
--   لجميع دوال SECURITY DEFINER في النظام.
--
--   إضافة إلى ذلك: إصلاح fn_auto_referral_on_absence() لتمرير
--   school_id + referred_by_persona_id للجدول الجديد behavioral_referrals
--   (الذي يتطلب كليهما NOT NULL بعد R02).
--
-- الدوال المُصلَحة (7):
--   1. fn_set_updated_at()              — إضافة SET search_path
--   2. fn_auto_referral_on_absence()    — إضافة school_id + VP persona + إزالة vp_sent_at
--   3. cleanup_old_rate_limits()        — إضافة SET search_path + REVOKE/GRANT
--   4. archive_old_audit_logs()         — إضافة SET search_path + REVOKE/GRANT
--   5. rpc_scan_ar_glyph()             — إضافة SET search_path
--   6. rpc_purchase_furniture()         — إضافة SET search_path
--   7. rpc_corrupt_system()            — إضافة SET search_path
--   8. rpc_process_transaction()        — إضافة SET search_path
--   9. rpc_reconcile_wallets()          — إضافة SET search_path
--
-- التبعيات:
--   R02 ✅ (behavioral_referrals.school_id NOT NULL + referred_by_persona_id NOT NULL)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من وجود الجداول المطلوبة
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'behavioral_referrals'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: behavioral_referrals غير موجودة — طبّق R02 أولاً';
    END IF;

    -- تأكد أن school_id NOT NULL على behavioral_referrals
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'behavioral_referrals'
          AND column_name  = 'school_id'
          AND is_nullable  = 'YES'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: behavioral_referrals.school_id يقبل NULL — تحقق من R02';
    END IF;

    RAISE NOTICE 'Preflight: behavioral_referrals موجودة وschool_id NOT NULL ✓';
END $$;

-- ============================================================
-- 1. fn_set_updated_at() — إضافة SET search_path = public
-- ============================================================
-- دالة trigger بسيطة — لا تحتاج SECURITY DEFINER لكن
-- SET search_path ضروري لمنع search_path injection في trigger context.

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

-- ============================================================
-- 2. fn_auto_referral_on_absence() — الإصلاح الجوهري
-- ============================================================
-- المشكلة: INSERT القديم بدون school_id و referred_by_persona_id
-- (كلاهما NOT NULL في R02) + يشير لـ vp_sent_at (عمود غير موجود في الجدول الجديد)
--
-- الإصلاح:
--   • إضافة school_id = NEW.school_id
--   • البحث عن student_affairs_vp للمدرسة → referred_by_persona_id
--   • إذا لم يوجد VP مُعيَّن: تُتخطى الإحالة الآلية (RETURN NEW بهدوء)
--   • إزالة vp_sent_at من INSERT (العمود لا يوجد في behavioral_referrals الجديد)

CREATE OR REPLACE FUNCTION public.fn_auto_referral_on_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_absent_count    integer;
    v_existing_ref    uuid;
    v_student_name    text;
    v_vp_persona_id   uuid;
BEGIN
    -- نتفاعل فقط مع الغيابات غير المبررة
    IF NEW.status != 'absent' OR NEW.is_excused = true THEN
        RETURN NEW;
    END IF;

    -- عدّ الغيابات غير المبررة في السنة الدراسية الحالية
    SELECT COUNT(*) INTO v_absent_count
    FROM public.student_daily_attendance
    WHERE student_id       = NEW.student_id
      AND school_id        = NEW.school_id
      AND academic_year_id = NEW.academic_year_id
      AND status           = 'absent'
      AND is_excused       = false;

    -- الحد: 3 غيابات غير مبررة
    IF v_absent_count < 3 THEN
        RETURN NEW;
    END IF;

    -- لا ننشئ إحالة مكررة إذا كانت توجد إحالة مفتوحة
    SELECT id INTO v_existing_ref
    FROM public.behavioral_referrals
    WHERE student_id    = NEW.student_id
      AND school_id     = NEW.school_id
      AND referral_type = 'absence'
      AND status IN ('draft','pending_counselor','in_progress')
    LIMIT 1;

    IF v_existing_ref IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- البحث عن شخصية نائب شؤون الطلاب للمدرسة
    -- (مطلوب لأن referred_by_persona_id NOT NULL في behavioral_referrals)
    SELECT id INTO v_vp_persona_id
    FROM public.user_personas
    WHERE school_id = NEW.school_id
      AND role      = 'student_affairs_vp'
    LIMIT 1;

    -- إذا لا يوجد VP مُعيَّن: تُتخطى الإحالة الآلية بهدوء
    -- (المدرسة لم تُعيِّن نائب شؤون طلاب بعد)
    IF v_vp_persona_id IS NULL THEN
        RAISE NOTICE 'fn_auto_referral_on_absence: لا يوجد student_affairs_vp للمدرسة % — تخطي الإحالة الآلية', NEW.school_id;
        RETURN NEW;
    END IF;

    -- جلب اسم الطالب
    SELECT COALESCE(name, 'الطالب') INTO v_student_name
    FROM public.student_profiles WHERE id = NEW.student_id;

    -- إنشاء الإحالة السلوكية تلقائياً (بالنمط الجديد)
    INSERT INTO public.behavioral_referrals (
        school_id,
        student_id,
        referred_by_persona_id,
        referral_type,
        trigger_count,
        trigger_period,
        vp_reason,
        status
    ) VALUES (
        NEW.school_id,
        NEW.student_id,
        v_vp_persona_id,
        'absence',
        v_absent_count,
        'السنة الدراسية الحالية',
        format('إحالة آلية: تجاوز الطالب %s حد الغيابات غير المبررة (%s غيابات)',
               v_student_name, v_absent_count),
        'pending_counselor'
    );

    -- إشعار للموجه الطلابي
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        INSERT INTO public.notifications (
            school_id, recipient_role, notification_type,
            title, body, source_table, source_record_id
        ) VALUES (
            NEW.school_id,
            'student_counselor',
            'hr_ticket',
            format('إحالة غياب آلية: %s', v_student_name),
            format('تجاوز الطالب %s حد الغيابات غير المبررة (%s غيابات في السنة الدراسية الحالية)',
                   v_student_name, v_absent_count),
            'student_daily_attendance',
            NEW.id
        );
    END IF;

    RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.fn_auto_referral_on_absence() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.fn_auto_referral_on_absence() TO authenticated;

-- ============================================================
-- 3 & 4. cleanup_old_rate_limits() + archive_old_audit_logs()
-- ============================================================
-- المشكلة: مُعرَّفتان بدون SET search_path = public
-- تُعاد كتابتهما مع إضافة SET search_path + REVOKE/GRANT

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.rate_limit_tracker
    WHERE window_start < NOW() - INTERVAL '1 hour';
END $$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.action_audit_log
    WHERE created_at < NOW() - INTERVAL '90 days';
END $$;

REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.archive_old_audit_logs() TO authenticated;

-- ============================================================
-- 5. rpc_scan_ar_glyph() — إضافة SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_scan_ar_glyph(glyph_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_glyph RECORD;
    v_cooldown_check RECORD;
    v_now timestamptz := now();
    v_current_time time := now()::time;
    v_reward jsonb;
BEGIN
    SELECT * INTO v_glyph FROM public.ar_glyphs WHERE code_hash = glyph_hash;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Glyph not found';
    END IF;

    IF v_glyph.active_hours IS NOT NULL THEN
        IF v_current_time < (v_glyph.active_hours->>'start')::time
        OR v_current_time > (v_glyph.active_hours->>'end')::time THEN
            RAISE EXCEPTION 'Glyph is not active at this time';
        END IF;
    END IF;

    SELECT * INTO v_cooldown_check
    FROM public.student_glyph_finds
    WHERE student_id = v_student_id AND glyph_id = v_glyph.id
    ORDER BY found_at DESC LIMIT 1;

    IF FOUND THEN
        IF v_now < v_cooldown_check.found_at + (v_glyph.cooldown_minutes || ' minutes')::interval THEN
            RAISE EXCEPTION 'Glyph is on cooldown for you';
        END IF;
    END IF;

    IF v_glyph.reward_type = 'coin_drop' THEN
        UPDATE public.student_wallet
        SET coins = coins + (v_glyph.reward_value->>'amount')::bigint
        WHERE student_id = v_student_id;

        INSERT INTO public.transaction_logs (student_id, delta_coins, delta_xp, type, source_type, source_event_id)
        VALUES (v_student_id, (v_glyph.reward_value->>'amount')::bigint, 0, 'ar_drop', 'ar_glyph', v_glyph.id);
    END IF;

    INSERT INTO public.student_glyph_finds (student_id, glyph_id) VALUES (v_student_id, v_glyph.id);

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_glyph.reward_type,
        'reward_value', v_glyph.reward_value
    );
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) TO authenticated;

-- ============================================================
-- 6. rpc_purchase_furniture() — إضافة SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_purchase_furniture(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_item RECORD;
    v_wallet RECORD;
BEGIN
    SELECT * INTO v_item FROM public.marketplace_items
    WHERE id = p_item_id AND type = 'furniture' AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Furniture item not found or inactive';
    END IF;

    SELECT * INTO v_wallet FROM public.student_wallet WHERE student_id = v_student_id;
    IF v_wallet.coins < v_item.cost THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    UPDATE public.student_wallet SET coins = coins - v_item.cost WHERE student_id = v_student_id;

    INSERT INTO public.inventory (student_id, item_id, status) VALUES (v_student_id, v_item.id, 'active');
    INSERT INTO public.dorm_furniture (student_id, item_id, is_placed) VALUES (v_student_id, v_item.id, false);

    INSERT INTO public.transaction_logs (student_id, delta_coins, delta_xp, type, source_type, source_event_id)
    VALUES (v_student_id, -v_item.cost, 0, 'purchase', 'marketplace', v_item.id);

    RETURN jsonb_build_object('success', true, 'item_title', v_item.title);
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) TO authenticated;

-- ============================================================
-- 7. rpc_corrupt_system() — إضافة SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_corrupt_system(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.corruption_states (student_id, level, last_corruption_at)
    VALUES (p_student_id, 1, now())
    ON CONFLICT (student_id) DO UPDATE
    SET level = public.corruption_states.level + 1, last_corruption_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'new_level', (SELECT level FROM public.corruption_states WHERE student_id = p_student_id)
    );
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_corrupt_system(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_corrupt_system(uuid) TO authenticated;

-- ============================================================
-- 8. rpc_process_transaction() — إضافة SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_process_transaction(
    p_student_id     uuid,
    p_delta_coins    bigint,
    p_delta_xp       bigint,
    p_type           text,
    p_source_type    text,
    p_source_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_hash       text;
    v_new_hash        text;
    v_current_coins   bigint;
    v_current_xp      bigint;
    v_salt            text;
    v_limits          jsonb;
    v_circuit_breaker jsonb;
    v_now             timestamptz := now();
    v_hourly_mint     bigint;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text));

    SELECT value_json INTO v_circuit_breaker FROM public.system_config WHERE key = 'circuit_breaker';
    IF (v_circuit_breaker->>'is_active')::boolean THEN
        RAISE EXCEPTION 'Economy system is currently in maintenance mode: %', v_circuit_breaker->>'reason';
    END IF;

    SELECT value_json INTO v_limits FROM public.system_config WHERE key = 'economy_limits';

    IF p_delta_coins > 0 AND p_delta_coins > (v_limits->>'max_earn_per_event')::bigint THEN
        INSERT INTO public.sentinel_flags (student_id, severity, reason, metadata)
        VALUES (p_student_id, 'high', 'Limit breach attempt',
                jsonb_build_object('attempted', p_delta_coins, 'limit', v_limits->>'max_earn_per_event'));
        RAISE EXCEPTION 'Transaction exceeds maximum earning limit';
    END IF;

    IF p_delta_coins < 0 AND p_type != 'purchase' AND p_type != 'penalty' THEN
        RAISE EXCEPTION 'Negative delta only allowed for purchase or penalty types';
    END IF;

    SELECT COALESCE(SUM(delta_coins), 0) INTO v_hourly_mint
    FROM public.transaction_logs
    WHERE delta_coins > 0 AND created_at > now() - interval '1 hour';

    IF (v_hourly_mint + p_delta_coins) > (v_limits->>'max_mint_per_hour')::bigint THEN
        UPDATE public.system_config
        SET value_json = jsonb_build_object('is_active', true, 'reason', 'Hourly mint limit exceeded')
        WHERE key = 'circuit_breaker';
        RAISE EXCEPTION 'Global mint limit exceeded. System locked.';
    END IF;

    SELECT secret INTO v_salt FROM vault.secrets WHERE name = 'ledger_secret_salt';

    SELECT coins, xp INTO v_current_coins, v_current_xp
    FROM public.student_wallet WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        INSERT INTO public.student_wallet (student_id, coins, xp) VALUES (p_student_id, 0, 0);
        v_current_coins := 0;
        v_current_xp    := 0;
    END IF;

    SELECT hash INTO v_last_hash
    FROM public.transaction_logs
    WHERE student_id = p_student_id
    ORDER BY created_at DESC LIMIT 1;

    v_last_hash := COALESCE(v_last_hash, 'GENESIS_SENTINEL');

    v_current_coins := v_current_coins + p_delta_coins;
    v_current_xp    := v_current_xp    + p_delta_xp;

    IF v_current_coins < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_new_hash := encode(
        digest(v_last_hash || p_student_id::text || p_delta_coins::text
               || p_delta_xp::text || v_salt || v_now::text, 'sha256'),
        'hex'
    );

    UPDATE public.student_wallet
    SET coins = v_current_coins, xp = v_current_xp, last_updated = v_now
    WHERE student_id = p_student_id;

    INSERT INTO public.transaction_logs (
        student_id, delta_coins, delta_xp, type, source_type, source_event_id,
        current_total_coins, current_total_xp, hash, prev_hash, created_at
    ) VALUES (
        p_student_id, p_delta_coins, p_delta_xp, p_type, p_source_type, p_source_event_id,
        v_current_coins, v_current_xp, v_new_hash, v_last_hash, v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_coins', v_current_coins,
        'new_xp', v_current_xp,
        'tx_hash', v_new_hash
    );
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid) TO authenticated;

-- ============================================================
-- 9. rpc_reconcile_wallets() — إضافة SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_reconcile_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reconciled_count int := 0;
    v_error_count      int := 0;
    v_row              RECORD;
BEGIN
    FOR v_row IN
        SELECT
            w.student_id,
            w.coins     AS wallet_coins,
            SUM(t.delta_coins) AS ledger_coins,
            s.name      AS student_name
        FROM public.student_wallet w
        JOIN public.transaction_logs t  ON w.student_id = t.student_id
        JOIN public.student_profiles s  ON w.student_id = s.id
        GROUP BY w.student_id, w.coins, s.name
    LOOP
        IF v_row.wallet_coins != v_row.ledger_coins THEN
            INSERT INTO public.sentinel_flags (student_id, severity, reason, metadata)
            VALUES (v_row.student_id, 'critical', 'Wallet mismatch detected',
                    jsonb_build_object('wallet', v_row.wallet_coins, 'ledger', v_row.ledger_coins));
            v_error_count := v_error_count + 1;
        ELSE
            v_reconciled_count := v_reconciled_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'reconciled',      v_reconciled_count,
        'errors_detected', v_error_count,
        'status', CASE WHEN v_error_count = 0 THEN 'HEALTHY' ELSE 'COMPROMISED' END
    );
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_reconcile_wallets() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_reconcile_wallets() TO authenticated;

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_broken_funcs text;
    v_fn_referral  text;
    v_col_count    integer;
BEGIN
    -- التحقق من أن جميع دوال SECURITY DEFINER لها search_path=public
    SELECT string_agg(proname, ', ' ORDER BY proname)
    INTO v_broken_funcs
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prosecdef    = true
      AND (proconfig IS NULL OR NOT (proconfig @> ARRAY['search_path=public']));

    IF v_broken_funcs IS NOT NULL THEN
        RAISE WARNING 'دوال SECURITY DEFINER بدون search_path=public: [%]', v_broken_funcs;
    ELSE
        RAISE NOTICE '✓ جميع دوال SECURITY DEFINER تحمل SET search_path=public';
    END IF;

    -- التحقق من fn_auto_referral_on_absence: تمرر school_id
    SELECT prosrc INTO v_fn_referral
    FROM pg_proc
    WHERE proname      = 'fn_auto_referral_on_absence'
      AND pronamespace = 'public'::regnamespace;

    IF v_fn_referral IS NULL THEN
        RAISE EXCEPTION 'التحقق فشل: fn_auto_referral_on_absence() مفقودة';
    END IF;

    IF position('v_vp_persona_id' IN v_fn_referral) = 0 THEN
        RAISE EXCEPTION 'التحقق فشل: fn_auto_referral_on_absence() لا تزال لا تُمرر referred_by_persona_id';
    END IF;

    IF position('NEW.school_id' IN v_fn_referral) = 0 THEN
        RAISE EXCEPTION 'التحقق فشل: fn_auto_referral_on_absence() لا تزال لا تُمرر school_id';
    END IF;

    -- التحقق من عدم وجود vp_sent_at في الدالة
    IF position('vp_sent_at' IN v_fn_referral) > 0 THEN
        RAISE EXCEPTION 'التحقق فشل: fn_auto_referral_on_absence() لا تزال تشير لـ vp_sent_at (عمود غير موجود)';
    END IF;

    RAISE NOTICE '✓ fn_auto_referral_on_absence() تمرر school_id + referred_by_persona_id ✓';
    RAISE NOTICE '✓ vp_sent_at محذوف من INSERT ✓';
    RAISE NOTICE '✓ fn_set_updated_at() — SET search_path=public مُضاف ✓';
    RAISE NOTICE '✓ cleanup_old_rate_limits() + archive_old_audit_logs() — إصلاح مكتمل ✓';
    RAISE NOTICE '✓ rpc_scan_ar_glyph + rpc_purchase_furniture + rpc_corrupt_system — إصلاح مكتمل ✓';
    RAISE NOTICE '✓ rpc_process_transaction + rpc_reconcile_wallets — إصلاح مكتمل ✓';
    RAISE NOTICE '✓ R03 اكتمل';
END $$;

COMMIT;

-- ============================================================
-- بوابة التحقق السريع (للتشغيل بعد COMMIT)
-- ============================================================
-- SELECT proname, proconfig
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND prosecdef    = true
--   AND (proconfig IS NULL OR NOT (proconfig @> ARRAY['search_path=public']))
-- ORDER BY proname;
-- -- يجب أن تعيد 0 صفوف
