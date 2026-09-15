import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
url = url.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
  const user = {
    id: 5698050836,
    firstName: "Metamaform",
    lastName: "",
    username: "Metamaform",
    languageCode: "en",
    balance: 1100.1299999999999,
    inventory: []
  };
  
  const { error } = await supabase.from('users').upsert({
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName || null,
    username: user.username || null,
    language_code: user.languageCode || null,
    balance: user.balance,
    inventory: user.inventory,
  }, { onConflict: 'id' });

  console.log("Error:", error);
}
run();
