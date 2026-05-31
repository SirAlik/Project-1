-- =================================================================
-- Migration 53: Layer 6 — جدول meeting_action_items
-- التاريخ: 2026-05-27
-- الهدف: بنود الإجراء المُصدَرة من الاجتماعات — قابلة للتتبع
-- =================================================================
-- • يرتبط كل بند بالاجتماع الذي أصدره
-- • يُعيَّن لموظف محدد مع أولوية وموعد استحقاق
-- • تُتابَع حالته من pending → done
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

    RAISE NOTICE 'Preflight نجح: meeting_sessions موجود مع UNIQUE(id, school_id)';
END $$;

-- ============================================================
-- إنشاء جدول meeting_action_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
    id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Composite FK
    meeting_session_id        uuid        NOT NULL,
    school_id                 uuid        NOT NULL,

    -- المهمة
    task                      text        NOT NULL,

    -- المُكلَّف
    assigned_to_persona_id    uuid        NOT NULL REFERENCES public.user_personas(id),
    assigned_to_name_snapshot text        NOT NULL,

    -- التوقيت والأولوية
    due_date                  date,
    priority                  text        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- الحالة
    status                    text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),

    created_at                timestamptz NOT NULL DEFAULT now(),
    completed_at              timestamptz,

    -- Composite FK: تطابق school_id مع meeting_sessions
    CONSTRAINT fk_mai_session FOREIGN KEY (meeting_session_id, school_id)
        REFERENCES public.meeting_sessions (id, school_id),

    -- completed_at يجب أن يكون مرتبطاً بحالة done
    CONSTRAINT mai_completed_consistency CHECK (
        (status = 'done' AND completed_at IS NOT NULL)
        OR (status != 'done' AND completed_at IS NULL)
        OR (completed_at IS NULL)
    )
);

COMMENT ON TABLE  public.meeting_action_items                         IS 'Layer 6: بنود الإجراء المُصدَرة من الاجتماعات';
COMMENT ON COLUMN public.meeting_action_items.priority               IS 'low | medium | high | critical';
COMMENT ON COLUMN public.meeting_action_items.status                 IS 'pending | in_progress | done | cancelled';

-- ============================================================
-- Indexes
-- ============================================================

-- للبحث عن البنود المعلقة لموظف محدد
CREATE INDEX IF NOT EXISTS idx_mai_assigned_status
    ON public.meeting_action_items (assigned_to_persona_id, status)
    WHERE status IN ('pending', 'in_progress');

-- لعرض بنود اجتماع محدد
CREATE INDEX IF NOT EXISTS idx_mai_session
    ON public.meeting_action_items (meeting_session_id);

-- للمتابعة حسب الاستحقاق
CREATE INDEX IF NOT EXISTS idx_mai_school_due
    ON public.meeting_action_items (school_id, due_date)
    WHERE status IN ('pending', 'in_progress') AND due_date IS NOT NULL;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

-- SELECT: جميع موظفي المدرسة + system_owner
DROP POLICY IF EXISTS "mai_select" ON public.meeting_action_items;
CREATE POLICY "mai_select" ON public.meeting_action_items
    FOR SELECT
    USING (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- INSERT: منظِّمو الاجتماعات
DROP POLICY IF EXISTS "mai_insert" ON public.meeting_action_items;
CREATE POLICY "mai_insert" ON public.meeting_action_items
    FOR INSERT
    WITH CHECK (
        school_id = get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal', 'school_admin', 'school_secretary', 'quality_coordinator'
        )
    );

-- UPDATE: المُكلَّف نفسه (لتحديث حالة المهمة) + المنظِّمون
DROP POLICY IF EXISTS "mai_update" ON public.meeting_action_items;
CREATE POLICY "mai_update" ON public.meeting_action_items
    FOR UPDATE
    USING (
        school_id = get_my_school_id()
        AND (
            assigned_to_persona_id IN (
                SELECT up.id FROM public.user_personas up
                WHERE  up.user_id   = auth.uid()
                  AND  up.school_id = get_my_school_id()
            )
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_principal', 'school_admin', 'school_secretary'
            )
        )
    );

-- لا DELETE policy

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE  table_schema = 'public' AND table_name = 'meeting_action_items'
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: جدول meeting_action_items لم يُنشأ';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN   pg_namespace n ON n.oid = c.relnamespace
        WHERE  n.nspname = 'public' AND c.relname = 'meeting_action_items'
          AND  c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'التحقق فشل: RLS غير مُفعّل على meeting_action_items';
    END IF;

    RAISE NOTICE '✓ meeting_action_items أُنشئ بنجاح';
    RAISE NOTICE '✓ RLS مُفعّل';
    RAISE NOTICE '✓ Migration 53 اكتمل بنجاح';
    RAISE NOTICE '✓ المرحلة 4 (Meeting Module) — Migrations 51-53 مكتملة';
END $$;

COMMIT;
