-- ============================================
-- Agora Leaderboard - Database Schema
-- Run this in the Supabase SQL editor
-- ============================================

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  admin_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics (per challenge, configurable)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  points_per_unit NUMERIC NOT NULL DEFAULT 1,
  daily_max NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '💪',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, name)
);

-- Daily logs
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, metric_id, log_date)
);

-- ============================================
-- Row Level Security (open policies for now —
-- authorization handled at the app layer)
-- ============================================

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "public_insert_challenges" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_challenges" ON challenges FOR UPDATE USING (true);

CREATE POLICY "public_read_metrics" ON metrics FOR SELECT USING (true);
CREATE POLICY "public_insert_metrics" ON metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_metrics" ON metrics FOR UPDATE USING (true);
CREATE POLICY "public_delete_metrics" ON metrics FOR DELETE USING (true);

CREATE POLICY "public_read_participants" ON participants FOR SELECT USING (true);
CREATE POLICY "public_insert_participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_participants" ON participants FOR DELETE USING (true);

CREATE POLICY "public_read_logs" ON logs FOR SELECT USING (true);
CREATE POLICY "public_upsert_logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_logs" ON logs FOR UPDATE USING (true);
CREATE POLICY "public_delete_logs" ON logs FOR DELETE USING (true);

-- ============================================
-- Realtime
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;
