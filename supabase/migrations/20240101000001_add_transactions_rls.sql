-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions for their investments" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Create policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT user_id
            FROM investments 
            WHERE investments.id = transactions.investment_id
        )
        OR (
            SELECT user_id
            FROM investments 
            WHERE investments.id = transactions.investment_id
        ) IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    );

CREATE POLICY "Users can create transactions for their investments"
    ON transactions FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT user_id
            FROM investments 
            WHERE investments.id = investment_id
        )
        OR (
            SELECT user_id
            FROM investments 
            WHERE investments.id = investment_id
        ) IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    );

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (
        auth.uid()::text IN (
            SELECT user_id
            FROM investments 
            WHERE investments.id = transactions.investment_id
        )
        OR (
            SELECT user_id
            FROM investments 
            WHERE investments.id = transactions.investment_id
        ) IN (
            SELECT guest_id::text 
            FROM guest_sessions 
            WHERE expires_at > NOW()
        )
    ); 