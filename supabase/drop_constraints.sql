-- Run this in Supabase SQL Editor to drop the old check constraints safely
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
          AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || constraint_record.conname;
    END LOOP;
END $$;
