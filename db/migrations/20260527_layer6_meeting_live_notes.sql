-- =================================================================
-- Migration 52: Layer 6 — جدول meeting_live_notes
-- التاريخ: 2026-05-27
-- الهدف: ملاحظات الاجتماع الحية — append-only — تدعم Supabase Realtime
-- =================================================================
-- • يُلتقط هذا الجدول كل نقاش/قرار/بند إجراء أثناء الاجتماع
-- • append-only: trigger يمنع UPDATE (لحفظ سلامة السجل)
-- • تُفعَّل قناة Realtime على هذا الجدول لعرض الملاحظات فورياً
--
-- التبعيات: meeting_sessions ✅ (Migration 45) + user_personas ✅
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_sessions'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: جدول meeting_sessions غير موجود — طبّق Migration 45 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname  = 'meeting_sessions_id_school_id_key'
          AND  conrelid = 'public.meeting_sessions'::regclass
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: UNIQUE(id, school_id) غير موجود على meeting_sessions';
    END IF;

    RAISE NOTICE 'Preflight نجح: meeting_sessions + UNIQUE(id, school_id) موجودان';
END $$;

-- ============================================================
-- إنشاء جدول meeting_live_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_live_notes (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Composite FK لضمان تطابق school_id
    meeting_session_id   uuid        NOT NULL,
    school_id            uuid        NOT NULL,

    -- المؤلف
    author_persona_id    uuid        NOT NULL REFERENCES public.user_personas(id),
    author_name_snapshot text        NOT NULL,

    -- نوع الملاحظة
    note_type            text        NOT NULL
                         CHECK (note_type IN ('discussion', 'decision', 'action_item', 'attachment')),

    content              text        NOT NULL,
    agenda_topic_idx     int,        -- رقم بند جدول الأعمال المرتبط (اختياري)

    created_at           timestamptz NOT NULL DEFAULT now(),

    -- Composite FK: تطابق school_id مع meeting_sessions
    CONSTRAINT fk_mln_session FOREIGN KEY (meeting_session_id, school_id)
        REFERENCES public.meeting_sessions (id, school_id)
);

COMMENT ON TABLE  public.meeting_live_notes                       IS 'Layer 6: ملاحظات الاجتماع الحية — append-only — Realtime enabled';
COMMENT ON COLUMN public.meeting_live_notes.note_type            IS 'discussion | decision | action_item | attachment';
COMMENT ON COLUMN public.meeting_live_notes.agenda_topic_idx     IS 'ربط الملاحظة ببند محدد في agenda_items — nullable';

-- ============================================================
-- Trigger: منع UPDATE (defense in depth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_mln_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'meeting_live_notes: append-only — التعديل ممنوع';
END $$;

CREATE TRIGGER trg_prevent_mln_update
    BEFORE UPDATE ON public.meeting_live_notes
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mln_update();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mln_session_time
    ON public.meeting_live_notes (meeting_session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mln_school_time
    ON public.meeting_live_notes (school_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mln_type
    ON public.meeting_live_notes (meeting_session_id, note_type);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.meeting_live_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: جميع موظفي المدرسة + system_owner
DROP POLICY IF EXISTS "mln_select" ON public.meeting_live_notes;
CREATE POLICY "mln_select" ON public.meeting_live_notes
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: جميع موظفي المدرسة المشاركين في الاجتماع
DROP POLICY IF EXISTS "mln_insert" ON public.meeting_live_notes;
CREATE POLICY "mln_insert" ON public.meeting_live_notes
    FOR INSERT
    WITH CHECK (school_id = get_my_school_id());

-- لا UPDATE — لا DELETE

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_live_notes'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول meeting_live_notes لم يُنشأ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE  event_object_schema = 'public'
          AND  event_object_table  = 'meeting_live_notes'
          AND  trigger_name        = 'trg_prevent_mln_update'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: trigger trg_prevent_mln_update غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN   pg_namespace n ON n.oid = c.relnamespace
        WHERE  n.nspname = 'public' AND c.relname = 'meeting_live_notes'
          AND  c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على meeting_live_notes';
    END IF;

    RAISE NOTICE '✓ meeting_live_notes أُنشئ بنجاح';
    RAISE NOTICE '✓ trigger append-only مُفعّل';
    RAISE NOTICE '✓ RLS مُفعّل';
    RAISE NOTICE '✓ Migration 52 اكتمل بنجاح';
END $$;

COMMIT;
