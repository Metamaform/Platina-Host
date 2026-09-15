import { createClient } from '@supabase/supabase-js';

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
url = url.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
  const { error } = await supabase.from('users').upsert({
    id: 11111112,
    first_name: 'test',
    language_code: 'en'
  }, { onConflict: 'id' });
  console.log("Error:", error);
}
run();
