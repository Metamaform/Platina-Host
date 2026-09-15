import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseServer = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null as any; 

if (!supabaseServiceKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Server won't be able to bypass RLS.");
}
