import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

/**
 * Indicateur de connexion à Supabase. Contrairement à l'ancien système (Google Apps Script,
 * polling toutes les 30s par nécessité), Supabase confirme chaque écriture immédiatement —
 * ce composant sert surtout à détecter une coupure réseau, pas à pallier un système asynchrone.
 */
export default function SyncStatus() {
  const [status, setStatus] = useState("checking");
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    const check = async () => {
      setStatus("checking");
      try {
        const { error } = await supabase.from("params").select("id").limit(1);
        if (error) throw error;
        setStatus("ok");
        setLastCheck(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } catch (e) {
        setStatus("error");
      }
    };
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (status === "ok") {
    return (
      <span style={{ fontSize: 11, color: "var(--color-text-success)", marginLeft: 4 }} title={`Dernière vérification : ${lastCheck}`}>
        ● connecté
      </span>
    );
  }
  if (status === "checking") {
    return <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4 }}>● connexion...</span>;
  }
  return (
    <span style={{ fontSize: 11, color: "var(--color-text-danger)", marginLeft: 4 }} title="Connexion à la base impossible">
      ● hors ligne
    </span>
  );
}
