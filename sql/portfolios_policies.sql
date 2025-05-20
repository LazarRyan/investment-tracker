-- Enable RLS on portfolios table
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can create portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

-- Create policies
CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (user_id = auth.uid()::text OR user_id = ANY(
  SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can create portfolios"
ON portfolios FOR INSERT
WITH CHECK (user_id = auth.uid()::text OR user_id = ANY(
  SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can update their own portfolios"
ON portfolios FOR UPDATE
USING (user_id = auth.uid()::text OR user_id = ANY(
  SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can delete their own portfolios"
ON portfolios FOR DELETE
USING (user_id = auth.uid()::text OR user_id = ANY(
  SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

-- Create guest_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS guest_sessions (
    guest_id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on guest_sessions table
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for guest_sessions
CREATE POLICY "Anyone can create guest sessions"
ON guest_sessions FOR ALL
USING (true)
WITH CHECK (true); 