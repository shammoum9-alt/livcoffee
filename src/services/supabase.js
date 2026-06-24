import { createClient } from "@supabase/supabase-js";

// Les clés viennent des variables d'environnement (voir .env.example).
// Create React App n'expose que les variables préfixées REACT_APP_.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Variables Supabase manquantes. Copie .env.example vers .env et renseigne " +
    "REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
