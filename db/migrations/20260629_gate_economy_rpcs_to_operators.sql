-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 2 — Phase 2: حصر RPCs اقتصاد الطالب على مشغّلي المدرسة المصرَّح لهم
-- ════════════════════════════════════════════════════════════════════════════
--
-- المشكلة الأمنية:
--   النسخ ثنائيّة الوسيط من RPCs الاقتصاد كلّها SECURITY DEFINER وممنوحة لـ
--   authenticated، وتقبل p_student_id من العميل وتتحقق من نطاق المدرسة فقط.
--   لأن SECURITY DEFINER يتجاوز RLS، يستطيع أي مستخدم مُسجَّل (بما فيهم
--   student/parent/school_secretary/health_coordinator/lab_technician...) أن
--   يستدعيها مباشرةً عبر PostgREST ويعدّل محفظة/مخزون/مكافآت أي طالب في مدرسته،
--   متجاوزاً قوائم الأدوار المسموح بها في RLS على الجداول الأساسية.
--
-- لماذا لا نربط p_student_id بـ auth.uid()؟
--   جداول الاقتصاد تشير بمفتاح أجنبي إلى student_profiles.id، وstudent_profiles
--   لا يملك أي عمود ربط بـ auth.users. الطلاب سجلّات roster (national_id) لا
--   حسابات مرتبطة. كما أن RLS على هذه الجداول لا تمنح دور student أي وصول —
--   فالاقتصاد مُشغَّل من قِبل طاقم المدرسة (teacher/activity_leader/admin/
--   principal) نيابةً عن الطلاب. لذا «الربط بهوية الطالب» غير ممكن بنيوياً
--   وغير صحيح دلالياً (المُستدعي طاقم لا طالب).
--
-- الحل (دفاع عميق يعيد مبدأ الأقل امتيازاً الذي يتجاوزه SECURITY DEFINER):
--   إضافة بوّابة دور داخل جسم كل دالة تطابق قائمة الأدوار المسموح بها في RLS
--   على الجداول التي تكتبها الدالة، مع الإبقاء على فحص نطاق المدرسة القائم.
--   النتيجة: لا يستطيع student/parent/secretary/health/lab... استدعاء هذه
--   الدوال إطلاقاً؛ ويبقى عزل المستأجر سليماً.
--
-- مجموعات المشغّلين (مشتقّة من RLS الجداول الأساسية):
--   • rpc_scan_ar_glyph     → student_glyph_finds/student_wallet:
--       {system_owner, school_principal, school_admin, teacher, activity_leader}
--   • rpc_purchase_furniture→ inventory/dorm_furniture (manage):
--       {system_owner, school_principal, school_admin, activity_leader}  (بلا teacher)
--   • rpc_process_transaction / rpc_complete_quest → دفتر الاقتصاد العام:
--       {system_owner, school_principal, school_admin, teacher, activity_leader}
--
-- ملاحظة: system_owner لا يملك school_id في الـJWT، فيفشل لاحقاً عند فحص نطاق
--   المدرسة (Student not found in this school) — وجوده في القائمة غير ضارّ
--   ومتسق مع RLS القائمة (system_owner OR same-school).
--
-- أثر التراجع: CREATE OR REPLACE فقط (لا تغيير في المخطط/البيانات). لاستعادة
--   السلوك السابق يُعاد إنشاء الدوال من 20260602_gamification_multitenant.sql /
--   20260604_rebuild_gamification_ledger_infrastructure.sql. PRE-LAUNCH.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) rpc_scan_ar_glyph(text, uuid) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_scan_ar_glyph(p_glyph_hash text, p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_id uuid := public.get_my_school_id();
    v_glyph     RECORD;
    v_last_find timestamptz;
    v_now       timestamptz := now();
BEGIN
    -- [Sprint 2] بوّابة المشغّل: SECURITY DEFINER يتجاوز RLS، فنُعيد فرض قائمة الأدوار هنا
    IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN
       ('system_owner','school_principal','school_admin','teacher','activity_leader') THEN
        RAISE EXCEPTION 'Not authorized: caller role may not operate the student economy';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.student_profiles WHERE id = p_student_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Student not found in this school'; END IF;
    SELECT * INTO v_glyph FROM public.ar_glyphs WHERE code_hash = p_glyph_hash AND school_id = v_school_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Glyph not found'; END IF;
    IF v_glyph.active_hours IS NOT NULL THEN
        IF v_now::time < (v_glyph.active_hours->>'start')::time OR v_now::time > (v_glyph.active_hours->>'end')::time THEN
            RAISE EXCEPTION 'Glyph is not active at this time'; END IF; END IF;
    SELECT found_at INTO v_last_find FROM public.student_glyph_finds
    WHERE student_id = p_student_id AND glyph_id = v_glyph.id ORDER BY found_at DESC LIMIT 1;
    IF FOUND AND v_now < v_last_find + (v_glyph.cooldown_minutes || ' minutes')::interval THEN RAISE EXCEPTION 'Glyph is on cooldown'; END IF;
    IF v_glyph.reward_type = 'coin_drop' THEN
        INSERT INTO public.student_wallet (student_id, school_id, coins)
        VALUES (p_student_id, v_school_id, (v_glyph.reward_value->>'amount')::bigint)
        ON CONFLICT (student_id) DO UPDATE SET coins = public.student_wallet.coins + (v_glyph.reward_value->>'amount')::bigint;
        INSERT INTO public.transaction_logs (school_id, student_id, delta_coins, delta_xp, type, source_type, source_event_id)
        VALUES (v_school_id, p_student_id, (v_glyph.reward_value->>'amount')::bigint, 0, 'ar_drop', 'ar_glyph', v_glyph.id);
    END IF;
    INSERT INTO public.student_glyph_finds (school_id, student_id, glyph_id) VALUES (v_school_id, p_student_id, v_glyph.id);
    RETURN jsonb_build_object('success', true, 'reward_type', v_glyph.reward_type, 'reward_value', v_glyph.reward_value);
END; $function$;

-- ── 2) rpc_purchase_furniture(uuid, uuid) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_purchase_furniture(p_item_id uuid, p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_id uuid := public.get_my_school_id();
    v_item      RECORD;
    v_coins     bigint;
BEGIN
    -- [Sprint 2] بوّابة المشغّل (manage على inventory/dorm_furniture: بلا teacher)
    IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN
       ('system_owner','school_principal','school_admin','activity_leader') THEN
        RAISE EXCEPTION 'Not authorized: caller role may not operate the student economy';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.student_profiles WHERE id = p_student_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Student not found in this school'; END IF;
    SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id AND school_id = v_school_id AND type = 'furniture' AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Furniture item not found or inactive'; END IF;
    SELECT coins INTO v_coins FROM public.student_wallet WHERE student_id = p_student_id;
    IF v_coins IS NULL OR v_coins < v_item.cost THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
    UPDATE public.student_wallet SET coins = coins - v_item.cost WHERE student_id = p_student_id;
    INSERT INTO public.inventory (school_id, student_id, item_id, status) VALUES (v_school_id, p_student_id, v_item.id, 'active');
    INSERT INTO public.dorm_furniture (school_id, student_id, item_id) VALUES (v_school_id, p_student_id, v_item.id);
    INSERT INTO public.transaction_logs (school_id, student_id, delta_coins, delta_xp, type, source_type, source_event_id)
    VALUES (v_school_id, p_student_id, -v_item.cost, 0, 'purchase', 'marketplace', v_item.id);
    RETURN jsonb_build_object('success', true, 'item_title', v_item.title);
END; $function$;

-- ── 3) rpc_process_transaction(...) — دفتر الاقتصاد المركزي ───────────────────
CREATE OR REPLACE FUNCTION public.rpc_process_transaction(p_student_id uuid, p_delta_coins bigint, p_delta_xp bigint, p_type text, p_source_type text, p_source_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- [Sprint 2] بوّابة المشغّل: تمنع أي دور غير مصرَّح من تعديل أي محفظة في مدرسته
    IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN
       ('system_owner','school_principal','school_admin','teacher','activity_leader') THEN
        RAISE EXCEPTION 'Not authorized: caller role may not operate the student economy';
    END IF;

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

    -- 4. student_profiles.school_id قد يكون NULL — فحص صريح
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
$function$;

-- ── 4) rpc_complete_quest(uuid, uuid) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_complete_quest(p_quest_node_id uuid, p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_id    uuid;
    v_quest        RECORD;
    v_reward_coins bigint;
    v_reward_xp    bigint;
BEGIN
    -- [Sprint 2] بوّابة المشغّل
    IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN
       ('system_owner','school_principal','school_admin','teacher','activity_leader') THEN
        RAISE EXCEPTION 'Not authorized: caller role may not operate the student economy';
    END IF;

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
$function$;
