-- =================================================================
-- Migration M75: Gamification Metaverse V4 — Multi-tenant Rebuild
-- التاريخ: 2026-06-02
-- الهدف: إنشاء 19 جدول gamification مع school_id NOT NULL + RLS كامل
--        + تحديث RPC functions لتشمل السياق المدرسي
--
-- يُحل محل: 20260120_gamification_schema.sql + _rls.sql + _rpc_functions.sql
--   (تلك الملفات كانت pre-multi-tenant — بدون school_id — ولم تُطبَّق قط على Supabase)
--
-- ملاحظة RLS: student_profiles لا يملك profile_id (لا ربط مباشر بـ auth.users).
--   لذلك: الوصول الآن للطاقم فقط. عند إضافة student_profiles.profile_id في migration
--   مستقل، يمكن توسيع السياسات ليشمل الطالب نفسه.
--
-- التبعيات:
--   ✅ schools  ✅ student_profiles  ✅ classes
--   ✅ get_my_school_id()  ✅ update_modified_column()
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_profiles غير موجود';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_modified_column'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: update_modified_column() غير موجود';
    END IF;
    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- A) ECONOMY + LEDGER
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.student_wallet (
    student_id   uuid        PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    school_id    uuid        NOT NULL REFERENCES public.schools(id),
    xp           bigint      NOT NULL DEFAULT 0 CHECK (xp >= 0),
    coins        bigint      NOT NULL DEFAULT 0 CHECK (coins >= 0),
    frozen_coins bigint      NOT NULL DEFAULT 0 CHECK (frozen_coins >= 0),
    last_updated timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.student_wallet IS 'Gamification: محفظة XP + عملات الطالب';

CREATE TABLE IF NOT EXISTS public.transaction_logs (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           uuid        NOT NULL REFERENCES public.schools(id),
    student_id          uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    delta_coins         bigint      NOT NULL,
    delta_xp            bigint      NOT NULL,
    type                text        NOT NULL
                        CHECK (type IN ('quest_reward','purchase','ar_drop','penalty','manual_adjustment')),
    source_type         text
                        CHECK (source_type IN ('ar_glyph','quest','marketplace','admin','manual')),
    source_event_id     uuid,
    current_total_coins bigint,
    current_total_xp    bigint,
    hash                text,
    prev_hash           text,
    created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transaction_logs IS 'Gamification: سجل المعاملات append-only للـ anti-cheat ledger';

CREATE TABLE IF NOT EXISTS public.sentinel_flags (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  uuid        NOT NULL REFERENCES public.schools(id),
    student_id uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    severity   text        NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    reason     text,
    metadata   jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sentinel_flags IS 'Gamification: تنبيهات Sentinel للكشف عن الغش';

-- ════════════════════════════════════════════════════════════════
-- B) SEASONS + QUESTS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.seasons (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  uuid        NOT NULL REFERENCES public.schools(id),
    title      text        NOT NULL,
    is_active  boolean     NOT NULL DEFAULT false,
    start_date timestamptz,
    end_date   timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.seasons IS 'Gamification: مواسم اللعبة لكل مدرسة';

CREATE TABLE IF NOT EXISTS public.quest_nodes (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         uuid        NOT NULL REFERENCES public.schools(id),
    path              text,
    title             text        NOT NULL,
    requirements_json jsonb,
    rewards_json      jsonb,
    is_repeatable     boolean     NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.quest_nodes IS 'Gamification: مكتبة المهام لكل مدرسة';

CREATE TABLE IF NOT EXISTS public.quest_progress (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    uuid        NOT NULL REFERENCES public.schools(id),
    student_id   uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    node_id      uuid        NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
    status       text        NOT NULL DEFAULT 'locked'
                 CHECK (status IN ('locked','available','completed')),
    completed_at timestamptz,
    UNIQUE (student_id, node_id)
);
COMMENT ON TABLE public.quest_progress IS 'Gamification: تقدم الطالب في المهام';

-- ════════════════════════════════════════════════════════════════
-- C) MARKETPLACE + INVENTORY
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketplace_items (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid        NOT NULL REFERENCES public.schools(id),
    title       text        NOT NULL,
    description text,
    cost        bigint      NOT NULL CHECK (cost >= 0),
    type        text        NOT NULL
                CHECK (type IN ('cosmetic','privilege','furniture','consumable')),
    category    text,
    image_url   text,
    metadata    jsonb,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.marketplace_items IS 'Gamification: سوق العناصر لكل مدرسة';

CREATE TABLE IF NOT EXISTS public.inventory (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    uuid        NOT NULL REFERENCES public.schools(id),
    student_id   uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    item_id      uuid        NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    status       text        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','consumed','placed')),
    qr_code_hash text,
    acquired_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.inventory IS 'Gamification: مخزون العناصر المُشتراة';

-- ════════════════════════════════════════════════════════════════
-- D) RAIDS + STREAKS + CHESTS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.raid_bosses (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid        NOT NULL REFERENCES public.schools(id),
    class_id    uuid        REFERENCES public.classes(id) ON DELETE CASCADE,
    title       text        NOT NULL,
    hp          bigint      NOT NULL CHECK (hp >= 0),
    max_hp      bigint      NOT NULL CHECK (max_hp > 0),
    reward_pool jsonb,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.raid_bosses IS 'Gamification: Raid Bosses مرتبطة بفصل دراسي';

CREATE TABLE IF NOT EXISTS public.streaks (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           uuid        NOT NULL REFERENCES public.schools(id),
    student_id          uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    type                text        NOT NULL
                        CHECK (type IN ('daily_login','homework','attendance')),
    count               int         NOT NULL DEFAULT 0,
    max_count           int         NOT NULL DEFAULT 0,
    last_incremented_at timestamptz,
    UNIQUE (student_id, type)
);
COMMENT ON TABLE public.streaks IS 'Gamification: سلاسل الإنجاز المتواصل';

CREATE TABLE IF NOT EXISTS public.loot_chests (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       uuid        NOT NULL REFERENCES public.schools(id),
    student_id      uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    rarity          text        NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
    status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','opened')),
    reward_snapshot jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.loot_chests IS 'Gamification: صناديق الجوائز المُنتظرة';

-- ════════════════════════════════════════════════════════════════
-- E) CORRUPTION + PHANTOM MERCHANT + AUCTIONS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.corruption_states (
    student_id         uuid        PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    school_id          uuid        NOT NULL REFERENCES public.schools(id),
    level              int         NOT NULL DEFAULT 0,
    cured_at           timestamptz,
    last_corruption_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.corruption_states IS 'Gamification: حالة الفساد للطالب';

CREATE TABLE IF NOT EXISTS public.phantom_merchant_sessions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    uuid        NOT NULL REFERENCES public.schools(id),
    active_until timestamptz NOT NULL,
    items_json   jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.phantom_merchant_sessions IS 'Gamification: جلسات التاجر الخفي';

CREATE TABLE IF NOT EXISTS public.auctions (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid        NOT NULL REFERENCES public.schools(id),
    item_name   text        NOT NULL,
    highest_bid bigint      NOT NULL DEFAULT 0,
    bidder_id   uuid        REFERENCES public.student_profiles(id),
    ends_at     timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.auctions IS 'Gamification: مزادات العناصر النادرة';

-- ════════════════════════════════════════════════════════════════
-- F) AR GLYPHS + DORM + HALL OF LEGENDS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ar_glyphs (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        uuid        NOT NULL REFERENCES public.schools(id),
    code_hash        text        NOT NULL,
    location_hint    text,
    reward_type      text        CHECK (reward_type IN ('coin_drop','item_drop','buff')),
    reward_value     jsonb,
    active_hours     jsonb,
    cooldown_minutes int         NOT NULL DEFAULT 60,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (school_id, code_hash)
);
COMMENT ON TABLE public.ar_glyphs IS 'Gamification: رموز QR المخفية في البيئة المدرسية';

CREATE TABLE IF NOT EXISTS public.student_glyph_finds (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  uuid        NOT NULL REFERENCES public.schools(id),
    student_id uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    glyph_id   uuid        NOT NULL REFERENCES public.ar_glyphs(id) ON DELETE CASCADE,
    found_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.student_glyph_finds IS 'Gamification: سجل اكتشافات الطلاب';

CREATE TABLE IF NOT EXISTS public.student_dorms (
    student_id  uuid        PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    school_id   uuid        NOT NULL REFERENCES public.schools(id),
    layout_json jsonb       NOT NULL DEFAULT '{}',
    likes_count int         NOT NULL DEFAULT 0,
    is_public   boolean     NOT NULL DEFAULT true,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.student_dorms IS 'Gamification: غرفة الطالب الرقمية';

CREATE TABLE IF NOT EXISTS public.dorm_furniture (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  uuid        NOT NULL REFERENCES public.schools(id),
    student_id uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    item_id    uuid        NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    position_x int,
    position_y int,
    rotation   int,
    is_placed  boolean     NOT NULL DEFAULT false,
    placed_at  timestamptz
);
COMMENT ON TABLE public.dorm_furniture IS 'Gamification: أثاث غرفة الطالب';

CREATE TABLE IF NOT EXISTS public.hall_of_legends (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            uuid        NOT NULL REFERENCES public.schools(id),
    season_id            uuid        REFERENCES public.seasons(id) ON DELETE SET NULL,
    student_id           uuid        REFERENCES public.student_profiles(id) ON DELETE SET NULL,
    achievement_title    text,
    statue_skin_snapshot jsonb,
    message_to_future    text,
    inducted_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.hall_of_legends IS 'Gamification: قاعة الأبطال — أعظم إنجازات كل موسم';

-- ────────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sw_school              ON public.student_wallet          (school_id);
CREATE INDEX IF NOT EXISTS idx_tl_school_student      ON public.transaction_logs        (school_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sf_school_severity     ON public.sentinel_flags          (school_id, severity);
CREATE INDEX IF NOT EXISTS idx_seasons_school_active  ON public.seasons                 (school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_qn_school              ON public.quest_nodes             (school_id);
CREATE INDEX IF NOT EXISTS idx_qp_school_student      ON public.quest_progress          (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_mi_school_active       ON public.marketplace_items       (school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inv_school_student     ON public.inventory               (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_rb_school_active       ON public.raid_bosses             (school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_streaks_school_student ON public.streaks                 (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lc_school_status       ON public.loot_chests             (school_id, status);
CREATE INDEX IF NOT EXISTS idx_ag_school              ON public.ar_glyphs               (school_id);
CREATE INDEX IF NOT EXISTS idx_sgf_school_student     ON public.student_glyph_finds     (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_auctions_school_ends   ON public.auctions                (school_id, ends_at);
CREATE INDEX IF NOT EXISTS idx_pms_school_active      ON public.phantom_merchant_sessions (school_id, active_until);

-- ────────────────────────────────────────────────────────────────
-- Triggers
-- ────────────────────────────────────────────────────────────────

CREATE TRIGGER update_wallet_modtime
    BEFORE UPDATE ON public.student_wallet
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_dorm_modtime
    BEFORE UPDATE ON public.student_dorms
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- نمط موحّد: system_owner يرى الكل، الطاقم المدرسي يرى مدرسته
-- (الوصول الطلابي المباشر يُضاف لاحقاً عند ربط student_profiles.profile_id)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.student_wallet            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_flags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_nodes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_bosses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loot_chests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corruption_states         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phantom_merchant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_glyphs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_glyph_finds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dorms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dorm_furniture            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_legends           ENABLE ROW LEVEL SECURITY;

-- student_wallet
DROP POLICY IF EXISTS "sw_select" ON public.student_wallet;
CREATE POLICY "sw_select" ON public.student_wallet FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','student_affairs_vp','student_counselor','activity_leader'
        ))
);
DROP POLICY IF EXISTS "sw_manage" ON public.student_wallet;
CREATE POLICY "sw_manage" ON public.student_wallet FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin','activity_leader'))
);

-- transaction_logs
DROP POLICY IF EXISTS "tl_select" ON public.transaction_logs;
CREATE POLICY "tl_select" ON public.transaction_logs FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','student_affairs_vp','activity_leader'
        ))
);
DROP POLICY IF EXISTS "tl_insert" ON public.transaction_logs;
CREATE POLICY "tl_insert" ON public.transaction_logs FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);

-- sentinel_flags
DROP POLICY IF EXISTS "sf_select" ON public.sentinel_flags;
CREATE POLICY "sf_select" ON public.sentinel_flags FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','student_affairs_vp','student_counselor'
        ))
);
DROP POLICY IF EXISTS "sf_manage" ON public.sentinel_flags;
CREATE POLICY "sf_manage" ON public.sentinel_flags FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin'))
);

-- seasons
DROP POLICY IF EXISTS "seasons_select" ON public.seasons;
CREATE POLICY "seasons_select" ON public.seasons FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "seasons_manage" ON public.seasons;
CREATE POLICY "seasons_manage" ON public.seasons FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin'))
);

-- quest_nodes
DROP POLICY IF EXISTS "qn_select" ON public.quest_nodes;
CREATE POLICY "qn_select" ON public.quest_nodes FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "qn_manage" ON public.quest_nodes;
CREATE POLICY "qn_manage" ON public.quest_nodes FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- quest_progress
DROP POLICY IF EXISTS "qp_select" ON public.quest_progress;
CREATE POLICY "qp_select" ON public.quest_progress FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);
DROP POLICY IF EXISTS "qp_manage" ON public.quest_progress;
CREATE POLICY "qp_manage" ON public.quest_progress FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);

-- marketplace_items
DROP POLICY IF EXISTS "mi_select" ON public.marketplace_items;
CREATE POLICY "mi_select" ON public.marketplace_items FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "mi_manage" ON public.marketplace_items;
CREATE POLICY "mi_manage" ON public.marketplace_items FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin'))
);

-- inventory
DROP POLICY IF EXISTS "inv_select" ON public.inventory;
CREATE POLICY "inv_select" ON public.inventory FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);
DROP POLICY IF EXISTS "inv_manage" ON public.inventory;
CREATE POLICY "inv_manage" ON public.inventory FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- raid_bosses
DROP POLICY IF EXISTS "rb_select" ON public.raid_bosses;
CREATE POLICY "rb_select" ON public.raid_bosses FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "rb_manage" ON public.raid_bosses;
CREATE POLICY "rb_manage" ON public.raid_bosses FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);

-- streaks
DROP POLICY IF EXISTS "streaks_select" ON public.streaks;
CREATE POLICY "streaks_select" ON public.streaks FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher'
        ))
);
DROP POLICY IF EXISTS "streaks_manage" ON public.streaks;
CREATE POLICY "streaks_manage" ON public.streaks FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher'
        ))
);

-- loot_chests
DROP POLICY IF EXISTS "lc_select" ON public.loot_chests;
CREATE POLICY "lc_select" ON public.loot_chests FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);
DROP POLICY IF EXISTS "lc_manage" ON public.loot_chests;
CREATE POLICY "lc_manage" ON public.loot_chests FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- corruption_states
DROP POLICY IF EXISTS "cs_select" ON public.corruption_states;
CREATE POLICY "cs_select" ON public.corruption_states FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','student_affairs_vp','student_counselor'
        ))
);
DROP POLICY IF EXISTS "cs_manage" ON public.corruption_states;
CREATE POLICY "cs_manage" ON public.corruption_states FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin'))
);

-- phantom_merchant_sessions
DROP POLICY IF EXISTS "pms_select" ON public.phantom_merchant_sessions;
CREATE POLICY "pms_select" ON public.phantom_merchant_sessions FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "pms_manage" ON public.phantom_merchant_sessions;
CREATE POLICY "pms_manage" ON public.phantom_merchant_sessions FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin'))
);

-- auctions
DROP POLICY IF EXISTS "auctions_select" ON public.auctions;
CREATE POLICY "auctions_select" ON public.auctions FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "auctions_manage" ON public.auctions;
CREATE POLICY "auctions_manage" ON public.auctions FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- ar_glyphs
DROP POLICY IF EXISTS "ag_select" ON public.ar_glyphs;
CREATE POLICY "ag_select" ON public.ar_glyphs FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "ag_manage" ON public.ar_glyphs;
CREATE POLICY "ag_manage" ON public.ar_glyphs FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- student_glyph_finds
DROP POLICY IF EXISTS "sgf_select" ON public.student_glyph_finds;
CREATE POLICY "sgf_select" ON public.student_glyph_finds FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);
DROP POLICY IF EXISTS "sgf_insert" ON public.student_glyph_finds;
CREATE POLICY "sgf_insert" ON public.student_glyph_finds FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','teacher','activity_leader'
        ))
);

-- student_dorms
DROP POLICY IF EXISTS "sd_select" ON public.student_dorms;
CREATE POLICY "sd_select" ON public.student_dorms FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (
            is_public = true
            OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin')
        ))
);
DROP POLICY IF EXISTS "sd_manage" ON public.student_dorms;
CREATE POLICY "sd_manage" ON public.student_dorms FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_principal','school_admin','activity_leader'))
);

-- dorm_furniture
DROP POLICY IF EXISTS "df_select" ON public.dorm_furniture;
CREATE POLICY "df_select" ON public.dorm_furniture FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);
DROP POLICY IF EXISTS "df_manage" ON public.dorm_furniture;
CREATE POLICY "df_manage" ON public.dorm_furniture FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- hall_of_legends
DROP POLICY IF EXISTS "hol_select" ON public.hall_of_legends;
CREATE POLICY "hol_select" ON public.hall_of_legends FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);
DROP POLICY IF EXISTS "hol_manage" ON public.hall_of_legends;
CREATE POLICY "hol_manage" ON public.hall_of_legends FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_principal','school_admin','activity_leader'
        ))
);

-- ════════════════════════════════════════════════════════════════
-- Updated RPC Functions (multi-tenant + SECURITY DEFINER + SET search_path)
-- ════════════════════════════════════════════════════════════════

-- rpc_scan_ar_glyph: يمسح رمز QR ويُعطي المكافأة
-- استدعاء: من طرف الطاقم فقط (activity_leader يُعطي الطالب)
CREATE OR REPLACE FUNCTION public.rpc_scan_ar_glyph(p_glyph_hash text, p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id uuid := public.get_my_school_id();
    v_glyph     RECORD;
    v_last_find timestamptz;
    v_now       timestamptz := now();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.student_profiles WHERE id = p_student_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Student not found in this school';
    END IF;

    SELECT * INTO v_glyph FROM public.ar_glyphs WHERE code_hash = p_glyph_hash AND school_id = v_school_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Glyph not found'; END IF;

    IF v_glyph.active_hours IS NOT NULL THEN
        IF v_now::time < (v_glyph.active_hours->>'start')::time
        OR v_now::time > (v_glyph.active_hours->>'end')::time THEN
            RAISE EXCEPTION 'Glyph is not active at this time'; END IF;
    END IF;

    SELECT found_at INTO v_last_find
    FROM public.student_glyph_finds
    WHERE student_id = p_student_id AND glyph_id = v_glyph.id
    ORDER BY found_at DESC LIMIT 1;

    IF FOUND AND v_now < v_last_find + (v_glyph.cooldown_minutes || ' minutes')::interval THEN
        RAISE EXCEPTION 'Glyph is on cooldown'; END IF;

    IF v_glyph.reward_type = 'coin_drop' THEN
        INSERT INTO public.student_wallet (student_id, school_id, coins)
        VALUES (p_student_id, v_school_id, (v_glyph.reward_value->>'amount')::bigint)
        ON CONFLICT (student_id) DO UPDATE
            SET coins = public.student_wallet.coins + (v_glyph.reward_value->>'amount')::bigint;

        INSERT INTO public.transaction_logs
            (school_id, student_id, delta_coins, delta_xp, type, source_type, source_event_id)
        VALUES (v_school_id, p_student_id, (v_glyph.reward_value->>'amount')::bigint, 0,
                'ar_drop', 'ar_glyph', v_glyph.id);
    END IF;

    INSERT INTO public.student_glyph_finds (school_id, student_id, glyph_id)
    VALUES (v_school_id, p_student_id, v_glyph.id);

    RETURN jsonb_build_object('success', true, 'reward_type', v_glyph.reward_type, 'reward_value', v_glyph.reward_value);
END;
$$;

-- rpc_purchase_furniture: يشتري عنصر أثاث من السوق
CREATE OR REPLACE FUNCTION public.rpc_purchase_furniture(p_item_id uuid, p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id uuid := public.get_my_school_id();
    v_item      RECORD;
    v_coins     bigint;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.student_profiles WHERE id = p_student_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Student not found in this school';
    END IF;

    SELECT * INTO v_item FROM public.marketplace_items
    WHERE id = p_item_id AND school_id = v_school_id AND type = 'furniture' AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Furniture item not found or inactive'; END IF;

    SELECT coins INTO v_coins FROM public.student_wallet WHERE student_id = p_student_id;
    IF v_coins IS NULL OR v_coins < v_item.cost THEN RAISE EXCEPTION 'Insufficient coins'; END IF;

    UPDATE public.student_wallet SET coins = coins - v_item.cost WHERE student_id = p_student_id;
    INSERT INTO public.inventory (school_id, student_id, item_id, status)
        VALUES (v_school_id, p_student_id, v_item.id, 'active');
    INSERT INTO public.dorm_furniture (school_id, student_id, item_id)
        VALUES (v_school_id, p_student_id, v_item.id);
    INSERT INTO public.transaction_logs
        (school_id, student_id, delta_coins, delta_xp, type, source_type, source_event_id)
    VALUES (v_school_id, p_student_id, -v_item.cost, 0, 'purchase', 'marketplace', v_item.id);

    RETURN jsonb_build_object('success', true, 'item_title', v_item.title);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_scan_ar_glyph(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_purchase_furniture(uuid, uuid) FROM anon;

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_tables int;
    v_rls    int;
BEGIN
    SELECT COUNT(*) INTO v_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'student_wallet','transaction_logs','sentinel_flags',
        'seasons','quest_nodes','quest_progress',
        'marketplace_items','inventory',
        'raid_bosses','streaks','loot_chests',
        'corruption_states','phantom_merchant_sessions','auctions',
        'ar_glyphs','student_glyph_finds',
        'student_dorms','dorm_furniture','hall_of_legends'
      );

    SELECT COUNT(*) INTO v_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relrowsecurity = true
      AND c.relname IN (
        'student_wallet','transaction_logs','sentinel_flags',
        'seasons','quest_nodes','quest_progress',
        'marketplace_items','inventory',
        'raid_bosses','streaks','loot_chests',
        'corruption_states','phantom_merchant_sessions','auctions',
        'ar_glyphs','student_glyph_finds',
        'student_dorms','dorm_furniture','hall_of_legends'
      );

    IF v_tables < 19 THEN
        RAISE EXCEPTION 'التحقق فشل: % من 19 جدول فقط أُنشئت', v_tables;
    END IF;
    IF v_rls < 19 THEN
        RAISE EXCEPTION 'التحقق فشل: RLS مفعَّل على % من 19 فقط', v_rls;
    END IF;

    RAISE NOTICE '✅ M75 Gamification Multitenant اكتمل:';
    RAISE NOTICE '   ✓ % جدول مع school_id NOT NULL', v_tables;
    RAISE NOTICE '   ✓ % جدول مع RLS مفعَّل', v_rls;
    RAISE NOTICE '   ✓ rpc_scan_ar_glyph + rpc_purchase_furniture مُحدَّثتان (p_student_id explicit)';
    RAISE NOTICE '   ✓ REVOKE EXECUTE FROM anon';
END $$;

COMMIT;
