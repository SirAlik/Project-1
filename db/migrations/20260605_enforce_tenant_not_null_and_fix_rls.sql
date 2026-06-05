-- ============================================================
-- Migration: enforce_tenant_not_null_and_fix_rls
-- Date: 2026-06-05
-- ============================================================
-- الهدف:
--   1. حذف سياسة INSERT خطيرة على events تسمح لأي مستخدم مسجل
--      بالإدراج في أي مدرسة (خرق tenant isolation)
--   2. حذف سياسة SELECT مكررة على user_personas
--   3. تطبيق NOT NULL على school_id في 10 جداول tenant
--
-- نتائج الفحص المباشر (2026-06-05، DB الحية ciwqgskyqtnciexfcgrr):
--   • action_audit_log : 32 صفاً، 0 قيم NULL في school_id
--   • user_personas    : 4 صفوف، 0 قيم NULL في school_id
--   • الجداول الثمانية الأخرى: 0 صفوف
--   • إجمالي NULLs عبر كل الجداول العشرة = 0
--   → لا حاجة لـ TRUNCATE، لا حاجة لـ CASCADE
--
-- CASCADE غير مستخدم لأن ALTER COLUMN SET NOT NULL
-- لا تحتاجه — فقط تضيف قيد على العمود نفسه.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- Section 1: حذف سياسة INSERT خطيرة على events
-- ════════════════════════════════════════════════════════════════
-- "Staff Insert Events" WITH CHECK: (auth.uid() IS NOT NULL)
-- بما أن Supabase يُطبّق permissive policies بـ OR منطقي، هذه
-- السياسة تُلغي فعلياً قيود school_id والدور الموجودة في events_insert.
-- النتيجة: أي مستخدم مسجّل يستطيع إدراج event في أي مدرسة.
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Staff Insert Events" ON public.events;

-- ════════════════════════════════════════════════════════════════
-- Section 2: حذف سياسة SELECT مكررة على user_personas
-- ════════════════════════════════════════════════════════════════
-- "Users can read own personas"  USING: (user_id = auth.uid())
-- "Users read own personas"      USING: (user_id = auth.uid())  ← نُبقي هذه
-- السياستان متطابقتان — نحذف واحدة لتنظيف multiple permissive policies.
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can read own personas" ON public.user_personas;

-- ════════════════════════════════════════════════════════════════
-- Section 3: تطبيق NOT NULL على school_id في 10 جداول tenant
-- ════════════════════════════════════════════════════════════════
-- فحص pre-flight مُجرى مباشرةً على DB الحية — صفر NULLs في الجميع.
-- هذا يُحوّل الضمان المعماري الضمني إلى قيد DB صريح يمنع
-- أي صف بدون school_id من الإدراج مستقبلاً.
ALTER TABLE public.academic_years      ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.action_audit_log    ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.activity_clubs      ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.activity_events     ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.activity_financials ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.classes             ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.counseling_sessions ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.events              ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.student_profiles    ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.user_personas       ALTER COLUMN school_id SET NOT NULL;

COMMIT;
