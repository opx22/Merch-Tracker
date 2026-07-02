import { createClient } from '@supabase/supabase-js';

/**
 * Retrieves Supabase URL and Anon Key from environment variables or localStorage.
 */
export const getSupabaseConfig = () => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('merch_tracker_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('merch_tracker_supabase_key') : null;

  return {
    url: storedUrl || envUrl || '',
    key: storedKey || envKey || '',
  };
};

/**
 * Creates and returns a Supabase client instance if valid URL and Key exist.
 * Returns null if credentials are not set.
 */
export const getSupabaseClient = (customUrl, customKey) => {
  const config = getSupabaseConfig();
  const url = customUrl || config.url;
  const key = customKey || config.key;

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

/**
 * Stores custom Supabase credentials in browser localStorage for easy UI setup.
 */
export const saveSupabaseCredentials = (url, key) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('merch_tracker_supabase_url', url.trim());
    if (key) localStorage.setItem('merch_tracker_supabase_key', key.trim());
  }
};

/**
 * Clears stored custom credentials.
 */
export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('merch_tracker_supabase_url');
    localStorage.removeItem('merch_tracker_supabase_key');
  }
};
