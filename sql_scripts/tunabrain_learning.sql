-- ==============================================================================
-- TunaBrain Learning System — Feedback & Learned Patterns
-- ==============================================================================

-- 1. Add feedback rating column to chat_history
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS feedback SMALLINT DEFAULT 0 CHECK (feedback IN (-1, 0, 1));

-- 2. Add helpfulness_score for learning weighting
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS helpfulness_score INTEGER DEFAULT 0;

-- 3. Create learned_patterns table — stores high-value Q&A pairs
CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER GENERATED ALWAYS AS (upvotes - downvotes) STORED,
  category TEXT DEFAULT 'general', -- e.g. 'inventory', 'pricing', 'demand', 'supplier'
  used_count INTEGER DEFAULT 0, -- how many times injected as example
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS on learned_patterns
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;

-- 5. Policies — everyone can read learned patterns (they're system-wide)
CREATE POLICY "Anyone can read learned patterns"
  ON learned_patterns FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert learned patterns"
  ON learned_patterns FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update learned patterns"
  ON learned_patterns FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Function: Upsert a learned pattern from a high-rated interaction
CREATE OR REPLACE FUNCTION upsert_learned_pattern(
  p_question TEXT,
  p_response TEXT,
  p_vote SMALLINT
)
RETURNS void AS $$
BEGIN
  INSERT INTO learned_patterns (user_question, ai_response, upvotes, downvotes)
  VALUES (
    p_question,
    p_response,
    CASE WHEN p_vote > 0 THEN 1 ELSE 0 END,
    CASE WHEN p_vote < 0 THEN 1 ELSE 0 END
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
