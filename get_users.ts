import { createClient } from '@supabase/supabase-js';

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
url = url.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  console.log("Users:", data);
}
run();
