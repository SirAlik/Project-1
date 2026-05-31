-- Migration 48: Layer 3 — Generated Forms
-- سجل النماذج المُولَّدة تلقائياً (PDF) لكل workflow / trigger
-- prerequisite مشترك للمرحلة 3 (Wizards) وما بعدها

-- ─────────────────────────────────────────────────────────────────────────────
-- الجدول
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_forms (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            uuid        NOT NULL REFERENCES public.schools(id),

  -- رمز النموذج (مثل 'QF03-1', 'QF-A-3-1', 'QF-19-1', 'QF-71-9-5')
  form_code            text        NOT NULL,

  -- السجل الأصلي الذي أنتج النموذج
  source_table         text        NOT NULL,
  source_record_id     uuid        NOT NULL,

  -- workflow المرتبط (اختياري — لربط النموذج بمسار عمل)
  workflow_instance_id uuid        REFERENCES public.workflow_instances(id),

  -- مخرج PDF
  pdf_url              text,
  storage_path         text,
  is_ready             boolean     NOT NULL DEFAULT false,
  generated_at         timestamptz,

  -- بيانات إضافية للـ PDF generator (اسم الموظف، التاريخ، إلخ)
  form_data            jsonb,

  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.generated_forms IS
  'Layer 3: سجل جميع النماذج المُولَّدة تلقائياً — يُنشأ من triggers أو service layer';

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gf_source
  ON public.generated_forms (source_table, source_record_id);

CREATE INDEX IF NOT EXISTS idx_gf_school_code
  ON public.generated_forms (school_id, form_code);

CREATE INDEX IF NOT EXISTS idx_gf_workflow
  ON public.generated_forms (workflow_instance_id)
  WHERE workflow_instance_id IS NOT NULL;

-- قائمة انتظار توليد PDF (النماذج غير الجاهزة)
CREATE INDEX IF NOT EXISTS idx_gf_pending
  ON public.generated_forms (school_id, created_at)
  WHERE is_ready = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.generated_forms ENABLE ROW LEVEL SECURITY;

-- قراءة: كل موظفي المدرسة
CREATE POLICY "gf_select" ON public.generated_forms FOR SELECT
  USING (
    school_id = get_my_school_id()
    OR (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
  );

-- إنشاء: موظفو المدرسة (يُنشأ من service layer أو trigger)
CREATE POLICY "gf_insert" ON public.generated_forms FOR INSERT
  WITH CHECK (school_id = get_my_school_id());

-- تحديث: لتسجيل pdf_url وis_ready بعد التوليد
CREATE POLICY "gf_update" ON public.generated_forms FOR UPDATE
  USING (school_id = get_my_school_id());
