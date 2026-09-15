import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
url = url.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
  const usersStr = fs.readFileSync('data/users.json', 'utf-8');
  const allUsers = JSON.parse(usersStr);
  
  for (const id in allUsers) {
    const user = allUsers[id];
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName || null,
      username: user.username || null,
      language_code: user.languageCode || null,
      balance: user.balance,
      inventory: user.inventory,
    }, { onConflict: 'id' });
    if (error) console.error("Error backfilling user", id, error);
    else console.log("Backfilled user", id);
  }
}
run();
