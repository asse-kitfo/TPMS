-- Sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'ANALYSIS',
  loss_count INTEGER NOT NULL DEFAULT 0,
  rule_breaks INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Checks table
CREATE TABLE checks (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  pair TEXT NOT NULL,
  setup_grade TEXT NOT NULL,
  psych_state TEXT NOT NULL,
  focus_level INTEGER NOT NULL,
  urge_level INTEGER NOT NULL,
  decision_clarity INTEGER NOT NULL,
  patience INTEGER,
  verdict TEXT NOT NULL,
  verdict_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  pair TEXT NOT NULL,
  setup_grade TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price REAL,
  stop_loss REAL,
  take_profit REAL,
  outcome TEXT,
  followed_plan BOOLEAN,
  interfered BOOLEAN,
  interference_type TEXT,
  emotional_state TEXT,
  notes TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "select_sessions" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_sessions" ON sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sessions" ON sessions FOR DELETE TO authenticated USING (true);

-- Checks policies
CREATE POLICY "select_checks" ON checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_checks" ON checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_checks" ON checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_checks" ON checks FOR DELETE TO authenticated USING (true);

-- Trades policies
CREATE POLICY "select_trades" ON trades FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_trades" ON trades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_trades" ON trades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_trades" ON trades FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_checks_session_id ON checks(session_id);
CREATE INDEX idx_trades_session_id ON trades(session_id);
CREATE INDEX idx_trades_outcome ON trades(outcome);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);