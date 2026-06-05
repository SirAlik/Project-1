-- =================================================================
-- Migration: Gamification/Ledger Infrastructure Rebuild — v2
-- التاريخ: 2026-06-05 (مراجعة بعد فشل Phase 4 الأول)
-- =================================================================
-- سبب الفشل السابق (مُوثَّق من فحص DB الحية):
--   CREATE TABLE vault.secrets → 42501 permission denied for schema vault
--   postgres لديه USAGE فقط على vault (لا CREATE)
--   vault.secrets الأصلية = ميزة Supabase — postgres لا يستطيع INSERT فيها
--
-- الحل: app_private schema (مملوكة لـ postgres) بدلاً من vault
--
-- الهدف:
--   1. إنشاء app_private.secrets + قفل كامل — بديل vault.secrets
--   2. إنشاء system_config + RLS (system_owner فقط)
--   3. partial unique index على transaction_logs (source_event_id nullable)
--   4. rpc_process_transaction v2 — يقرأ app_private.secrets
--   5. rpc_reconcile_wallets — مُقيَّدة بمدرسة المُستدعِي
--   6. rpc_complete_quest(uuid, uuid) — جديدة (لم تكن موجودة في DB)
--   7. REVOKE anon من gamification RPCs الموجودة فعلاً
--
-- نتائج الفحص المباشر (2026-06-05):
--   vault.can_create    = false (سبب الفشل)
--   vault.can_insert    = false (لا يمكن استخدام vault.secrets حتى لو أمكن الوصول)
--   app_private schema  = غير موجود → سيُنشَأ
--   system_config       = غير موجود → سيُنشَأ
--   pgcrypto 1.3        = مثبَّت → CREATE EXTENSION IF NOT EXISTS آمنة
--   rpc_complete_quest  = غير موجود → DROP IF EXISTS(uuid) آمنة + CREATE جديدة
--   student_profiles.school_id = nullable → فحص صريح مُضاف في rpc_process_transaction
--   unique_student_source_event = غير موجود + source_event_id nullable
--                                → partial index WHERE source_event_id IS NOT NULL
--   REVOKE/GRANT: توقيعات مُتحقَّق منها من pg_proc:
--     rpc_scan_ar_glyph(text, uuid) ✓
--     rpc_purchase_furniture(uuid, uuid) ✓
--
-- التبعيات (مطبَّقة بالفعل):
--   ✅ 20260602_gamification_multitenant.sql (M75)
--   ✅ Phase 3 (rate_limit_tracker مُنشَأ، get_my_role() محذوفة)
-- =================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- Preflight: التحقق من وجود M75
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
        WHERE table_schema = 'public' AND table_name = 'student_wallet'
          AND column_name = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_wallet.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transaction_logs'
          AND column_name = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: transaction_logs.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sentinel_flags'
          AND column_name = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: sentinel_flags.school_id مفقود — طبِّق M75 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_profiles غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quest_nodes'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quest_nodes غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quest_progress'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quest_progress غير موجود';
    END IF;

    RAISE NOTICE '✓ Preflight: جميع جداول M75 موجودة';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. pgcrypto (مثبَّت مسبقاً 1.3 — IF NOT EXISTS آمنة)
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════════
-- 2. app_private schema + app_private.secrets
--
-- لماذا app_private وليس vault؟
--   vault مملوك لـ supabase_admin — postgres لا يملك CREATE عليه.
--   app_private سيُنشَأ بملكية postgres = صلاحيات كاملة.
--
-- آلية الأمان:
--   REVOKE ALL على المخطط والجدول من public/anon/authenticated.
--   RLS مُفعَّلة بدون سياسات = حجب كامل للوصول المباشر.
--   الدوال SECURITY DEFINER تعمل بصلاحيات postgres وتتجاوز RLS.
--   التوصيف الكامل app_private.secrets مطلوب داخل الدوال
--   لأن SET search_path = public لا يشمل app_private.
-- ════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.secrets (
    name       text        PRIMARY KEY,
    secret     text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE app_private.secrets FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE app_private.secrets ENABLE ROW LEVEL SECURITY;
-- لا سياسات = حجب كامل لجميع الأدوار في الوصول المباشر
-- SECURITY DEFINER تعمل بصلاحيات postgres وتتجاوز RLS تلقائياً

INSERT INTO app_private.secrets (name, secret)
VALUES ('ledger_secret_salt', 'ROTATE_BEFORE_LAUNCH___dev_placeholder_salt_2026')
ON CONFLICT (name) DO NOTHING;

DO $$ BEGIN
    RAISE NOTICE '✓ app_private.secrets: schema + table + RLS + placeholder salt';
    RAISE NOTICE '  ⚠️  يجب استبدال ledger_secret_salt قبل الإطلاق';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 3. system_config (حدود الاقتصاد + circuit breaker)
-- ════════════════════════════════════════════════════════════════
-- الجدول غير موجود في DB الحية (مُؤكَّد من الفحص المباشر).
-- الدوال SECURITY DEFINER تقرأ/تكتب هنا مباشرةً بتجاوز RLS.
-- أي وصول مباشر من العميل يتطلب system_owner.

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

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_select"    ON public.system_config;
DROP POLICY IF EXISTS "system_config_update"    ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_all" ON public.system_config;
DROP POLICY IF EXISTS "sc_admin_all"            ON public.system_config;

CREATE POLICY "sc_admin_all" ON public.system_config
    FOR ALL TO authenticated
    USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner');

DO $$ BEGIN
    RAISE NOTICE '✓ system_config: إنشاء + RLS (system_owner فقط للوصول المباشر)';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 4. Idempotency index على transaction_logs
--
-- source_event_id: uuid, nullable (مُؤكَّد من information_schema.columns)
-- Partial index (WHERE source_event_id IS NOT NULL):
--   النية هي منع مكافأة مزدوجة لنفس الحدث — لا منع صفوف متعددة بـ NULL.
--   هذا أوضح معمارياً من UNIQUE constraint العادية على nullable.
-- ════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename  = 'transaction_logs'
          AND indexname  = 'unique_student_source_event'
    ) THEN
        CREATE UNIQUE INDEX unique_student_source_event
            ON public.transaction_logs (student_id, source_event_id)
            WHERE source_event_id IS NOT NULL;
        RAISE NOTICE '✓ unique_student_source_event: partial index created';
    ELSE
        RAISE NOTICE '✓ unique_student_source_event: already exists';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 5. rpc_process_transaction — v2
--
-- التغييرات عن النسخة الحالية في DB:
--   ✦ يقرأ من app_private.secrets (بالتوصيف الكامل — search_path=public فقط)
--   ✦ فحص student_profiles.school_id IS NULL (العمود nullable في DB الحية)
--   ✦ الحد الساعي مُقيَّد بالمدرسة لا عالمياً
--   ✦ school_id في sentinel_flags + transaction_logs INSERTs
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
    -- 1. advisory lock: يمنع race conditions على نفس الطالب
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text));

    -- 2. school_id من JWT (الجانب المُستدعِي)
    v_caller_school_id := (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid;
    IF v_caller_school_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: school_id missing from JWT';
    END IF;

    -- 3. استخراج school_id من student_profiles (مصدر موثوق — tamper-proof)
    SELECT sp.school_id INTO v_school_id
    FROM public.student_profiles sp
    WHERE sp.id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', p_student_id;
    END IF;

    -- 4. student_profiles.school_id nullable في DB الحية — فحص صريح
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Data integrity error: student % has no school_id in student_profiles',
            p_student_id;
    END IF;

    -- 5. التحقق من التطابق — حماية من هجوم cross-tenant
    IF v_school_id IS DISTINCT FROM v_caller_school_id THEN
        RAISE EXCEPTION 'cross-tenant violation: student school does not match caller JWT school';
    END IF;

    -- 6. circuit breaker
    SELECT value_json INTO v_circuit_breaker
    FROM public.system_config WHERE key = 'circuit_breaker';
    IF (v_circuit_breaker ->> 'is_active')::boolean THEN
        RAISE EXCEPTION 'Economy system in maintenance: %', v_circuit_breaker ->> 'reason';
    END IF;

    -- 7. حدود الاقتصاد
    SELECT value_json INTO v_limits
    FROM public.system_config WHERE key = 'economy_limits';

    IF p_delta_coins > 0 AND p_delta_coins > (v_limits ->> 'max_earn_per_event')::bigint THEN
        INSERT INTO public.sentinel_flags (school_id, student_id, severity, reason, metadata)
        VALUES (v_school_id, p_student_id, 'high', 'Limit breach attempt',
                jsonb_build_object(
                    'attempted', p_delta_coins,
                    'limit',     v_limits ->> 'max_earn_per_event'
                ));
        RAISE EXCEPTION 'Transaction exceeds maximum earning limit';
    END IF;

    IF p_delta_coins < 0 AND p_type NOT IN ('purchase', 'penalty') THEN
        RAISE EXCEPTION 'Negative delta only allowed for purchase or penalty types';
    END IF;

    -- 8. الحد الساعي — مُقيَّد بالمدرسة
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

    -- 9. مفتاح SHA256 من app_private.secrets
    -- التوصيف الكامل مطلوب: SET search_path=public لا يشمل app_private
    -- SECURITY DEFINER يعمل بصلاحيات postgres → يتجاوز RLS على app_private.secrets
    SELECT secret INTO v_salt
    FROM app_private.secrets
    WHERE name = 'ledger_secret_salt';

    IF v_salt IS NULL THEN
        RAISE EXCEPTION 'Ledger config error: app_private.secrets.ledger_secret_salt مفقود';
    END IF;

    -- 10. حالة المحفظة الحالية
    SELECT coins, xp INTO v_current_coins, v_current_xp
    FROM public.student_wallet
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        INSERT INTO public.student_wallet (student_id, school_id, coins, xp)
        VALUES (p_student_id, v_school_id, 0, 0);
        v_current_coins := 0;
        v_current_xp    := 0;
    END IF;

    -- 11. آخر hash لسلسلة هذا الطالب في هذه المدرسة
    SELECT hash INTO v_last_hash
    FROM public.transaction_logs
    WHERE student_id = p_student_id AND school_id = v_school_id
    ORDER BY created_at DESC
    LIMIT 1;
    v_last_hash := COALESCE(v_last_hash, 'GENESIS_SENTINEL');

    -- 12. الأرصدة الجديدة
    v_current_coins := v_current_coins + p_delta_coins;
    v_current_xp    := v_current_xp    + p_delta_xp;

    IF v_current_coins < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 13. SHA256 hash لسلامة السجل المحاسبي
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

    -- 14. تحديث المحفظة (atomic)
    UPDATE public.student_wallet
    SET coins        = v_current_coins,
        xp           = v_current_xp,
        last_updated = v_now
    WHERE student_id = p_student_id;

    -- 15. تسجيل المعاملة (append-only ledger)
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
-- 6. rpc_reconcile_wallets — مُقيَّدة بمدرسة المُستدعِي
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
                    jsonb_build_object(
                        'wallet', v_row.wallet_coins,
                        'ledger', v_row.ledger_coins
                    ));
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
-- 7. rpc_complete_quest(uuid, uuid)
--
-- rpc_complete_quest غير موجودة أصلاً في DB (مُؤكَّد من الفحص).
-- DROP IF EXISTS(uuid) = no-op آمنة.
-- UNIQUE على quest_progress: quest_progress_student_id_node_id_key
--   على (student_id, node_id) — مُؤكَّد من information_schema.
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
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quest not found';
    END IF;

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

    -- ON CONFLICT على quest_progress_student_id_node_id_key (مُؤكَّد من DB)
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
-- 8. REVOKE anon من scan/furniture
--
-- التوقيعات المُؤكَّدة من pg_proc في DB الحية:
--   rpc_scan_ar_glyph(text, uuid)       ← الموجود فعلاً
--   rpc_purchase_furniture(uuid, uuid)  ← الموجود فعلاً
-- REVOKE من anon الذي لا يملك الصلاحية = no-op آمنة في PostgreSQL
-- ════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid)     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid)      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid)  TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- Postflight: تحقق نهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_schema_exists  boolean;
    v_secrets_exists boolean;
    v_salt_exists    boolean;
    v_config_exists  boolean;
    v_config_rls     boolean;
    v_config_policy  text;
    v_index_exists   boolean;
    v_fn_process     boolean;
    v_fn_reconcile   boolean;
    v_fn_quest       boolean;
BEGIN
    -- ─── app_private schema ───────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'app_private'
    ) INTO v_schema_exists;
    IF NOT v_schema_exists THEN
        RAISE EXCEPTION 'POSTFLIGHT: app_private schema غير موجود';
    END IF;

    -- ─── app_private.secrets table ───────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app_private' AND table_name = 'secrets'
    ) INTO v_secrets_exists;
    IF NOT v_secrets_exists THEN
        RAISE EXCEPTION 'POSTFLIGHT: app_private.secrets غير موجودة';
    END IF;

    -- ─── ledger_secret_salt موجود ────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM app_private.secrets WHERE name = 'ledger_secret_salt'
    ) INTO v_salt_exists;
    IF NOT v_salt_exists THEN
        RAISE EXCEPTION 'POSTFLIGHT: ledger_secret_salt مفقود من app_private.secrets';
    END IF;

    -- ─── system_config ───────────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'system_config'
    ) INTO v_config_exists;
    IF NOT v_config_exists THEN
        RAISE EXCEPTION 'POSTFLIGHT: system_config غير موجود';
    END IF;

    SELECT c.relrowsecurity INTO v_config_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'system_config';
    IF NOT COALESCE(v_config_rls, false) THEN
        RAISE EXCEPTION 'POSTFLIGHT: system_config RLS غير مُفعَّل';
    END IF;

    SELECT polname INTO v_config_policy
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'system_config'
      AND p.polname = 'sc_admin_all'
    LIMIT 1;
    IF v_config_policy IS NULL THEN
        RAISE EXCEPTION 'POSTFLIGHT: سياسة sc_admin_all مفقودة من system_config';
    END IF;

    -- ─── idempotency index ────────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'transaction_logs'
          AND indexname = 'unique_student_source_event'
    ) INTO v_index_exists;
    IF NOT v_index_exists THEN
        RAISE EXCEPTION 'POSTFLIGHT: unique_student_source_event index مفقود';
    END IF;

    -- ─── RPCs موجودة ─────────────────────────────────────────────
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_process_transaction'
          AND p.pronargs = 6
    ) INTO v_fn_process;
    IF NOT v_fn_process THEN RAISE EXCEPTION 'POSTFLIGHT: rpc_process_transaction مفقودة'; END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_reconcile_wallets'
          AND p.pronargs = 0
    ) INTO v_fn_reconcile;
    IF NOT v_fn_reconcile THEN RAISE EXCEPTION 'POSTFLIGHT: rpc_reconcile_wallets مفقودة'; END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_complete_quest'
          AND p.pronargs = 2
    ) INTO v_fn_quest;
    IF NOT v_fn_quest THEN RAISE EXCEPTION 'POSTFLIGHT: rpc_complete_quest(uuid,uuid) مفقودة'; END IF;

    -- ─── anon لا يملك EXECUTE على RPCs الحساسة ──────────────────
    IF has_function_privilege('anon',
        'public.rpc_process_transaction(uuid,bigint,bigint,text,text,uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTFLIGHT: rpc_process_transaction — EXECUTE ممنوح لـ anon';
    END IF;
    IF has_function_privilege('anon',
        'public.rpc_complete_quest(uuid,uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTFLIGHT: rpc_complete_quest — EXECUTE ممنوح لـ anon';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Phase 4 (Gamification Ledger Rebuild v2) مكتمل:';
    RAISE NOTICE '   ✓ app_private.secrets: بديل vault — schema + table + RLS';
    RAISE NOTICE '   ✓ system_config: موجود + RLS + sc_admin_all policy';
    RAISE NOTICE '   ✓ unique_student_source_event: partial index (source_event_id IS NOT NULL)';
    RAISE NOTICE '   ✓ rpc_process_transaction v2: app_private.secrets + null school_id guard';
    RAISE NOTICE '   ✓ rpc_reconcile_wallets: مُقيَّدة بمدرسة المُستدعِي';
    RAISE NOTICE '   ✓ rpc_complete_quest(uuid, uuid): مُنشَأة حديثاً';
    RAISE NOTICE '   ✓ REVOKE anon من scan/furniture (توقيعات مُتحقَّق منها)';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  app_private.secrets.ledger_secret_salt = placeholder';
    RAISE NOTICE '   ⚠️  يجب استبداله قبل أي معاملة طالب حقيقية';
END $$;

COMMIT;
