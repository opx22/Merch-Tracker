import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Error] Missing Supabase credentials in .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dropAllTables() {
  console.log(`Connecting to Supabase project: ${SUPABASE_URL}`);
  console.log('Dropping existing records across all tables...');

  // Delete child records first, then parent tables
  await supabase.from('order_items').delete().neq('id', '___none___');
  await supabase.from('orders').delete().neq('id', '___none___');
  await supabase.from('catalog_items').delete().neq('id', '___none___');
  await supabase.from('events').delete().neq('id', '___none___');

  console.log('All table contents dropped successfully.');
}

dropAllTables();
