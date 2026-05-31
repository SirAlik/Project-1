-- =============================================
-- STUDENT GAMIFICATION METAVERSE (V4) - SCHEMA
-- =============================================

-- A) ECONOMY + LEDGER (SENTINEL ANTI-CHEAT)
CREATE TABLE student_wallet (
  student_id uuid PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  xp bigint DEFAULT 0,
  coins bigint DEFAULT 0,
  frozen_coins bigint DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

CREATE TABLE transaction_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  delta_coins bigint NOT NULL,
  delta_xp bigint NOT NULL,
  type text NOT NULL, -- 'quest_reward', 'purchase', 'ar_drop', 'penalty', 'manual_adjustment'
  source_type text,   -- 'ar_glyph', 'quest', 'marketplace', 'admin'
  source_event_id uuid,
  current_total_coins bigint,
  current_total_xp bigint,
  hash text,          -- For anti-cheat
  prev_hash text,     -- Ledger security
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sentinel_flags (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- B) SEASONS + QUESTS
CREATE TABLE seasons (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  is_active boolean DEFAULT false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE quest_nodes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  path text,              -- Path in the UI (e.g. 'academic.math.lvl1')
  title text NOT NULL,
  requirements_json jsonb, -- { "min_level": 5, "required_nodes": [...] }
  rewards_json jsonb,      -- { "xp": 100, "coins": 50, "items": [...] }
  is_repeatable boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE quest_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  node_id uuid REFERENCES quest_nodes(id) ON DELETE CASCADE,
  status text DEFAULT 'locked', -- 'locked', 'available', 'completed'
  completed_at timestamptz,
  UNIQUE(student_id, node_id)
);

-- C) MARKETPLACE + INVENTORY
CREATE TABLE marketplace_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text,
  cost bigint NOT NULL,
  type text NOT NULL, -- 'cosmetic', 'privilege', 'furniture', 'consumable'
  category text,      -- For UI grouping
  image_url text,
  metadata jsonb,     -- Store specific item properties
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE inventory (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  item_id uuid REFERENCES marketplace_items(id) ON DELETE CASCADE,
  status text DEFAULT 'active', -- 'active', 'consumed', 'placed' (for furniture)
  qr_code_hash text,             -- For phygital redemption
  acquired_at timestamptz DEFAULT now()
);

-- D) RAIDS + STREAKS + CHESTS
CREATE TABLE raid_bosses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  hp bigint NOT NULL,
  max_hp bigint NOT NULL,
  reward_pool jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE streaks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'daily_login', 'homework', 'attendance'
  count int DEFAULT 0,
  max_count int DEFAULT 0,
  last_incremented_at timestamptz,
  UNIQUE(student_id, type)
);

CREATE TABLE loot_chests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  rarity text NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
  status text DEFAULT 'pending', -- 'pending', 'opened'
  reward_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

-- E) THE EVIL TRINITY TABLES
CREATE TABLE corruption_states (
  student_id uuid PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  level int DEFAULT 0,
  cured_at timestamptz,
  last_corruption_at timestamptz DEFAULT now()
);

CREATE TABLE phantom_merchant_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  active_until timestamptz NOT NULL,
  items_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE auctions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name text NOT NULL,
  highest_bid bigint DEFAULT 0,
  bidder_id uuid REFERENCES student_profiles(id),
  ends_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- F) PHYGITAL & DORM (LEGENDARY)
CREATE TABLE ar_glyphs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  code_hash text UNIQUE NOT NULL, -- The QR content
  location_hint text,
  reward_type text,      -- 'coin_drop', 'item_drop', 'buff'
  reward_value jsonb,
  active_hours jsonb,    -- e.g. {"start": "09:00", "end": "10:00"}
  cooldown_minutes int DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE student_glyph_finds (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  glyph_id uuid REFERENCES ar_glyphs(id) ON DELETE CASCADE,
  found_at timestamptz DEFAULT now()
);

CREATE TABLE student_dorms (
  student_id uuid PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  layout_json jsonb DEFAULT '{}', -- Position of furniture
  likes_count int DEFAULT 0,
  is_public boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE dorm_furniture (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  item_id uuid REFERENCES marketplace_items(id) ON DELETE CASCADE,
  position_x int,
  position_y int,
  rotation int,
  is_placed boolean DEFAULT false,
  placed_at timestamptz
);

CREATE TABLE hall_of_legends (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  season_id uuid REFERENCES seasons(id) ON DELETE SET NULL,
  student_id uuid REFERENCES student_profiles(id) ON DELETE SET NULL,
  achievement_title text,    -- e.g. "The First Max Level"
  statue_skin_snapshot jsonb, -- JSON of their avatar look at that moment
  message_to_future text,
  inducted_at timestamptz DEFAULT now()
);

-- =============================================
-- G) TRIGGERS
-- =============================================

-- Auto-update wallet last_updated
CREATE TRIGGER update_wallet_modtime BEFORE UPDATE ON student_wallet FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Auto-update dorm updated_at
CREATE TRIGGER update_dorm_modtime BEFORE UPDATE ON student_dorms FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
