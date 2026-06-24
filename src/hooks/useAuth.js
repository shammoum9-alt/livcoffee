import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

/**
 * Gère l'état de session Supabase : vérifie si quelqu'un est déjà connecté
 * au chargement, et écoute les changements (connexion/déconnexion).
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { session, checking, isAuthenticated: !!session, signOut };
}
