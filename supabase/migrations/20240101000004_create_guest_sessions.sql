-- First drop all dependent policies
DROP POLICY IF EXISTS "Users can view their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can create portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

DROP POLICY IF EXISTS "Users can view their own investments" ON investments;
DROP POLICY IF EXISTS "Users can create investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investments;

DROP POLICY IF EXISTS "Users can view their own investment analysis" ON investment_analysis;
DROP POLICY IF EXISTS "Users can create investment analysis" ON investment_analysis;
DROP POLICY IF EXISTS "Users can update their own investment analysis" ON investment_analysis;
DROP POLICY IF EXISTS "Users can delete their own investment analysis" ON investment_analysis;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions for their investments" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Now we can safely drop and recreate guest_sessions
DROP INDEX IF EXISTS idx_guest_sessions_expires_at;
DROP TRIGGER IF EXISTS update_guest_sessions_updated_at ON guest_sessions;
DROP TABLE IF EXISTS guest_sessions;

-- Create guest_sessions table first
CREATE TABLE guest_sessions (
    guest_id UUID PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_guest_sessions_updated_at
    BEFORE UPDATE ON guest_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Create index for efficient cleanup
CREATE INDEX idx_guest_sessions_expires_at ON guest_sessions(expires_at);

-- Create policy for guest sessions
DROP POLICY IF EXISTS "Anyone can manage guest sessions" ON guest_sessions;
CREATE POLICY "Anyone can manage guest sessions" ON guest_sessions FOR ALL USING (true);

-- Recreate all the dependent policies
CREATE POLICY "Users can view their own portfolios" ON portfolios FOR SELECT
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can create portfolios" ON portfolios FOR INSERT
WITH CHECK (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can update their own portfolios" ON portfolios FOR UPDATE
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can delete their own portfolios" ON portfolios FOR DELETE
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can view their own investments" ON investments FOR SELECT
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can create investments" ON investments FOR INSERT
WITH CHECK (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can update their own investments" ON investments FOR UPDATE
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can delete their own investments" ON investments FOR DELETE
USING (user_id = auth.uid()::text OR user_id IN (
    SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
));

CREATE POLICY "Users can view their own investment analysis" ON investment_analysis FOR SELECT
USING (investment_id IN (
    SELECT id FROM investments WHERE user_id = auth.uid()::text 
    OR user_id IN (SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW())
));

CREATE POLICY "Users can create investment analysis" ON investment_analysis FOR INSERT
WITH CHECK (investment_id IN (
    SELECT id FROM investments WHERE user_id = auth.uid()::text 
    OR user_id IN (SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW())
));

CREATE POLICY "Users can update their own investment analysis" ON investment_analysis FOR UPDATE
USING (investment_id IN (
    SELECT id FROM investments WHERE user_id = auth.uid()::text 
    OR user_id IN (SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW())
));

CREATE POLICY "Users can delete their own investment analysis" ON investment_analysis FOR DELETE
USING (investment_id IN (
    SELECT id FROM investments WHERE user_id = auth.uid()::text 
    OR user_id IN (SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW())
));

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT
USING (
    auth.uid()::text IN (
        SELECT user_id FROM investments WHERE investments.id = transactions.investment_id
    )
    OR (
        SELECT user_id FROM investments WHERE investments.id = transactions.investment_id
    ) IN (
        SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can create transactions for their investments" ON transactions FOR INSERT
WITH CHECK (
    auth.uid()::text IN (
        SELECT user_id FROM investments WHERE investments.id = investment_id
    )
    OR (
        SELECT user_id FROM investments WHERE investments.id = investment_id
    ) IN (
        SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE
USING (
    auth.uid()::text IN (
        SELECT user_id FROM investments WHERE investments.id = transactions.investment_id
    )
    OR (
        SELECT user_id FROM investments WHERE investments.id = transactions.investment_id
    ) IN (
        SELECT guest_id::text FROM guest_sessions WHERE expires_at > NOW()
    )
);