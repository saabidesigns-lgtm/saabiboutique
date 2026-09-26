import { createClient } from 'npm:@supabase/supabase-js@2';

// Service-role client — full DB access, bypasses RLS entirely. Only ever
// used inside Edge Functions (trusted server-side code), never sent to
// the browser.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
