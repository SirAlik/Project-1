-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 2 — Phase 7: سِجِلّ أجهزة البصمة (device → school binding)
-- ════════════════════════════════════════════════════════════════════════════
--
-- المشكلة:
--   كان webhook البصمة (app/api/biometric/webhook/route.ts) يثق بـ school_id
--   و device_id القادمَين في الحمولة، ويستعمل سرّاً عالمياً واحداً
--   (BIOMETRIC_WEBHOOK_SECRET). أي طرف يعرف السرّ يستطيع حقن حضور لأي مدرسة
--   بتغيير school_id في الحمولة.
--
-- الحل:
--   جدول تسجيل أجهزة يربط كل device_id بمدرسة واحدة. الـwebhook يرفض (fail-closed)
--   أي جهاز غير مسجَّل أو لا يطابق school_id الخاص به أو غير مُفعَّل. بذلك يصبح حقن
--   حضور لمدرسة أخرى مشروطاً بمعرفة device_id مُسجَّل لتلك المدرسة (إضافةً للسرّ).
--   (السرّ-لكل-جهاز تحسين مستقبلي؛ هذا السجلّ يغلق ثغرة انتحال المدرسة الآن.)
--
-- ملاحظة تشغيلية:
--   حتى تُسجَّل الأجهزة (إجراء مالك/منسق المدرسة)، يرفض الـwebhook كل الحمولات
--   بصدق (fail-closed) — لا تحقّق وهمي. هذا هو السلوك الأمني الصحيح: الجهاز
--   غير المسجَّل لا يُسجِّل حضوراً.
--
-- أثر التراجع:
--   جدول جديد + سياسات جديدة فقط (لا تغيير لأي كائن قائم). التراجع:
--   DROP TABLE public.biometric_devices CASCADE; ثم إرجاع كود الـwebhook.
--   PRE-LAUNCH: لا بيانات.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.biometric_devices (
    device_id     text PRIMARY KEY,
    school_id     uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    label         text,
    is_active     boolean NOT NULL DEFAULT true,
    registered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_devices_school ON public.biometric_devices(school_id);

ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;

-- قراءة: مالك النظام، أو طاقم إداري لمدرسته فقط
CREATE POLICY bd_select ON public.biometric_devices FOR SELECT
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['school_admin','school_principal','school_secretary']))
);

-- إدارة (تسجيل/تعديل): مالك النظام، أو منسق المدرسة لمدرسته فقط
CREATE POLICY bd_manage ON public.biometric_devices FOR ALL
USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin')
)
WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner')
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin')
);
