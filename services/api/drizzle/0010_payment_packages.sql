-- Payment Packages and Financial Analytics Schema
-- Run this SQL in your Supabase database

-- Payment Packages table
CREATE TABLE payment_packages (
    package_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price_cents INTEGER NOT NULL, -- Price in cents to avoid floating point issues
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(user_id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Payment Transactions table
CREATE TABLE payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(user_id),
    package_id INTEGER NOT NULL REFERENCES payment_packages(package_id),
    amount_cents INTEGER NOT NULL,
    credits_purchased INTEGER NOT NULL,
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'cash', etc.
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    external_transaction_id VARCHAR(255), -- Stripe payment intent ID, etc.
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- Monthly Revenue Tracking table
CREATE TABLE monthly_revenue (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    total_revenue_cents INTEGER DEFAULT 0,
    new_subscriptions_cents INTEGER DEFAULT 0,
    recurring_revenue_cents INTEGER DEFAULT 0,
    one_time_purchases_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(year, month)
);

-- User Financial Metrics table
CREATE TABLE user_financial_metrics (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(user_id),
    total_spent_cents INTEGER DEFAULT 0,
    total_credits_purchased INTEGER DEFAULT 0,
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    lifetime_value_cents INTEGER DEFAULT 0,
    average_order_value_cents INTEGER DEFAULT 0,
    purchase_frequency DECIMAL(5,2) DEFAULT 0, -- purchases per month
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(member_id)
);

-- Indexes for better performance
CREATE INDEX idx_payment_packages_active ON payment_packages(is_active);
CREATE INDEX idx_payment_transactions_member ON payment_transactions(member_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions(created_at);
CREATE INDEX idx_monthly_revenue_year_month ON monthly_revenue(year, month);
CREATE INDEX idx_user_financial_metrics_member ON user_financial_metrics(member_id);

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_packages_updated_at 
    BEFORE UPDATE ON payment_packages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_revenue_updated_at 
    BEFORE UPDATE ON monthly_revenue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_financial_metrics_updated_at 
    BEFORE UPDATE ON user_financial_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update monthly revenue when a transaction is completed
CREATE OR REPLACE FUNCTION update_monthly_revenue()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
BEGIN
    -- Only update when payment status changes to 'completed'
    IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
        current_year := EXTRACT(YEAR FROM NEW.processed_at);
        current_month := EXTRACT(MONTH FROM NEW.processed_at);
        
        -- Insert or update monthly revenue
        INSERT INTO monthly_revenue (year, month, total_revenue_cents, one_time_purchases_cents)
        VALUES (current_year, current_month, NEW.amount_cents, NEW.amount_cents)
        ON CONFLICT (year, month) 
        DO UPDATE SET 
            total_revenue_cents = monthly_revenue.total_revenue_cents + NEW.amount_cents,
            one_time_purchases_cents = monthly_revenue.one_time_purchases_cents + NEW.amount_cents,
            updated_at = now();
            
        -- Update user financial metrics
        INSERT INTO user_financial_metrics (
            member_id, 
            total_spent_cents, 
            total_credits_purchased,
            first_purchase_date,
            last_purchase_date,
            lifetime_value_cents
        )
        VALUES (
            NEW.member_id, 
            NEW.amount_cents, 
            NEW.credits_purchased,
            NEW.processed_at,
            NEW.processed_at,
            NEW.amount_cents
        )
        ON CONFLICT (member_id) 
        DO UPDATE SET 
            total_spent_cents = user_financial_metrics.total_spent_cents + NEW.amount_cents,
            total_credits_purchased = user_financial_metrics.total_credits_purchased + NEW.credits_purchased,
            last_purchase_date = NEW.processed_at,
            lifetime_value_cents = user_financial_metrics.lifetime_value_cents + NEW.amount_cents,
            updated_at = now();
            
        -- Update first purchase date if this is the first purchase
        UPDATE user_financial_metrics 
        SET first_purchase_date = NEW.processed_at
        WHERE member_id = NEW.member_id AND first_purchase_date IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_revenue_on_payment
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_monthly_revenue();
