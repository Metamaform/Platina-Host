import { supabaseServer } from './src/lib/supabase.server.js';
console.log("Supabase Server initialized:", !!supabaseServer);
console.log("Key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
