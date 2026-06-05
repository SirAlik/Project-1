-- =================================================================
-- Migration: Gamification/Ledger Infrastructure Rebuild
-- التاريخ: 2026-06-04
-- الهدف:
--   1. ضمان وجود vault schema + vault.secrets مع RLS مُقفَلة
--   2. ضمان وجود system_config مع RLS صحيحة (system_owner فقط مباشرةً)
--   3. إعادة بناء rpc_process_transaction — multi-tenant safe:
--      - school_id مُستخرَج من student_profiles (tamper-proof)
--      - cross-tenant validation مقابل JWT
--      - school_id في جميع INSERT (schema M75 يتطلبه NOT NULL)
--      - الحد الساعي مُقيَّد بالمدرسة لا عالمياً
--   4. إعادة بناء rpc_reconcile_wallets — مُقيَّدة بمدرسة المُستدعِي
--   5. إعادة بناء rpc_complete_quest — explicit p_student_id (حذف النسخة القديمة)
--   6. تأكيد REVOKE anon من جميع gamification RPCs الحساسة
--
-- التبعيات (يجب تطبيقها أولاً):
--   ✅ 20260602_gamification_multitenant.sql (M75):
--       student_wallet + transaction_logs + sentinel_flags بـ school_id NOT NULL
--   ✅ 20260121_ledger_hardening.sql: v1 rpc_process_transaction
--   ✅ 20260121_quest_security.sql:   v1 rpc_complete_quest(uuid)
-- =================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- Preflight: التحقق من اكتمال M75 قبل المتابعة
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_wallet'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_wallet غير موجود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'student_wallet'
          AND column_name  = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_wallet.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'transaction_logs'
          AND column_name  = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: transaction_logs.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'sentinel_flags'
          AND column_name  = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: sentinel_flags.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_profiles غير موجود';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. pgcrypto (مطلوب لـ SHA256 في hash chain)
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════════
-- 2. vault schema + vault.secrets
--
-- vault.secrets تحتوي على مفتاح الـ SHA256 لسلسلة hash المحاسبية.
--
-- ⚠️  MANDATORY BEFORE LAUNCH:
--   استبدل قيمة 'ledger_secret_salt' في vault.secrets عبر
--   Supabase Dashboard قبل أول معاملة طالب حقيقية.
--   القيمة الموجودة حالياً placeholder للبيئة المحلية فقط.
-- ════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS vault;

CREATE TABLE IF NOT EXISTS vault.secrets (
    name       text        PRIMARY KEY,
    secret     text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO vault.secrets (name, secret)
VALUES ('ledger_secret_salt', 'ROTATE_BEFORE_LAUNCH___dev_placeholder_salt_2026')
ON CONFLICT (name) DO NOTHING;

-- قفل vault.secrets من الوصول المباشر لجميع المستخدمين.
-- الدوال SECURITY DEFINER تعمل بصلاحيات postgres (superuser)
-- وتتجاوز RLS تلقائياً — فتستطيع القراءة بدون سياسة صريحة.
ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;
-- لا سياسة SELECT/INSERT/UPDATE = حجب كامل للمستخدمين العاديين

-- ════════════════════════════════════════════════════════════════
-- 3. system_config (حدود الاقتصاد + circuit breaker)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.system_config (
    key        text        PRIMARY KEY,
    value_json jsonb       NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_config (key, value_json)
VALUES
    ('economy_limits',  '{"max_earn_per_event": 500, "max_mint_per_hour": 10000}'),
    ('circuit_breaker', '{"is_active": false, "reason": "none"}')
ON CONFLICT (key) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 4. system_config RLS — system_owner فقط للوصول المباشر
--
-- الدوال SECURITY DEFINER (rpc_process_transaction، rpc_reconcile_wallets)
-- تتجاوز RLS وتقرأ/تكتب system_config داخلياً بلا قيود.
-- أي مستخدم يحاول القراءة المباشرة (REST/browse) محظور إلا system_owner.
--
-- يُلغِي سياسة "USING (true)" الخاطئة المُنشأة في Phase 3.
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_select"   ON public.system_config;
DROP POLICY IF EXISTS "system_config_update"   ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_all" ON public.system_config;
DROP POLICY IF EXISTS "sc_admin_all"           ON public.system_config;

CREATE POLICY "sc_admin_all" ON public.system_config
    FOR ALL
    TO authenticated
    USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner');

-- ════════════════════════════════════════════════════════════════
-- 5. Idempotency constraint على transaction_logs
--    يمنع مكافأة مزدوجة لنفس الحدث ونفس الطالب.
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema    = 'public'
          AND table_name      = 'transaction_logs'
          AND constraint_name = 'unique_student_source_event'
    ) THEN
        ALTER TABLE public.transaction_logs
            ADD CONSTRAINT unique_student_source_event UNIQUE (student_id, source_event_id);
        RAISE NOTICE '✓ unique_student_source_event: constraint مُضاف';
    ELSE
        RAISE NOTICE '✓ unique_student_source_event: موجود بالفعل';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 6. rpc_process_transaction — إعادة بناء كاملة للـ multi-tenant
--
-- التغييرات عن v1 (20260121_ledger_hardening.sql):
--   ✦ school_id مُستخرَج من student_profiles لا من العميل (tamper-proof)
--   ✦ مقارنة school_id مع JWT لاكتشاف هجوم cross-tenant
--   ✦ جميع INSERT تشمل school_id (M75 schema يتطلبه NOT NULL)
--   ✦ الحد الساعي مُقيَّد بالمدرسة (كل مدرسة حد مستقل)
--   ✦ SET search_path = public (كان مفقوداً في v1)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_process_transaction(
    p_student_id      uuid,
    p_delta_coins     bigint,
    p_delta_xp        bigint,
    p_type            text,
    p_source_type     text,
    p_source_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id        uuid;
    v_caller_school_id uuid;
    v_last_hash        text;
    v_new_hash         text;
    v_current_coins    bigint;
    v_current_xp       bigint;
    v_salt             text;
    v_limits           jsonb;
    v_circuit_breaker  jsonb;
    v_now              timestamptz := now();
    v_hourly_mint      bigint;
BEGIN
    -- 1. قفل advisory لمنع race conditions على نفس الطالب
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text));

    -- 2. التحقق من وجود school_id في JWT
    v_caller_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_caller_school_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: school_id missing from JWT';
    END IF;

    -- 3. التحقق من وجود الطالب + استخراج school_id من student_profiles (مصدر موثوق)
    SELECT sp.school_id INTO v_school_id
    FROM public.student_profiles sp
    WHERE sp.id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id;
    END IF;

    -- 4. التحقق من التطابق (حماية من هجوم cross-tenant)
    IF v_school_id IS DISTINCT FROM v_caller_school_id THEN
        RAISE EXCEPTION 'cross-tenant violation: student school does not match caller JWT school';
    END IF;

    -- 5. فحص circuit breaker
    SELECT value_json INTO v_circuit_breaker
    FROM public.system_config WHERE key = 'circuit_breaker';
    IF (v_circuit_breaker ->> 'is_active')::boolean THEN
        RAISE EXCEPTION 'Economy system in maintenance: %', v_circuit_breaker ->> 'reason';
    END IF;

    -- 6. حدود الاقتصاد
    SELECT value_json INTO v_limits
    FROM public.system_config WHERE key = 'economy_limits';

    IF p_delta_coins > 0 AND p_delta_coins > (v_limits ->> 'max_earn_per_event')::bigint THEN
        INSERT INTO public.sentinel_flags (school_id, student_id, severity, reason, metadata)
        VALUES (v_school_id, p_student_id, 'high', 'Limit breach attempt',
                jsonb_build_object(
                    'attempted', p_delta_coins,
                    'limit', v_limits ->> 'max_earn_per_event'
                ));
        RAISE EXCEPTION 'Transaction exceeds maximum earning limit';
    END IF;

    IF p_delta_coins < 0 AND p_type NOT IN ('purchase', 'penalty') THEN
        RAISE EXCEPTION 'Negative delta only allowed for purchase or penalty types';
    END IF;

    -- 7. الحد الساعي — مُقيَّد بالمدرسة (كل مدرسة مستقلة)
    SELECT COALESCE(SUM(delta_coins), 0) INTO v_hourly_mint
    FROM public.transaction_logs
    WHERE school_id   = v_school_id
      AND delta_coins > 0
      AND created_at  > v_now - interval '1 hour';

    IF (v_hourly_mint + p_delta_coins) > (v_limits ->> 'max_mint_per_hour')::bigint THEN
        UPDATE public.system_config
        SET value_json = jsonb_build_object('is_active', true, 'reason', 'Hourly mint limit exceeded')
        WHERE key = 'circuit_breaker';
        RAISE EXCEPTION 'Hourly mint limit exceeded. Economy locked for this school.';
    END IF;

    -- 8. جلب مفتاح الـ hash (SECURITY DEFINER تتجاوز vault.secrets RLS)
    SELECT secret INTO v_salt FROM vault.secrets WHERE name = 'ledger_secret_salt';
    IF v_salt IS NULL THEN
        RAISE EXCEPTION 'Ledger config error: vault.secrets.ledger_secret_salt مفقود — يجب التغيير قبل الإطلاق';
    END IF;

    -- 9. حالة المحفظة
    SELECT coins, xp INTO v_current_coins, v_current_xp
    FROM public.student_wallet WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        INSERT INTO public.student_wallet (student_id, school_id, coins, xp)
        VALUES (p_student_id, v_school_id, 0, 0);
        v_current_coins := 0;
        v_current_xp    := 0;
    END IF;

    -- 10. آخر hash في سلسلة هذا الطالب في هذه المدرسة
    SELECT hash INTO v_last_hash
    FROM public.transaction_logs
    WHERE student_id = p_student_id AND school_id = v_school_id
    ORDER BY created_at DESC
    LIMIT 1;
    v_last_hash := COALESCE(v_last_hash, 'GENESIS_SENTINEL');

    -- 11. الأرصدة الجديدة
    v_current_coins := v_current_coins + p_delta_coins;
    v_current_xp    := v_current_xp    + p_delta_xp;

    IF v_current_coins < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 12. SHA256 hash لسلامة السجل المحاسبي
    v_new_hash := encode(
        digest(
            v_last_hash
            || p_student_id::text
            || p_delta_coins::text
            || p_delta_xp::text
            || v_salt
            || v_now::text,
            'sha256'
        ),
        'hex'
    );

    -- 13. تحديث المحفظة بشكل atomic
    UPDATE public.student_wallet
    SET coins = v_current_coins, xp = v_current_xp, last_updated = v_now
    WHERE student_id = p_student_id;

    -- 14. تسجيل المعاملة (append-only ledger)
    INSERT INTO public.transaction_logs
        (school_id, student_id, delta_coins, delta_xp, type, source_type, source_event_id,
         current_total_coins, current_total_xp, hash, prev_hash, created_at)
    VALUES
        (v_school_id, p_student_id, p_delta_coins, p_delta_xp, p_type, p_source_type,
         p_source_event_id, v_current_coins, v_current_xp, v_new_hash, v_last_hash, v_now);

    RETURN jsonb_build_object(
        'success',   true,
        'new_coins', v_current_coins,
        'new_xp',    v_current_xp,
        'tx_hash',   v_new_hash
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
    FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
    TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 7. rpc_reconcile_wallets — إعادة بناء مُقيَّدة بالمدرسة
--
-- التغييرات عن v1 (20260121_ledger_hardening.sql):
--   ✦ مُقيَّدة بـ school_id من JWT (system_owner يرى الكل)
--   ✦ school_id في sentinel_flags INSERT
--   ✦ SET search_path = public
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_reconcile_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role text;
    v_school_id   uuid;
    v_reconciled  int := 0;
    v_errors      int := 0;
    v_row         RECORD;
BEGIN
    v_caller_role := (auth.jwt() -> 'app_metadata' ->> 'role');
    v_school_id   := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF v_caller_role <> 'system_owner' AND v_school_id IS NULL THEN
        RAISE EXCEPTION 'school_id missing from JWT';
    END IF;

    FOR v_row IN
        SELECT
            w.student_id,
            w.school_id,
            w.coins                         AS wallet_coins,
            COALESCE(SUM(t.delta_coins), 0) AS ledger_coins
        FROM public.student_wallet w
        LEFT JOIN public.transaction_logs t
               ON t.student_id = w.student_id AND t.school_id = w.school_id
        WHERE (v_caller_role = 'system_owner' OR w.school_id = v_school_id)
        GROUP BY w.student_id, w.school_id, w.coins
    LOOP
        IF v_row.wallet_coins <> v_row.ledger_coins THEN
            INSERT INTO public.sentinel_flags (school_id, student_id, severity, reason, metadata)
            VALUES (v_row.school_id, v_row.student_id, 'critical', 'Wallet mismatch detected',
                    jsonb_build_object('wallet', v_row.wallet_coins, 'ledger', v_row.ledger_coins));
            v_errors := v_errors + 1;
        ELSE
            v_reconciled := v_reconciled + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'reconciled',      v_reconciled,
        'errors_detected', v_errors,
        'status',          CASE WHEN v_errors = 0 THEN 'HEALTHY' ELSE 'COMPROMISED' END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_reconcile_wallets() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_reconcile_wallets() TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 8. rpc_complete_quest — إعادة بناء بـ p_student_id صريح
--
-- التغييرات عن v1 (20260121_quest_security.sql):
--   ✦ التوقيع تغيَّر: (uuid) → (uuid, uuid)
--     v1 كانت تستخدم auth.uid() كـ student_id — خاطئ بعد M75
--     لأن student_profiles.id ليس مرتبطاً بـ auth.users.id
--   ✦ school_id validation مُضاف
--   ✦ quest_progress INSERT تشمل school_id
--   ✦ SET search_path = public
--
-- النسخة القديمة rpc_complete_quest(uuid) محذوفة صراحةً.
-- ════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.rpc_complete_quest(uuid);

CREATE OR REPLACE FUNCTION public.rpc_complete_quest(
    p_quest_node_id uuid,
    p_student_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id    uuid;
    v_quest        RECORD;
    v_reward_coins bigint;
    v_reward_xp    bigint;
BEGIN
    v_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: school_id missing from JWT';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.student_profiles
        WHERE id = p_student_id AND school_id = v_school_id
    ) THEN
        RAISE EXCEPTION 'Student not found in this school';
    END IF;

    SELECT * INTO v_quest
    FROM public.quest_nodes
    WHERE id = p_quest_node_id AND school_id = v_school_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Quest not found'; END IF;

    IF EXISTS (
        SELECT 1 FROM public.quest_progress
        WHERE student_id = p_student_id
          AND node_id    = p_quest_node_id
          AND status     = 'completed'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Quest already completed',
            'status',  'completed'
        );
    END IF;

    v_reward_coins := COALESCE((v_quest.rewards_json ->> 'coins')::bigint, 0);
    v_reward_xp    := COALESCE((v_quest.rewards_json ->> 'xp')::bigint,    0);

    INSERT INTO public.quest_progress (school_id, student_id, node_id, status, completed_at)
    VALUES (v_school_id, p_student_id, p_quest_node_id, 'completed', now())
    ON CONFLICT (student_id, node_id) DO UPDATE
        SET status       = 'completed',
            completed_at = now()
        WHERE quest_progress.status <> 'completed';

    IF v_reward_coins > 0 OR v_reward_xp > 0 THEN
        PERFORM public.rpc_process_transaction(
            p_student_id, v_reward_coins, v_reward_xp,
            'quest_reward', 'quest', p_quest_node_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Quest completed',
        'rewards', jsonb_build_object('coins', v_reward_coins, 'xp', v_reward_xp)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_complete_quest(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_complete_quest(uuid, uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 9. تأكيد صلاحيات rpc_scan_ar_glyph + rpc_purchase_furniture
--    (أُعيد بناؤهما في M75 مع REVOKE — هذا تأكيد دفاعي)
-- ════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- Postflight: تحقق نهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_vault_exists  boolean;
    v_config_exists boolean;
    v_config_rls    boolean;
    v_vault_rls     boolean;
    v_config_policy text;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'vault' AND table_name = 'secrets'
    ) INTO v_vault_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'system_config'
    ) INTO v_config_exists;

    SELECT c.relrowsecurity INTO v_config_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'system_config';

    SELECT c.relrowsecurity INTO v_vault_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'vault' AND c.relname = 'secrets';

    SELECT polname INTO v_config_policy
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'system_config' AND p.polname = 'sc_admin_all'
    LIMIT 1;

    IF NOT v_vault_exists           THEN RAISE EXCEPTION 'POSTFLIGHT: vault.secrets غير موجود'; END IF;
    IF NOT v_config_exists          THEN RAISE EXCEPTION 'POSTFLIGHT: system_config غير موجود';  END IF;
    IF NOT COALESCE(v_config_rls, false) THEN RAISE EXCEPTION 'POSTFLIGHT: system_config RLS غير مُفعَّل'; END IF;
    IF NOT COALESCE(v_vault_rls,  false) THEN RAISE EXCEPTION 'POSTFLIGHT: vault.secrets RLS غير مُفعَّل';  END IF;
    IF v_config_policy IS NULL THEN RAISE EXCEPTION 'POSTFLIGHT: سياسة sc_admin_all مفقودة من system_config'; END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Gamification Ledger Infrastructure Rebuild مكتمل:';
    RAISE NOTICE '   ✓ vault.secrets موجود + RLS مُقفَلة (لا وصول مباشر للمستخدمين)';
    RAISE NOTICE '   ✓ system_config موجود + RLS: system_owner فقط مباشرةً';
    RAISE NOTICE '   ✓ rpc_process_transaction: school_id cross-tenant validation + M75 schema-safe';
    RAISE NOTICE '   ✓ rpc_reconcile_wallets: مُقيَّدة بمدرسة المُستدعِي';
    RAISE NOTICE '   ✓ rpc_complete_quest(uuid, uuid): explicit p_student_id — النسخة القديمة محذوفة';
    RAISE NOTICE '   ✓ REVOKE anon من جميع gamification RPCs';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  vault.secrets.ledger_secret_salt = placeholder';
    RAISE NOTICE '   ⚠️  يجب تغيير القيمة عبر Supabase Dashboard قبل الإطلاق';
END $$;

COMMIT;
