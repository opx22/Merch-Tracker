-- ==============================================================================
-- Merch Tracker — Supabase SQL Seed Data
-- ==============================================================================
-- Description: Populates the database with initial demo events, catalog items,
-- orders, and normalized line items. Safe to run on a clean database.
-- ==============================================================================

-- 1. Insert Events
INSERT INTO events (id, name, currency_code, exchange_rate, benefit_threshold)
VALUES
  ('evt-aespa-2026', 'aespa LIVE TOUR 2026 — SYNK: HYPERLINE', 'KRW', 0.000980, 50000.00),
  ('evt-newjeans-tokyo', 'NewJeans Fan Meeting — Bunnies Camp', 'JPY', 0.008800, 6000.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  exchange_rate = EXCLUDED.exchange_rate,
  benefit_threshold = EXCLUDED.benefit_threshold,
  updated_at = NOW();

-- 2. Insert Catalog Items
INSERT INTO catalog_items (id, event_id, name, price, comes_with_pc, display_order)
VALUES
  -- aespa Catalog
  ('cat-1', 'evt-aespa-2026', 'Official Light Stick Ver.2', 55000.00, true, 1),
  ('cat-2', 'evt-aespa-2026', 'Trading Card Set (Random 4pcs)', 8000.00, true, 2),
  ('cat-3', 'evt-aespa-2026', 'Image Picket Fan (Karina)', 15000.00, false, 3),
  ('cat-4', 'evt-aespa-2026', 'Zip-Up Hoodie (Free Size)', 89000.00, true, 4),
  ('cat-5', 'evt-aespa-2026', 'Acrylic Stand & Keyring', 22000.00, true, 5),
  -- NewJeans Catalog
  ('nj-1', 'evt-newjeans-tokyo', 'Binky Bong Official Lightstick', 6800.00, true, 1),
  ('nj-2', 'evt-newjeans-tokyo', 'Murakami Collaboration Plush Keyring', 3500.00, true, 2),
  ('nj-3', 'evt-newjeans-tokyo', 'Photo Slogan Towel', 2800.00, false, 3),
  ('nj-4', 'evt-newjeans-tokyo', 'Premium Photocard Binder', 4200.00, true, 4)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  comes_with_pc = EXCLUDED.comes_with_pc,
  display_order = EXCLUDED.display_order;

-- 3. Insert Orders
INSERT INTO orders (id, event_id, person_name, buyer, seller, is_my_order, order_type, status, order_date, payment_date, collection_date, comment)
VALUES
  -- aespa Orders
  ('ord-1', 'evt-aespa-2026', 'Me', 'Me', 'Official Venue Store', true, 'host', 'completed', '2026-06-25', '2026-06-25', '2026-07-15', 'Anchor order for remainder pooling'),
  ('ord-2', 'evt-aespa-2026', 'Minji K.', 'Minji K.', 'Me', false, 'taking', 'paid', '2026-06-26', '2026-06-28', '2026-07-16', 'Paid via PayNow. Meet up at Gate 3 before concert.'),
  ('ord-3', 'evt-aespa-2026', 'Chloe T.', 'Chloe T.', 'Me', false, 'taking', 'unpaid', '2026-06-20', NULL, '2026-07-18', 'Promised to transfer by Friday evening'),
  ('ord-4', 'evt-aespa-2026', 'Seoul Runner Proxy (@kr_proxy)', 'Me', 'Seoul Runner Proxy (@kr_proxy)', false, 'placing', 'paid', '2026-06-27', '2026-06-27', '2026-07-12', 'EMS shipping tracking #EM928341KR'),
  -- NewJeans Orders
  ('ord-tok-1', 'evt-newjeans-tokyo', 'Me', 'Me', 'Official Venue Store', true, 'host', 'completed', '2026-06-22', '2026-06-22', '2026-07-20', 'Personal merch haul from Tokyo Dome'),
  ('ord-tok-2', 'evt-newjeans-tokyo', 'Hana S.', 'Hana S.', 'Me', false, 'taking', 'unpaid', '2026-06-21', NULL, '2026-07-22', 'Waiting for paycheck next week')
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  person_name = EXCLUDED.person_name,
  buyer = EXCLUDED.buyer,
  seller = EXCLUDED.seller,
  is_my_order = EXCLUDED.is_my_order,
  order_type = EXCLUDED.order_type,
  status = EXCLUDED.status,
  order_date = EXCLUDED.order_date,
  payment_date = EXCLUDED.payment_date,
  collection_date = EXCLUDED.collection_date,
  comment = EXCLUDED.comment,
  updated_at = NOW();

-- 4. Insert Order Items
INSERT INTO order_items (id, order_id, catalog_item_id, quantity)
VALUES
  -- ord-1 items
  ('oi-1', 'ord-1', 'cat-1', 1),
  ('oi-2', 'ord-1', 'cat-2', 3),
  ('oi-3', 'ord-1', 'cat-5', 1),
  -- ord-2 items
  ('oi-4', 'ord-2', 'cat-4', 1),
  ('oi-5', 'ord-2', 'cat-2', 2),
  -- ord-3 items
  ('oi-6', 'ord-3', 'cat-2', 5),
  ('oi-7', 'ord-3', 'cat-3', 1),
  -- ord-4 items
  ('oi-8', 'ord-4', 'cat-1', 1),
  ('oi-9', 'ord-4', 'cat-3', 1),
  -- ord-tok-1 items
  ('oi-10', 'ord-tok-1', 'nj-1', 1),
  ('oi-11', 'ord-tok-1', 'nj-2', 2),
  -- ord-tok-2 items
  ('oi-12', 'ord-tok-2', 'nj-2', 3),
  ('oi-13', 'ord-tok-2', 'nj-4', 1)
ON CONFLICT (order_id, catalog_item_id) DO UPDATE SET
  quantity = EXCLUDED.quantity;
