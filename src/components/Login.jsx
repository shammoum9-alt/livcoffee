import React, { useState } from "react";
import { supabase } from "../services/supabase";

/**
 * Écran de connexion — accès partagé par compte unique (toi + associés).
 * Bloque l'app tant que personne n'est authentifié auprès de Supabase.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    console.log("Résultat signInWithPassword :", result);
    const { error, data } = result;
    console.log("Session retournée :", data?.session ? "PRÉSENTE" : "ABSENTE");
    if (data?.session) {
      const check = await supabase.auth.getSession();
      console.log("Vérification immédiate getSession() :", check.data?.session ? "OK" : "PERDUE");
    }
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message
      );
    }
    // Si succès, le listener onAuthStateChange (dans useAppData ou App.jsx) met à jour la session.
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-sans)", background: "var(--color-background-secondary)", padding: "1rem",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        padding: "2rem", maxWidth: 360, width: "100%", boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>☕ Cateh</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
          Connexion à l'espace de gestion
        </div>

        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          autoFocus
          style={{ width: "100%", padding: "9px 12px", marginBottom: "0.75rem", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />

        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Mot de passe</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", marginBottom: "1rem", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />

        {error && (
          <div style={{ background: "rgba(220,53,69,0.08)", color: "#dc3545", padding: "8px 12px", borderRadius: "var(--border-radius-md)", fontSize: 13, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "10px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: loading ? "default" : "pointer", fontSize: 14, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
