-- =============================================
-- STUDENT GAMIFICATION METAVERSE (V4) - RLS POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE student_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_chests ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE phantom_merchant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_glyphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_glyph_finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_dorms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dorm_furniture ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_of_legends ENABLE ROW LEVEL SECURITY;

-- 1) ECONOMY
CREATE POLICY "Students read own wallet" ON student_wallet FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Staff read all wallets" ON student_wallet FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students read own transactions" ON transaction_logs FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Staff read all transactions" ON transaction_logs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Students read own flags" ON sentinel_flags FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Staff access flags" ON sentinel_flags FOR ALL USING (auth.role() = 'authenticated');

-- 2) QUESTS
CREATE POLICY "Public read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read quest nodes" ON quest_nodes FOR SELECT USING (true);
CREATE POLICY "Students manage own quest progress" ON quest_progress FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Staff access quest progress" ON quest_progress FOR ALL USING (auth.role() = 'authenticated');

-- 3) MARKETPLACE & INVENTORY
CREATE POLICY "Public read marketplace items" ON marketplace_items FOR SELECT USING (true);
CREATE POLICY "Students read own inventory" ON inventory FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Staff read all inventory" ON inventory FOR SELECT USING (auth.role() = 'authenticated');

-- 4) METAVERSE (DORM & LEGENDS)
CREATE POLICY "Public read public dorms" ON student_dorms FOR SELECT USING (is_public = true OR auth.uid() = student_id);
CREATE POLICY "Students manage own dorm" ON student_dorms FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Public read placed furniture" ON dorm_furniture FOR SELECT USING (true);
CREATE POLICY "Students manage own furniture" ON dorm_furniture FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Public read Hall of Legends" ON hall_of_legends FOR SELECT USING (true);

-- 5) MISC
CREATE POLICY "Public read raid bosses" ON raid_bosses FOR SELECT USING (true);
CREATE POLICY "Students read own streaks" ON streaks FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Public read active phantom merchant" ON phantom_merchant_sessions FOR SELECT USING (active_until > now());
CREATE POLICY "Public read auctions" ON auctions FOR SELECT USING (true);
CREATE POLICY "Students manage own bids" ON auctions FOR UPDATE USING (auth.uid() = bidder_id); -- Bid logic handled by RPC usually

-- 6) AR GLYPHS
CREATE POLICY "Staff manage ar glyphs" ON ar_glyphs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Students read own glyph finds" ON student_glyph_finds FOR SELECT USING (auth.uid() = student_id);
