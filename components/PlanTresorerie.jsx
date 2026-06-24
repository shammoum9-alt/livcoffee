import React, { useState } from "react";
import { calculerResultatMois, getHypotheseMois } from "../utils/calculs";
import { fmtE } from "../utils/format";
import { MOIS_LABELS } from "../constants/theme";

export default function PlanTresorerie({ ventes, params, courses }) {
  const todayForTreso = new Date();
  const [moisDepart, setMoisDepart] = useState(
    `${todayForTreso.getFullYear()}-${String(todayForTreso.getMonth() + 1).padStart(2, "0")}`
  );
  const [nbMoisProjection, setNbMoisProjection] = useState(6);

  const [anneeStr, moisStr] = moisDepart.split("-");
  const anneeD = parseInt(anneeStr), moisD = parseInt(moisStr) - 1;

  // Pour chaque mois de la projection : si le mois a déjà des ventes réelles, on utilise le réel ; sinon on utilise l'hypothèse définie en Paramètres
  const lignes = [];
  let soldeCumule = params.tresorerie_depart || 0;
  // D'abord, cumuler la trésorerie réelle depuis le début de l'historique jusqu'au mois juste avant moisDepart
  const premiereVenteDate = ventes.filter(v => v.date && !v.deleted).map(v => new Date(v.date)).sort((a, b) => a - b)[0];
  if (premiereVenteDate) {
    let y = premiereVenteDate.getFullYear(), m = premiereVenteDate.getMonth();
    while (y < anneeD || (y === anneeD && m < moisD)) {
      const r = calculerResultatMois(y, m, ventes, params, courses);
      soldeCumule += r.fluxTresorerie;
      m++; if (m > 11) { m = 0; y++; }
    }
  }

  let y = anneeD, m = moisD;
  const today = new Date();
  for (let i = 0; i < nbMoisProjection; i++) {
    const moisKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const estMoisPasse = (y < today.getFullYear()) || (y === today.getFullYear() && m < today.getMonth());
    const estMoisCourant = (y === today.getFullYear() && m === today.getMonth());
    let caLigne, source;
    if (estMoisPasse || estMoisCourant) {
      const r = calculerResultatMois(y, m, ventes, params, courses);
      caLigne = r;
      source = estMoisCourant ? "Réel (partiel)" : "Réel";
    } else {
      const hyp = getHypotheseMois(params, moisKey);
      const caHyp = hyp.clientsJour * hyp.ticketMoyen * hyp.joursTravailles;
      // On simule le résultat avec le même calcul que calculerResultatMois mais en injectant le CA hypothétique
      const totalChargesFixes = params.charges_fixes.reduce((s, c) => s + c.montant, 0);
      const totalChargesVarFixes = params.charges_variables_fixes.reduce((s, c) => s + c.montant, 0);
      const totalMensualitesDettes = (params.dettes || []).reduce((s, d) => s + (d.mensualite || 0), 0);
      const coursesMois = courses.filter(c => c.mois === m);
      const totalCourses = coursesMois.reduce((s, c) => s + parseFloat(c.montant || 0), 0);
      const charges_sociales = caHyp * params.taux_cotisation_acre;
      const cfp = caHyp * params.taux_cfp;
      const ir = caHyp * params.taux_ir;
      const totalCharges = totalCourses + totalChargesFixes + totalChargesVarFixes + charges_sociales + cfp;
      const resultat_net = caHyp - totalCharges;
      const resultat_comptable = resultat_net - ir;
      const fluxTresorerie = resultat_comptable - totalMensualitesDettes;
      caLigne = { caVentes: caHyp, totalCharges, resultat_comptable, fluxTresorerie };
      source = (hyp.clientsJour > 0 && hyp.ticketMoyen > 0) ? "Hypothèse" : "Aucune hypothèse";
    }
    soldeCumule += caLigne.fluxTresorerie;
    lignes.push({ moisKey, label: `${MOIS_LABELS[m]} ${y}`, source, ...caLigne, soldeApres: soldeCumule });
    m++; if (m > 11) { m = 0; y++; }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Mois de départ</label>
          <input type="month" value={moisDepart} onChange={e => setMoisDepart(e.target.value)}
            style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Nombre de mois</label>
          <select value={nbMoisProjection} onChange={e => setNbMoisProjection(parseInt(e.target.value))}
            style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }}>
            {[3, 6, 12].map(n => <option key={n} value={n}>{n} mois</option>)}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
        Les mois passés/en cours utilisent le réel. Les mois futurs utilisent l'hypothèse définie en Paramètres (clients/jour × ticket moyen × jours travaillés).
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              {["Mois", "Source", "CA", "Charges", "Résultat", "Flux trésorerie", "Solde cumulé"].map(h => (
                <th key={h} style={{ textAlign: h === "Mois" || h === "Source" ? "left" : "right", padding: "7px 8px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map(l => (
              <tr key={l.moisKey} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "7px 8px", fontWeight: 500 }}>{l.label}</td>
                <td style={{ padding: "7px 8px", fontSize: 11, color: l.source === "Réel" ? "#2e7d32" : l.source === "Hypothèse" ? "var(--color-text-secondary)" : "#dc3545" }}>{l.source}</td>
                <td style={{ textAlign: "right", padding: "7px 8px" }}>{fmtE(l.caVentes)}</td>
                <td style={{ textAlign: "right", padding: "7px 8px", color: "var(--color-text-secondary)" }}>{fmtE(l.totalCharges)}</td>
                <td style={{ textAlign: "right", padding: "7px 8px", color: l.resultat_comptable >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{fmtE(l.resultat_comptable)}</td>
                <td style={{ textAlign: "right", padding: "7px 8px" }}>{fmtE(l.fluxTresorerie)}</td>
                <td style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, color: l.soldeApres >= 0 ? "var(--color-text-primary)" : "var(--color-text-danger)" }}>{fmtE(l.soldeApres)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lignes.some(l => l.soldeApres < 0) && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(220,53,69,0.07)", border: "0.5px solid rgba(220,53,69,0.3)", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "#dc3545" }}>
          ⚠ Le solde de trésorerie passe en négatif sur la période projetée — anticiper un besoin de financement ou ajuster les charges/hypothèses.
        </div>
      )}
    </div>
  );
}
