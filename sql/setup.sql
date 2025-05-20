-- Drop existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS guest_sessions;

-- Create guest_sessions table
CREATE TABLE guest_sessions (
    guest_id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Default Portfolio',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create investments table
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    symbol TEXT NOT NULL,
    shares NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI analysis table
CREATE TABLE investment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_portfolio_id ON investments(portfolio_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_guest_sessions_expires_at ON guest_sessions(expires_at);
CREATE INDEX idx_investment_analysis_investment_id ON investment_analysis(investment_id);

-- Enable Row Level Security
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_analysis ENABLE ROW LEVEL SECURITY;

-- Guest Sessions Policies
CREATE POLICY "Anyone can create guest sessions"
ON guest_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- Portfolio Policies
CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can create portfolios"
ON portfolios FOR INSERT
WITH CHECK (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can update their own portfolios"
ON portfolios FOR UPDATE
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can delete their own portfolios"
ON portfolios FOR DELETE
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

-- Investment Policies
CREATE POLICY "Users can view their own investments"
ON investments FOR SELECT
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can create investments"
ON investments FOR INSERT
WITH CHECK (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can update their own investments"
ON investments FOR UPDATE
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

CREATE POLICY "Users can delete their own investments"
ON investments FOR DELETE
USING (
    user_id = auth.uid()::text 
    OR user_id IN (
        SELECT guest_id::text 
        FROM guest_sessions 
        WHERE expires_at > NOW()
    )
);

-- Analysis Policies
CREATE POLICY "Users can view their own investment analysis"
ON investment_analysis FOR SELECT
USING (
    investment_id IN (
        SELECT id FROM investments 
        WHERE user_id = auth.uid()::text 
        OR user_id IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    )
);

CREATE POLICY "Users can create investment analysis"
ON investment_analysis FOR INSERT
WITH CHECK (
    investment_id IN (
        SELECT id FROM investments 
        WHERE user_id = auth.uid()::text 
        OR user_id IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    )
);

CREATE POLICY "Users can update their own investment analysis"
ON investment_analysis FOR UPDATE
USING (
    investment_id IN (
        SELECT id FROM investments 
        WHERE user_id = auth.uid()::text 
        OR user_id IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    )
);

CREATE POLICY "Users can delete their own investment analysis"
ON investment_analysis FOR DELETE
USING (
    investment_id IN (
        SELECT id FROM investments 
        WHERE user_id = auth.uid()::text 
        OR user_id IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    )
); 