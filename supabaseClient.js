// supabaseClient.js
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://vorjtybwcvrymothqqoc.supabase.co";
const supabaseKey = "sb_publishable_dOfxHm1NfX7nGt8Uv3ZULQ_ZYpXXWv-";

export const supabase = createClient(supabaseUrl, supabaseKey);