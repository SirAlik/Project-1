-- ============================================================
-- R10: إغلاق authenticated من الدوال الحرجة + z_archive
-- ============================================================
-- يعالج ما تبقى من نتائج Supabase Lint بعد R09:
--
--   WARN-1 — 3 دوال trigger قابلة للاستدعاء من authenticated عبر REST
--   WARN-2 — 3 دوال admin/cron قابلة للاستدعاء من authenticated
--   WARN-3 — z_archive مكشوف للـ authenticated (R09 أغلقه من anon فقط)
--
-- ما لا يُعالَج هنا (مقصود وصحيح):
--   - get_my_school_id / is_super_admin / is_system_owner — RLS helpers لازمة
--   - rpc_scan_ar_glyph / rpc_purchase_furniture / rpc_process_transaction — student RPCs
--   - pg_graphql_authenticated_table_exposed على جداول public — محمية بـ RLS
-- ============================================================

BEGIN;

-- ============================================================
-- WARN-1: Trigger functions — يجب ألا تُستدعى via REST إطلاقاً
-- R09 أزال PUBLIC + anon، R10 يكمل بإزالة authenticated
-- ============================================================

-- block_privileged_field_changes — يُستدعى بواسطة trigger فقط
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM authenticated;

-- handle_new_user — يُستدعى تلقائياً على auth.users INSERT فقط
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- fn_auto_referral_on_absence — trigger على جدول الغياب فقط
REVOKE EXECUTE ON FUNCTION public.fn_auto_referral_on_absence() FROM authenticated;

-- ============================================================
-- WARN-2: Admin/cron functions — service_role فقط، لا authenticated
-- ============================================================

-- archive_old_audit_logs — مهمة أرشفة دورية، تُشغَّل بـ pg_cron / service_role
REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs() FROM authenticated;

-- cleanup_old_rate_limits — مهمة تنظيف دورية
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM authenticated;

-- rpc_reconcile_wallets — عملية مالية admin خالصة
REVOKE EXECUTE ON FUNCTION public.rpc_reconcile_wallets() FROM authenticated;

-- ============================================================
-- WARN-3: z_archive — إغلاق كامل من authenticated
-- R09 أغلق anon، لكن authenticated لا يزال يرى z_archive في GraphQL
-- z_archive = أرشيف تاريخي، service_role فقط
-- ============================================================

REVOKE ALL ON ALL TABLES    IN SCHEMA z_archive FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA z_archive FROM authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA z_archive FROM authenticated;
REVOKE USAGE ON SCHEMA z_archive               FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA z_archive REVOKE ALL ON TABLES    FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA z_archive REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA z_archive REVOKE ALL ON FUNCTIONS FROM authenticated;

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
BEGIN
    -- z_archive مغلق من authenticated
    IF EXISTS (
        SELECT 1 FROM information_schema.role_usage_grants
        WHERE object_schema = 'z_archive'
          AND grantee       = 'authenticated'
    ) THEN
        RAISE EXCEPTION 'FAIL WARN-3: authenticated لا يزال يملك USAGE على z_archive';
    END IF;

    RAISE NOTICE '✅ R10 اكتمل:';
    RAISE NOTICE '   WARN-1: block_privileged_field_changes + handle_new_user + fn_auto_referral_on_absence — REVOKE من authenticated';
    RAISE NOTICE '   WARN-2: archive_old_audit_logs + cleanup_old_rate_limits + rpc_reconcile_wallets — REVOKE من authenticated';
    RAISE NOTICE '   WARN-3: z_archive — مُغلَق بالكامل من authenticated';
END;
$$;

COMMIT;
