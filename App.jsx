import React, { useState } from "react";
import { useAppData } from "./hooks/useAppData";

import SyncStatus from "./components/SyncStatus";
import Caisse from "./components/Caisse";
import Dashboard from "./components/Dashboard";
import Recettes from "./components/Recettes";
import StockAchats from "./components/StockAchats";
import Compta from "./components/Compta";
import BilanPrevisionnel from "./components/BilanPrevisionnel";
import PlanTresorerie from "./components/PlanTresorerie";
import Allergenes from "./components/Allergenes";
import Params from "./components/Params";

const TABS = [
  { id: "caisse", label: "Caisse", icon: "ti-cash" },
  { id: "dashboard", label: "Stats", icon: "ti-chart-bar" },
  { id: "recettes", label: "Recettes", icon: "ti-clipboard-list" },
  { id: "stock", label: "Stock & Achats", icon: "ti-shopping-cart" },
  { id: "compta", label: "Compta", icon: "ti-file-invoice" },
  { id: "bilan", label: "Bilan", icon: "ti-scale" },
  { id: "tresorerie", label: "Trésorerie", icon: "ti-wallet" },
  { id: "allergenes", label: "Allergènes", icon: "ti-alert-triangle" },
  { id: "params", label: "Paramètres", icon: "ti-settings" },
];

export default function App() {
  const [tab, setTab] = useState("caisse");

  const {
    loaded, error,
    ventes, addVente, deleteVente, rembourserVente,
    produits, setProduits,
    cbcData,
    params, setParams,
    courses, addCourse, updateCourse, removeCourse,
    journalCaisse, addJournalEvent,
    achats, addAchatsIngredients,
    achatsCBC, addAchatCBD,
    nbres, setNbres,
  } = useAppData();

  if (!loaded) {
    return <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>Chargement…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "#dc3545" }}>
        <h2>Erreur de connexion à Supabase</h2>
        <pre>{error.message}</pre>
        <p>Vérifie l'URL et la clé dans <code>src/services/supabase.js</code>, et que les tables existent bien.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 900, margin: "0 auto", padding: "0 0 3rem" }}>
      <div style={{
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "1rem 1rem 0",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>☕ Cateh</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 4 }}>Café & CBD</span>
          <SyncStatus />
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: "0" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              border: "none", background: tab === t.id ? "var(--color-background-secondary)" : "transparent",
              color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              padding: "6px 12px", borderRadius: "var(--border-radius-md) var(--border-radius-md) 0 0",
              cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 500 : 400, whiteSpace: "nowrap",
              borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            }}>
              <i className={`ti ${t.icon}`} style={{ marginRight: 5, fontSize: 14 }} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "1.5rem 1rem" }}>
        {tab === "caisse" && (
          <Caisse
            produits={produits} cbcData={cbcData} achatsCBC={achatsCBC}
            addVente={addVente} ventes={ventes} deleteVente={deleteVente}
            rembourserVente={rembourserVente} journalCaisse={journalCaisse}
            addJournalEvent={addJournalEvent}
          />
        )}
        {tab === "dashboard" && (
          <Dashboard ventes={ventes} produits={produits} params={params} />
        )}
        {tab === "recettes" && (
          <Recettes produits={produits} setProduits={setProduits} nbres={nbres} achats={achats} />
        )}
        {tab === "stock" && (
          <StockAchats
            produits={produits} nbres={nbres} setNbres={setNbres}
            achats={achats} addAchatsIngredients={addAchatsIngredients}
            addCourse={addCourse} ventes={ventes}
            cbcData={cbcData} achatsCBC={achatsCBC} addAchatCBD={addAchatCBD}
          />
        )}
        {tab === "compta" && (
          <Compta ventes={ventes} params={params} courses={courses}
            addCourse={addCourse} updateCourse={updateCourse} removeCourse={removeCourse} />
        )}
        {tab === "bilan" && (
          <BilanPrevisionnel ventes={ventes} params={params} courses={courses} />
        )}
        {tab === "tresorerie" && (
          <PlanTresorerie ventes={ventes} params={params} courses={courses} />
        )}
        {tab === "allergenes" && (
          <Allergenes produits={produits} />
        )}
        {tab === "params" && (
          <Params params={params} setParams={setParams} />
        )}
      </div>
    </div>
  );
}
