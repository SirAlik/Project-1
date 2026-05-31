-- =================================================================
-- Migration 51: Layer 6 — تحسين meeting_session_attendees
-- التاريخ: 2026-05-27
-- الهدف: إضافة حقول RSVP + التوقيع الرقمي + وقت الانضمام
-- =================================================================
-- يُضيف هذا الـ migration ثلاثة أعمدة جديدة إلى meeting_session_attendees:
--   • rsvp_status    — رد الدعوة: pending | accepted | declined
--   • joined_at      — وقت انضمام الحاضر فعلياً للاجتماع
--   • signature_hash — البصمة الرقمية عند توقيع المحضر
--
-- التبعيات: meeting_session_attendees ✅ (Migration 45)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_session_attendees'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول meeting_session_attendees غير موجود — طبّق Migration 45 أولاً';
    END IF;
    RAISE NOTICE 'Preflight نجح: meeting_session_attendees موجود';
END $$;

-- ============================================================
-- إضافة الأعمدة الجديدة (IF NOT EXISTS لضمان الـ idempotency)
-- ============================================================

ALTER TABLE public.meeting_session_attendees
    ADD COLUMN IF NOT EXISTS rsvp_status   text        NOT NULL DEFAULT 'pending'
        CHECK (rsvp_status IN ('pending', 'accepted', 'declined')),
    ADD COLUMN IF NOT EXISTS joined_at     timestamptz,
    ADD COLUMN IF NOT EXISTS signature_hash text;

COMMENT ON COLUMN public.meeting_session_attendees.rsvp_status    IS 'رد الدعوة — pending/accepted/declined';
COMMENT ON COLUMN public.meeting_session_attendees.joined_at      IS 'وقت انضمام الحاضر فعلياً للاجتماع';
COMMENT ON COLUMN public.meeting_session_attendees.signature_hash IS 'البصمة الرقمية عند توقيع محضر الاجتماع';

-- ============================================================
-- Index على rsvp_status (للبحث عن من لم يردّ بعد)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_msa_rsvp_pending
    ON public.meeting_session_attendees (meeting_session_id, rsvp_status)
    WHERE rsvp_status = 'pending';

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'meeting_session_attendees'
          AND  column_name  = 'rsvp_status'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: عمود rsvp_status لم يُضَف';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'meeting_session_attendees'
          AND  column_name  = 'signature_hash'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: عمود signature_hash لم يُضَف';
    END IF;

    RAISE NOTICE '✓ meeting_session_attendees: rsvp_status + joined_at + signature_hash أُضيفت بنجاح';
    RAISE NOTICE '✓ Migration 51 اكتمل بنجاح';
END $$;

COMMIT;
