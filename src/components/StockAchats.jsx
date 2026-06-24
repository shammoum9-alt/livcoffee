import React, { useState } from "react";
import PlanifAlimentaire from "./PlanifAlimentaire";
import CBC from "./CBC";

/**
 * Page "Stock & Achats" — regroupe la gestion des stocks alimentaires et CBD/CBC
 * sous une seule entrée de menu, avec deux onglets internes. Avant cette fusion,
 * les deux étaient des pages séparées du menu principal ; elles partagent la même
 * logique (achats, décumulation par les ventes), donc les rassembler évite la
 * duplication de contexte pour l'utilisateur.
 */
export default function StockAchats({
  produits, nbres, setNbres, achats, addAchatsIngredients, addCourse, ventes,
  cbcData, setCbcData, achatsCBC, addAchatCBD,
}) {
  const [sousOnglet, setSousOnglet] = useState("alimentaire");

  const onglets = [
    { id: "alimentaire", label: "Alimentaire" },
    { id: "cbd", label: "CBC / CBD" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {onglets.map(o => (
          <button key={o.id} onClick={() => setSousOnglet(o.id)} style={{
            border: "none", background: "none", padding: "8px 16px", cursor: "pointer",
            fontSize: 14, fontWeight: sousOnglet === o.id ? 600 : 400,
            color: sousOnglet === o.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: sousOnglet === o.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {sousOnglet === "alimentaire" && (
        <PlanifAlimentaire
          produits={produits}
          nbres={nbres}
          setNbres={setNbres}
          achats={achats}
          addAchatsIngredients={addAchatsIngredients}
          addCourse={addCourse}
          ventes={ventes}
        />
      )}

      {sousOnglet === "cbd" && (
        <CBC
          cbcData={cbcData}
          setCbcData={setCbcData}
          achatsCBC={achatsCBC}
          addAchatCBD={addAchatCBD}
          ventes={ventes}
        />
      )}
    </div>
  );
}
