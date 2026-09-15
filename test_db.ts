import { createClient } from '@supabase/supabase-js';

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
url = url.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
  const { error } = await supabase.from('users').upsert({
    id: 11111111,
    first_name: 'test',
    last_name: 'test',
    username: 'test',
    balance: 0,
    inventory: []
  }, { onConflict: 'id' });
  console.log("Error:", error);
}
run();
