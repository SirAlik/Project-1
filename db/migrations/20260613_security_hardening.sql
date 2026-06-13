-- =================================================================
-- M82: Security Hardening — Root Fix Pass (Phase 3E security sprint)
-- التاريخ: 2026-06-13
-- =================================================================
-- يُعالِج نتائج تدقيق الأمن (docs/security/*) من الجذر — كلها إضافية/تقييدية
-- وغير مدمّرة، PRE-LAUNCH (0 بيانات في الجداول المعنيّة):
--
--   FIX 3  — bucket qms-forms خاص (public=false) — منع روابط عامة لملفات PDF حسّاسة.
--   FIX 4  — نزاهة السجلّ/المحفظة: الكتابة حصراً عبر rpc_process_transaction (SECURITY DEFINER).
--            حذف سياسات الكتابة المباشرة + سحب منح الكتابة من authenticated (append-only فعلي).
--   FIX 7  — سحب EXECUTE العام عن 12 دالة trigger/أداة (لا تحتاج EXECUTE للعميل).
--   FIX 8  — منع تكرار generated_forms على مستوى DB (فهرس فريد).
--   FIX 9  — فهارس FK أمنية + تحسين initplan لسياسات جداول 3E-2 (نفس الدلالة).
--
-- لا يمسّ: schema الأعمدة · بيانات تاريخية · rpc_process_transaction نفسها · أي RLS
--          خارج الجدولين المذكورين في FIX 9.
-- =================================================================

-- ════════════════════════════════════════════════════════════════
-- FIX 4 — Ledger / wallet integrity: RPC-only writes
-- ════════════════════════════════════════════════════════════════
-- rpc_process_transaction (SECURITY DEFINER، يعمل بصلاحية المالك) يبقى المسار الوحيد للكتابة.
-- حذف منافذ الكتابة المباشرة للعميل:
DROP POLICY IF EXISTS "tl_insert"  ON public.transaction_logs;   -- كان يسمح INSERT مباشر لأدوار داخل-المستأجر
DROP POLICY IF EXISTS "sw_manage"  ON public.student_wallet;     -- كان ALL (كتابة مباشرة للرصيد)
-- (tl_select / sw_select تبقى للقراءة.)

-- دفاع متعمّق: سحب منح الكتابة من authenticated → السجلّ append-only والمحفظة غير قابلة للتعديل
-- المباشر حتى لو أُضيفت سياسة لاحقاً بالخطأ. rpc_process_transaction لا تتأثر (SECURITY DEFINER).
REVOKE INSERT, UPDATE, DELETE ON public.transaction_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.student_wallet  FROM authenticated;

-- ════════════════════════════════════════════════════════════════
-- FIX 7 — Revoke client EXECUTE on trigger/utility functions
-- ════════════════════════════════════════════════════════════════
-- دوال trigger تُنفَّذ بآلية الـtrigger بصلاحية المالك بصرف النظر عن منح EXECUTE،
-- فلا يحتاج العميل EXECUTE. لا واحدة منها تُستدعى عبر .rpc() في كود التطبيق (مُتحقَّق).
REVOKE EXECUTE ON FUNCTION public.fn_case_actions_set_school_id()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_student_honors_set_school_id()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_student_wishes_set_school_id()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_absence()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_generate_procurement_number()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_prevent_mln_update()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_prevent_wft_update()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sal_set_updated_at()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_enrollment_to_profile()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_modified_column()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_idempotency()        FROM PUBLIC, anon, authenticated;
-- (postgres + service_role يحتفظان بـ EXECUTE — مسارات الخادم/الصيانة تبقى تعمل.)

-- ════════════════════════════════════════════════════════════════
-- FIX 8 — generated_forms: DB-level dedup
-- ════════════════════════════════════════════════════════════════
-- يدعم منع التكرار في createGeneratedForm (الذي يُخزّن الرمز المعتمد) على مستوى DB.
-- كل الأعمدة NOT NULL → الفهرس الفريد كامل التغطية. (0 صف حالياً → آمن.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_generated_forms_dedup
    ON public.generated_forms (school_id, form_code, source_table, source_record_id);

-- ════════════════════════════════════════════════════════════════
-- FIX 9 — FK indexes (security-relevant access paths)
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sqs_updated_by  ON public.school_quality_settings (updated_by_persona_id);
CREATE INDEX IF NOT EXISTS idx_sqto_updated_by ON public.school_quality_template_overrides (updated_by_persona_id);
CREATE INDEX IF NOT EXISTS idx_qe_academic_year ON public.quality_evidence (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_qe_recorded_by   ON public.quality_evidence (recorded_by_persona_id);

-- ════════════════════════════════════════════════════════════════
-- FIX 9 — RLS initplan optimization on Phase 3E-2 tables
-- ════════════════════════════════════════════════════════════════
-- نفس الدلالة بالضبط، لكن auth.jwt()/get_my_school_id() تُقيَّم مرة واحدة لكل استعلام
-- ((select ...)) بدل كل صف. يقتصر على جدولي 3E-2 (لا تعديل جماعي أعمى لـ286 سياسة).

-- school_quality_settings
DROP POLICY IF EXISTS "sqs_select" ON public.school_quality_settings;
CREATE POLICY "sqs_select" ON public.school_quality_settings
FOR SELECT TO authenticated
USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = (select public.get_my_school_id())
);

DROP POLICY IF EXISTS "sqs_insert" ON public.school_quality_settings;
CREATE POLICY "sqs_insert" ON public.school_quality_settings
FOR INSERT TO authenticated
WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
);

DROP POLICY IF EXISTS "sqs_update" ON public.school_quality_settings;
CREATE POLICY "sqs_update" ON public.school_quality_settings
FOR UPDATE TO authenticated
USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
)
WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
);

-- school_quality_template_overrides
DROP POLICY IF EXISTS "sqto_select" ON public.school_quality_template_overrides;
CREATE POLICY "sqto_select" ON public.school_quality_template_overrides
FOR SELECT TO authenticated
USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = (select public.get_my_school_id())
);

DROP POLICY IF EXISTS "sqto_insert" ON public.school_quality_template_overrides;
CREATE POLICY "sqto_insert" ON public.school_quality_template_overrides
FOR INSERT TO authenticated
WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
);

DROP POLICY IF EXISTS "sqto_update" ON public.school_quality_template_overrides;
CREATE POLICY "sqto_update" ON public.school_quality_template_overrides
FOR UPDATE TO authenticated
USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
)
WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
);

DROP POLICY IF EXISTS "sqto_delete" ON public.school_quality_template_overrides;
CREATE POLICY "sqto_delete" ON public.school_quality_template_overrides
FOR DELETE TO authenticated
USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = (select public.get_my_school_id()) AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'school_admin')
);

-- ════════════════════════════════════════════════════════════════
-- FIX 3 — Private qms-forms storage bucket
-- ════════════════════════════════════════════════════════════════
-- إنشاء bucket خاص (public=false). لا سياسات storage.objects للعميل عليه:
-- RLS على storage.objects بلا سياسة = حجب وصول العميل تماماً؛ الوصول حصراً service_role
-- server-side (signed URLs قصيرة الأجل عبر lib/quality/qms-pdf.ts).
INSERT INTO storage.buckets (id, name, public)
VALUES ('qms-forms', 'qms-forms', false)
ON CONFLICT (id) DO UPDATE SET public = false;
