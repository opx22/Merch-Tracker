-- ==============================================================================
-- Merch Tracker — Supabase PostgreSQL Schema Setup
-- ==============================================================================
-- Description: Complete relational database schema for storing concert merchandise
-- group orders (GOs), event catalogs, multi-currency pricing, and line items.
-- ==============================================================================

-- ==============================================================================
-- Non-Destructive Migration Queries (Run in Supabase SQL Editor for Existing DBs)
-- ==============================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billed_amount_sgd NUMERIC(14, 2) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'go';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_description TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS era TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS member TEXT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS era TEXT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS member TEXT NULL;
-- Drop existing constraints that might block new statuses or order types
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Helper Function: Auto-update updated_at timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. Table: events
-- ==============================================================================
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1.000000,
    benefit_threshold NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE events IS 'Concert tours, pop-ups, and fan meeting events being tracked.';
COMMENT ON COLUMN events.exchange_rate IS 'Exchange rate to base currency (e.g., 1 KRW = 0.00098 SGD).';
COMMENT ON COLUMN events.benefit_threshold IS 'Amount required in event currency to earn 1 store benefit (e.g. photocard).';

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 3. Table: catalog_items
-- ==============================================================================
CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    comes_with_pc BOOLEAN NOT NULL DEFAULT FALSE,
    counts_towards_benefit BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE catalog_items IS 'Official merchandise catalog items per event.';
COMMENT ON COLUMN catalog_items.comes_with_pc IS 'Flag indicating if the item itself includes an inclusion photocard.';
COMMENT ON COLUMN catalog_items.counts_towards_benefit IS 'Flag indicating if purchase amount counts towards store benefit thresholds.';

CREATE INDEX IF NOT EXISTS idx_catalog_items_event_id ON catalog_items(event_id);

-- ==============================================================================
-- 4. Table: orders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    event_id TEXT NULL REFERENCES events(id) ON DELETE SET NULL,
    person_name TEXT NOT NULL,
    buyer TEXT NOT NULL,
    seller TEXT NOT NULL,
    is_my_order BOOLEAN NOT NULL DEFAULT FALSE,
    order_type TEXT NOT NULL,
    status TEXT NOT NULL,
    order_date DATE NULL,
    payment_date DATE NULL,
    collection_date DATE NULL,
    comment TEXT NULL,
    billed_amount_sgd NUMERIC(14, 2) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Individual group order participant records or host hauls.';
COMMENT ON COLUMN orders.event_id IS 'Optional event reference. Can be NULL for standalone hauls or general store purchases.';
COMMENT ON COLUMN orders.order_type IS 'Role type: host (your haul), placing (proxy/GO you joined), taking (buyer who joined your GO).';

CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_person_name ON orders(person_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Table: order_items
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    catalog_item_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    size_variant TEXT NULL,
    type TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Normalized line items mapping catalog merchandise to orders.';

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_catalog_item_id ON order_items(catalog_item_id);

-- ==============================================================================
-- 6. Helper SQL Views (For Analytics & Aggregations)
-- ==============================================================================

-- View A: Event Item Totals (Aggregates quantities & revenue per catalog item)
CREATE OR REPLACE VIEW v_event_item_totals AS
SELECT 
    o.event_id,
    ci.id AS catalog_item_id,
    ci.name AS item_name,
    ci.price,
    ci.comes_with_pc,
    ci.counts_towards_benefit,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.quantity * ci.price) AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN catalog_items ci ON ci.id = oi.catalog_item_id
WHERE o.status != 'cancelled' AND oi.quantity > 0
GROUP BY o.event_id, ci.id, ci.name, ci.price, ci.comes_with_pc, ci.counts_towards_benefit, ci.display_order
ORDER BY ci.display_order ASC;

COMMENT ON VIEW v_event_item_totals IS 'Aggregates line items across all orders in an event to calculate required purchasing counts.';

-- View B: Order Item Details (Joins order items into flat relational rows for reporting)
CREATE OR REPLACE VIEW v_order_item_details AS
SELECT 
    oi.id AS order_item_id,
    o.id AS order_id,
    o.event_id,
    o.person_name,
    o.buyer,
    o.seller,
    o.status,
    ci.id AS catalog_item_id,
    ci.name AS item_name,
    ci.price,
    oi.quantity,
    (oi.quantity * ci.price) AS line_total
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN catalog_items ci ON ci.id = oi.catalog_item_id
WHERE oi.quantity > 0;

COMMENT ON VIEW v_order_item_details IS 'Joins normalized order line items into comprehensive relational details.';

-- ==============================================================================
-- 7. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Note: For initial development and seamless migration, we allow public read/write access.
-- When deploying to production with Supabase Auth, replace these with auth.uid() policies.

DROP POLICY IF EXISTS "Allow public read access on events" ON events;
CREATE POLICY "Allow public read access on events"
    ON events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write access on events" ON events;
CREATE POLICY "Allow public write access on events"
    ON events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on catalog_items" ON catalog_items;
CREATE POLICY "Allow public read access on catalog_items"
    ON catalog_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write access on catalog_items" ON catalog_items;
CREATE POLICY "Allow public write access on catalog_items"
    ON catalog_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on orders" ON orders;
CREATE POLICY "Allow public read access on orders"
    ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write access on orders" ON orders;
CREATE POLICY "Allow public write access on orders"
    ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on order_items" ON order_items;
CREATE POLICY "Allow public read access on order_items"
    ON order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write access on order_items" ON order_items;
CREATE POLICY "Allow public write access on order_items"
    ON order_items FOR ALL USING (true) WITH CHECK (true);
