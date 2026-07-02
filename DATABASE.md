# Merch Tracker — Database Architecture & Migration Guide

This document defines the relational database schema, security policies, and data migration procedures for **Merch Tracker**, transitioning from client-side `localStorage` / static JSON into a scalable cloud PostgreSQL instance powered by **Supabase**.

---

## 1. Executive Summary & ERD

The database architecture relationalizes multi-currency concert tours (`events`), merchandise catalogs (`catalog_items`), group order participants (`orders`), and individual purchased quantities (`order_items`). 

```mermaid
erDiagram
    events ||--o{ catalog_items : "has official"
    events ||--o{ orders : "tracks hauls & GOs in"
    orders ||--o{ order_items : "contains"
    catalog_items ||--o{ order_items : "referenced by"

    events {
        string id PK "Unique event identifier (e.g. evt-aespa-2026)"
        string name "Full tour or pop-up name"
        string currency_code "ISO Code (KRW, JPY, USD)"
        numeric exchange_rate "Conversion rate to base currency"
        numeric benefit_threshold "Spend required per photocard benefit"
        timestamptz created_at "Record creation timestamp"
        timestamptz updated_at "Auto-updated modification timestamp"
    }

    catalog_items {
        string id PK "Merchandise item SKU or ID"
        string event_id FK "References events(id)"
        string name "Merchandise item name"
        numeric price "Price in local event currency"
        boolean comes_with_pc "Eligible for store benefits / photocards"
        integer display_order "Sorting weight in UI catalog"
        timestamptz created_at "Record creation timestamp"
    }

    orders {
        string id PK "Unique order or participant ID"
        string event_id FK "References events(id)"
        string person_name "Participant name or buyer handle"
        string buyer "Payer entity (Me or participant name)"
        string seller "Payee entity (Official Store, Proxy, or Me)"
        boolean is_my_order "True if this order is the host haul"
        string order_type "Role: host, placing, or taking"
        string status "Payment/Fulfillment status"
        date order_date "Date order placed"
        date payment_date "Date payment transferred"
        date collection_date "Estimated collection/meetup date"
        string comment "Notes, tracking numbers, or payment memos"
        timestamptz created_at "Record creation timestamp"
    order_items {
        string id PK "Unique line item identifier"
        string order_id FK "References orders(id)"
        string catalog_item_id FK "References catalog_items(id)"
        integer quantity "Quantity purchased"
        timestamptz created_at "Record creation timestamp"
    }
```

---

## 2. Data Dictionary

### `events`
Stores concert tours, fan meetings, and pop-up stores being tracked.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Stable text slug identifier (e.g., `evt-aespa-2026`). |
| `name` | `TEXT` | `NOT NULL` | Full display name of the event. |
| `currency_code` | `VARCHAR(10)` | `NOT NULL DEFAULT 'USD'` | ISO 4217 code (e.g., `KRW`). |
| `exchange_rate` | `NUMERIC(14, 6)` | `NOT NULL DEFAULT 1.0` | Multiplier to convert local currency to base currency (SGD/USD). |
| `benefit_threshold` | `NUMERIC(14, 2)` | `NOT NULL DEFAULT 0` | Amount required in local currency to qualify for 1 store benefit photocard. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Automatically updated on modification via trigger. |

### `catalog_items`
Represents official merchandise items available at a given event.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | SKU or string identifier (e.g., `cat-1`, `nj-2`). |
| `event_id` | `TEXT` | `FOREIGN KEY NOT NULL` | References `events(id)` with `ON DELETE CASCADE`. |
| `name` | `TEXT` | `NOT NULL` | Item title (e.g., `Official Light Stick Ver.2`). |
| `price` | `NUMERIC(14, 2)` | `NOT NULL CHECK (price >= 0)` | Price in event currency. |
| `comes_with_pc` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Flag indicating if this item contributes to store benefit tiers. |
| `display_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Ascending sort index for UI presentation. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp. |

### `orders`
Stores group order (GO) participants, proxy orders, or personal host hauls.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Order identifier (e.g., `ord-1`). |
| `event_id` | `TEXT` | `FOREIGN KEY NULL` | Optional reference to `events(id)` (`ON DELETE SET NULL`). Can be NULL for standalone hauls or general store purchases. |
| `person_name` | `TEXT` | `NOT NULL` | Clean name of the participant or proxy. |
| `buyer` | `TEXT` | `NOT NULL` | Entity providing payment. |
| `seller` | `TEXT` | `NOT NULL` | Entity receiving funds or fulfilling goods. |
| `is_my_order` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | `true` if this order represents the host's personal anchor haul. |
| `order_type` | `TEXT` | `CHECK IN ('host', 'placing', 'taking')` | Role classification in the group order flow. |
| `status` | `TEXT` | `CHECK IN ('unpaid', 'paid', 'ordered', 'shipped', 'completed', 'cancelled')` | Lifecycle status of the order. |
| `order_date` | `DATE` | `NULL` | Date order was placed. |
| `payment_date` | `DATE` | `NULL` | Date payment was confirmed. |
| `collection_date` | `DATE` | `NULL` | Scheduled meetup or delivery date. |
| `comment` | `TEXT` | `NULL` | Memos, tracking codes, or meetup locations. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Automatically updated on modification via trigger. |

### `order_items`
Normalizes merchandise quantities purchased inside each order.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Stable text slug identifier (e.g., `oi-1`). |
| `order_id` | `TEXT` | `FOREIGN KEY NOT NULL` | References `orders(id)` with `ON DELETE CASCADE`. |
| `catalog_item_id` | `TEXT` | `FOREIGN KEY NOT NULL` | References `catalog_items(id)` with `ON DELETE CASCADE`. |
| `quantity` | `INTEGER` | `NOT NULL CHECK (quantity > 0)` | Number of units purchased. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp. |

---

## 3. Row Level Security (RLS) Policies

All tables have RLS enabled by default to protect user data:
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
```

> [!NOTE]
> **Migration Policy**: For initial database creation and data migration from local storage without authentication barriers, the provided `schema.sql` establishes public read/write access policies (`FOR ALL USING (true) WITH CHECK (true)`). Once deployed to production with Supabase Auth enabled, replace these with user-isolated policies (`auth.uid()`).

---

## 4. Step-by-Step Setup & Migration Guide

### Step 1: Create Supabase Project
1. Log into [Supabase Dashboard](https://app.supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy your **Project URL** and **anon / public key**.

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 3: Run Database Setup DDL
You can execute the schema directly in the Supabase SQL Editor:
1. Open [schema.sql](file:///Users/opx/Desktop/Merch%20Tracker/supabase/schema.sql).
2. Copy all SQL content and paste it into the **Supabase SQL Editor** -> Click **Run**.

### Step 4: Populate Data (Choose A or B)

#### Method A: Direct SQL Seed (Recommended for Quick Demo Setup)
1. Open [seed.sql](file:///Users/opx/Desktop/Merch%20Tracker/supabase/seed.sql).
2. Paste into the **Supabase SQL Editor** and click **Run**. This populates the exact initial events, catalog items, orders, and line items.

#### Method B: Command-Line Migration Runner
If you have local modifications or updated demo data in your code, run the automated CLI migration script:
```bash
node scripts/migrate.js
```

---

## 5. SQL Query Cookbook

### Calculate Event Spend & Earned Photocard Benefits
Calculates total qualifying merchandise spend per event and how many store benefit photocards have been earned based on the event's `benefit_threshold`:

```sql
SELECT 
    e.name AS event_name,
    e.currency_code,
    SUM(oi.line_total) AS qualifying_spend,
    FLOOR(SUM(oi.line_total) / NULLIF(e.benefit_threshold, 0)) AS photocards_earned
FROM events e
JOIN v_order_item_details oi ON oi.event_id = e.id
JOIN catalog_items ci ON ci.id = oi.catalog_item_id
WHERE ci.comes_with_pc = true AND oi.status != 'cancelled'
GROUP BY e.id, e.name, e.currency_code, e.benefit_threshold;
```

### Summary of Group Order Receivables (Unpaid vs Paid)
Aggregates financial collection status across all participants taking part in group orders:

```sql
SELECT 
    oi.event_id,
    oi.person_name,
    oi.status,
    SUM(oi.line_total) AS total_local_currency,
    ROUND(SUM(oi.line_total) * e.exchange_rate, 2) AS total_base_currency
FROM v_order_item_details oi
JOIN events e ON e.id = oi.event_id
WHERE oi.status IN ('unpaid', 'paid')
GROUP BY oi.event_id, oi.person_name, oi.status, e.exchange_rate
ORDER BY oi.status, oi.person_name;
```
