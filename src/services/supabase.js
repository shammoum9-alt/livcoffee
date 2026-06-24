import { createClient } from "@supabase/supabase-js";

// ⚠️ Ces valeurs viennent de Supabase → Settings → API
// La clé "publishable/anon" est faite pour être utilisée côté client, ce n'est pas un secret.
const SUPABASE_URL = "https://ntvzjcubdgjbqqytcvly.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6YBpv5AaBMShwrkeqwucuw_cAk0JfKC";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
