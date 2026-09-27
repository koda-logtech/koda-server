import { createClient } from '@supabase/supabase-js';
import { getEnvironment } from './environment';

const env = getEnvironment();

if (!env.supabase.url || !env.supabase.apiKey) {
  throw new Error(
    'Mandatory Supabase credentials not configured: SUPABASE_URL and SUPABASE_API_KEY',
  );
}

export const supabase = createClient(env.supabase.url, env.supabase.apiKey);

export default supabase;
