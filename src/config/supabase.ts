import { createClient } from '@supabase/supabase-js';
import { getEnvironment } from './environment';

const env = getEnvironment();

if (!env.supabase.url || !env.supabase.apiKey) {
  throw new Error(
    'Credenciais obrigatórias do Supabase não configuradas: SUPABASE_URL e SUPABASE_API_KEY'
  );
}

export const supabase = createClient(env.supabase.url, env.supabase.apiKey);

export default supabase;
