/**
 * Command-Line Migration Runner for Merch Tracker -> Supabase
 * Run via terminal: node scripts/migrate.js
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_EVENTS, INITIAL_ORDERS } from '../src/data/demoData.js';
import { executeMigration } from '../src/utils/migrateToSupabase.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\x1b[31m[Error] Missing Supabase credentials.\x1b[0m');
  console.error('Please create a .env file in the root directory with:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-or-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log('\x1b[36m      Merch Tracker -> Supabase Database Migration      \x1b[0m');
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log(`Target URL: ${SUPABASE_URL}`);

  try {
    const result = await executeMigration(supabase, INITIAL_EVENTS, INITIAL_ORDERS, (msg) => {
      console.log(`[Migration] ${msg}`);
    });

    console.log('\x1b[32m\n[Success] Migration completed!\x1b[0m Summary:');
    console.table(result.stats);
  } catch (err) {
    console.error('\x1b[31m\n[Migration Failed]\x1b[0m', err.message);
    process.exit(1);
  }
}

run();
