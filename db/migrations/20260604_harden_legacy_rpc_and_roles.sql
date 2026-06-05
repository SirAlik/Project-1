-- ============================================================
-- Phase 3 — تصليب RPCs القديمة والـ Enums
-- ============================================================
-- يُعالج:
--   B. rpc_scan_ar_glyph / rpc_purchase_furniture — منح anon
--      rpc_process_transaction / rpc_corrupt_system — منح anon
--   C. get_my_role() — يشير إلى profiles.role المحذوف
--   D. invites.target_role — لا تزال تستخدم user_role enum القديم
--   E. user_role enum — إزالة آمنة بدون CASCADE مع تحقق pg_depend
--   F. rate_limit_tracker — جدول مفقود + RPC مفقودة
--
-- ملاحظة: system_config وإعادة بناء gamification RPCs الكاملة
--         موجودة في Phase 4 (20260604_rebuild_gamification_ledger_infrastructure.sql).
-- ============================================================

BEGIN;

-- ============================================================
-- B. REVOKE anon من RPCs الخطرة
-- ============================================================
-- هذه الدوال SECURITY DEFINER — وصول anon يعني أي مستخدم
-- غير مصادَق يمكنه استدعاؤها مباشرةً عبر REST API.

DO $$
BEGIN
    -- rpc_scan_ar_glyph(text)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_scan_ar_glyph'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text) TO authenticated;
        RAISE NOTICE '✓ rpc_scan_ar_glyph(text): anon مُلغَى — authenticated فقط';
    END IF;

    -- rpc_scan_ar_glyph(text, uuid) — إن وُجد
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_type t ON t.oid = ANY(p.proargtypes)
        WHERE n.nspname = 'public' AND p.proname = 'rpc_scan_ar_glyph'
          AND pronargs = 2
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_scan_ar_glyph(text, uuid): anon مُلغَى';
    END IF;

    -- rpc_purchase_furniture(uuid)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_purchase_furniture'
          AND pronargs = 1
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_purchase_furniture(uuid): anon مُلغَى';
    END IF;

    -- rpc_purchase_furniture(uuid, uuid) — إن وُجد
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_purchase_furniture'
          AND pronargs = 2
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) FROM anon, public;
        GRANT  EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) TO authenticated;
        RAISE NOTICE '✓ rpc_purchase_furniture(uuid, uuid): anon مُلغَى';
    END IF;

    -- rpc_process_transaction (أي نسخة موجودة — Phase 4 ستُعيد بناءها)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_process_transaction'
    ) THEN
        REVOKE EXECUTE ON FUNCTION
            public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
        FROM anon, public;
        GRANT EXECUTE ON FUNCTION
            public.rpc_process_transaction(uuid, bigint, bigint, text, text, uuid)
        TO authenticated;
        RAISE NOTICE '✓ rpc_process_transaction: anon مُلغَى';
    END IF;

    -- rpc_corrupt_system
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_corrupt_system'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.rpc_corrupt_system(uuid) FROM anon, public;
        RAISE NOTICE '✓ rpc_corrupt_system: anon مُلغَى';
    END IF;
END $$;

-- ============================================================
-- C. get_my_role() — استبدال بنسخة تقرأ من JWT
-- ============================================================
-- الدالة الحية تشير إلى profiles.role الذي حُذف في R04.
-- الاستبدال الآمن: قراءة الدور من JWT مباشرةً.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- profiles.role حُذف في R04 — الدور يُقرأ من JWT app_metadata
    SELECT auth.jwt()->'app_metadata'->>'role';
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

DO $$ BEGIN
    RAISE NOTICE '✓ get_my_role(): أُعيد بناؤها لتقرأ من JWT بدلاً من profiles.role';
END $$;

-- ============================================================
-- D. invites.target_role — تغيير النوع من user_role إلى school_role_type
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='invites') THEN
        RAISE NOTICE 'invites غير موجودة — تخطي تغيير النوع.';
        RETURN;
    END IF;

    -- فارغة في مرحلة ما قبل الإطلاق (R08 أفرغتها أيضاً)
    TRUNCATE TABLE public.invites;

    -- تأكد أن target_school_id NOT NULL (قد تكون R08 لم تُطبَّق)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='invites'
          AND column_name='target_school_id' AND is_nullable='YES'
    ) THEN
        ALTER TABLE public.invites
            ALTER COLUMN target_school_id SET NOT NULL;
        RAISE NOTICE 'invites.target_school_id: SET NOT NULL ✓';
    END IF;

    -- تغيير نوع target_role من user_role إلى school_role_type
    -- الجدول فارغ → USING لن يُنفَّذ على أي صف
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='invites'
          AND column_name='target_role'
    ) THEN
        -- تحقق من النوع الحالي
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='invites'
              AND column_name='target_role'
              AND udt_name = 'user_role'
        ) THEN
            ALTER TABLE public.invites
                ALTER COLUMN target_role TYPE public.school_role_type
                USING target_role::text::public.school_role_type;
            RAISE NOTICE 'invites.target_role: user_role → school_role_type ✓';
        ELSE
            RAISE NOTICE 'invites.target_role: النوع ليس user_role — تخطي (ربما طُبِّق بالفعل).';
        END IF;
    END IF;
END $$;

-- ============================================================
-- E. حذف user_role enum بأمان — بدون CASCADE
-- ============================================================
-- نستخدم pg_depend بدلاً من information_schema.columns
-- لأن information_schema.columns لا يكتشف الدوال والـ views
-- والـ domains و CHECK constraints التي تعتمد على الـ enum.

DO $$
DECLARE
    v_dep_count int;
BEGIN
    -- تحقق شامل من المعتمِدين عبر pg_depend
    SELECT COUNT(*) INTO v_dep_count
    FROM pg_depend d
    JOIN pg_type t ON t.oid = d.refobjid
    WHERE d.refclassid = 'pg_type'::regclass
      AND t.typname      = 'user_role'
      AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND d.deptype      = 'n';

    IF v_dep_count > 0 THEN
        RAISE EXCEPTION
            'user_role لا يزال لديه % مُعتمِد — لا يمكن الحذف الآمن. '
            'للتحقيق: SELECT d.classid::regclass, d.objid, d.deptype '
            'FROM pg_depend d JOIN pg_type t ON t.oid=d.refobjid '
            'JOIN pg_namespace n ON n.oid=t.typnamespace '
            'WHERE t.typname=''user_role'' AND d.deptype=''n''',
            v_dep_count;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'user_role'
    ) THEN
        -- بدون CASCADE — أي فشل يكشف عن مُعتمِد خفي لم تلتقطه pg_depend
        DROP TYPE public.user_role;
        RAISE NOTICE '✓ user_role enum: حُذف بأمان (بدون CASCADE)';
    ELSE
        RAISE NOTICE '✓ user_role enum: غير موجود (تم حذفه مسبقاً أو لم يُنشَأ)';
    END IF;
END $$;

-- ============================================================
-- F. rate_limit_tracker + increment_rate_limit RPC
-- ============================================================
-- lib/rate-limiter.ts يحتاج هذا الجدول — غائب من قاعدة البيانات الحية.
-- الـ rate limiter يعمل بنمط fail-open حالياً (يسمح بكل شيء).
-- إنشاء الجدول يفعّل حماية rate limiting الفعلية.

CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type  text        NOT NULL,
    window_start timestamptz NOT NULL,
    attempt_count int        NOT NULL DEFAULT 1,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT rate_limit_tracker_unique UNIQUE (user_id, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rlt_user_action_window
    ON public.rate_limit_tracker (user_id, action_type, window_start DESC);

-- تنظيف تلقائي للنوافذ المنتهية (أقدم من 24 ساعة)
CREATE INDEX IF NOT EXISTS idx_rlt_window_start
    ON public.rate_limit_tracker (window_start);

-- RLS: كل مستخدم يرى سجلاته فقط — الكتابة عبر supabaseAdmin فقط
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limit_tracker_select" ON public.rate_limit_tracker;
CREATE POLICY "rate_limit_tracker_select" ON public.rate_limit_tracker
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- لا سياسة INSERT/UPDATE للـ authenticated — يكتب عبر service_role فقط
-- (lib/rate-limiter.ts يستخدم supabaseAdmin)

-- RPC: زيادة العداد
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
    p_user_id    uuid,
    p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start timestamptz;
BEGIN
    -- ابحث عن النافذة الحالية (آخر ساعة)
    SELECT window_start INTO v_window_start
    FROM public.rate_limit_tracker
    WHERE user_id     = p_user_id
      AND action_type = p_action_type
      AND window_start >= now() - interval '1 hour'
    ORDER BY window_start DESC
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.rate_limit_tracker
        SET attempt_count = attempt_count + 1
        WHERE user_id     = p_user_id
          AND action_type = p_action_type
          AND window_start = v_window_start;
    END IF;
    -- إذا لم توجد نافذة، upsert من التطبيق سيُنشئها
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text) FROM authenticated;
-- يُستدعَى عبر service_role فقط (supabaseAdmin)

DO $$ BEGIN
    RAISE NOTICE '✓ rate_limit_tracker: جدول + RLS + increment_rate_limit RPC';
END $$;

-- ─── Validation ───────────────────────────────────────────────

DO $$
DECLARE
    v_src text;
BEGIN
    -- get_my_role لا تشير لـ profiles.role
    SELECT prosrc INTO v_src
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_my_role';

    IF v_src ILIKE '%profiles%' OR v_src ILIKE '%FROM.*profiles%' THEN
        RAISE EXCEPTION 'FAIL: get_my_role() لا تزال تقرأ من profiles';
    END IF;

    -- rate_limit_tracker موجودة
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rate_limit_tracker') THEN
        RAISE EXCEPTION 'FAIL: rate_limit_tracker غير موجودة بعد الإنشاء';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Phase 3 اكتمل:';
    RAISE NOTICE '   rpc_*: anon مُلغَى         — authenticated فقط ✓';
    RAISE NOTICE '   get_my_role()              — تقرأ من JWT ✓';
    RAISE NOTICE '   invites.target_role        — school_role_type ✓';
    RAISE NOTICE '   user_role enum             — حُذف بأمان بدون CASCADE ✓';
    RAISE NOTICE '   rate_limit_tracker         — مُنشَأ ✓';
    RAISE NOTICE '';
    RAISE NOTICE '📌 system_config + gamification RPCs: موجودة في Phase 4';
    RAISE NOTICE '   (20260604_rebuild_gamification_ledger_infrastructure.sql)';
END $$;

COMMIT;
