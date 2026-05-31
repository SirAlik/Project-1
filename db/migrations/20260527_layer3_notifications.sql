-- Migration 49: Layer 3 — Notifications
-- مركز إشعارات موحَّد لجميع الـ workflows والـ triggers
-- prerequisite مشترك للمرحلة 3 (Wizards) وما بعدها

-- ─────────────────────────────────────────────────────────────────────────────
-- الجدول
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            uuid        NOT NULL REFERENCES public.schools(id),

  -- المستلم: persona_id للمستخدم المحدد، أو role للبث لدور كامل
  recipient_persona_id uuid        REFERENCES public.user_personas(id),
  recipient_role       text,       -- fallback: يُستخدم إذا لم يُحدَّد persona_id

  -- نوع الإشعار وتفاصيله
  notification_type    text        NOT NULL,
  -- أمثلة: 'gate_assigned', 'gate_decided', 'workflow_completed',
  --         'hr_ticket_created', 'hr_response_required', 'hr_decision_ready',
  --         'wizard_submitted', 'form_ready'
  title                text        NOT NULL,
  body                 text,

  -- مصدر الإشعار (للربط مع السجل الأصلي)
  source_table         text,
  source_record_id     uuid,
  workflow_instance_id uuid        REFERENCES public.workflow_instances(id),

  -- حالة القراءة
  is_read              boolean     NOT NULL DEFAULT false,
  read_at              timestamptz,

  created_at           timestamptz NOT NULL DEFAULT now(),

  -- إما persona_id أو role — أحدهما إلزامي
  CONSTRAINT notif_recipient_required CHECK (
    recipient_persona_id IS NOT NULL OR recipient_role IS NOT NULL
  )
);

COMMENT ON TABLE public.notifications IS
  'Layer 3: مركز الإشعارات الموحَّد — يُنشأ من service layer أو triggers';

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- الأكثر استخداماً: إشعارات المستخدم غير المقروءة
CREATE INDEX IF NOT EXISTS idx_notif_persona_unread
  ON public.notifications (recipient_persona_id, is_read, created_at DESC)
  WHERE recipient_persona_id IS NOT NULL;

-- إشعارات الدور (broadcast)
CREATE INDEX IF NOT EXISTS idx_notif_role
  ON public.notifications (school_id, recipient_role, is_read, created_at DESC)
  WHERE recipient_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_workflow
  ON public.notifications (workflow_instance_id)
  WHERE workflow_instance_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- قراءة: المستخدم يرى فقط إشعاراته المباشرة أو إشعارات دوره في مدرسته
CREATE POLICY "notif_select" ON public.notifications FOR SELECT
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'system_owner'
    OR (
      school_id = get_my_school_id()
      AND (
        recipient_persona_id IN (
          SELECT id FROM public.user_personas
          WHERE user_id = auth.uid()
            AND school_id = get_my_school_id()
        )
        OR (
          recipient_role = (auth.jwt()->'app_metadata'->>'role')
          AND recipient_persona_id IS NULL
        )
      )
    )
  );

-- إنشاء: service layer يُنشئ إشعارات لموظفي المدرسة
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT
  WITH CHECK (school_id = get_my_school_id());

-- تحديث: المستخدم يُحدّث is_read لإشعاراته المباشرة فقط
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE
  USING (
    school_id = get_my_school_id()
    AND recipient_persona_id IN (
      SELECT id FROM public.user_personas
      WHERE user_id = auth.uid()
        AND school_id = get_my_school_id()
    )
  );
