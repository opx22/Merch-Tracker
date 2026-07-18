-- We need to drop the old CHECK constraints so the new statuses can be inserted.
DO $$
DECLARE
    order_type_constraint_name text;
    status_constraint_name text;
BEGIN
    -- Find the constraint name for order_type
    SELECT conname INTO order_type_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass AND consrc ILIKE '%order_type = ANY%';

    -- Find the constraint name for status
    SELECT conname INTO status_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass AND consrc ILIKE '%status = ANY%';

    -- Drop them if they exist
    IF order_type_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || order_type_constraint_name;
    END IF;

    IF status_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || status_constraint_name;
    END IF;
END $$;
