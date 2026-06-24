import React, { useState } from "react";
import { calculerResultatMois } from "../utils/calculs";
import { fmtE } from "../utils/format";

export default function BilanPrevisionnel({ ventes, params, courses }) {
  const todayForBilan = new Date();
  const [moisBilan, setMoisBilan] = useState(
    `${todayForBilan.getFullYear()}-${String(todayForBilan.getMonth() + 1).padStart(2, "0")}`
  );
  const [anneeStr, moisStr] = moisBilan.split("-");
  const anneeSel = parseInt(anneeStr), moisSel = parseInt(moisStr) - 1;

  // Trésorerie cumulée à la fin du mois sélectionné = trésorerie de départ + somme des flux
  // de tous les mois depuis le début de l'historique jusqu'au mois sélectionné inclus
  const premiereVenteDate = ventes.filter(v => v.date && !v.deleted).map(v => new Date(v.date)).sort((a, b) => a - b)[0];
  const anneeDebut = premiereVenteDate ? premiereVenteDate.getFullYear() : anneeSel;
  const moisDebut = premiereVenteDate ? premiereVenteDate.getMonth() : moisSel;

  let tresorerieCumulee = params.tresorerie_depart || 0;
  let resultatCumule = 0;
  let y = anneeDebut, m = moisDebut;
  while (y < anneeSel || (y === anneeSel && m <= moisSel)) {
    const r = calculerResultatMois(y, m, ventes, params, courses);
    tresorerieCumulee += r.fluxTresorerie;
    resultatCumule += r.resultat_comptable;
    m++; if (m > 11) { m = 0; y++; }
  }

  const totalImmobilisationsBrut = (params.immobilisations || []).reduce((s, im) => s + (im.valeur || 0), 0);
  // Amortissement cumulé approximatif : amortissement annuel × nombre de mois écoulés / 12, plafonné à la valeur d'origine
  const moisEcoules = (anneeSel - anneeDebut) * 12 + (moisSel - moisDebut) + 1;
  const amortissementCumule = (params.immobilisations || []).reduce((s, im) => {
    const amortMensuel = (im.amortissement_annuel || 0) / 12;
    return s + Math.min(amortMensuel * moisEcoules, im.valeur || 0);
  }, 0);
  const valeurNetteImmobilisations = totalImmobilisationsBrut - amortissementCumule;

  const totalDettes = (params.dettes || []).reduce((s, d) => s + (d.montant || 0), 0);

  const totalActif = tresorerieCumulee + valeurNetteImmobilisations;
  const capitauxPropres = resultatCumule; // simplification : pas de capital social distinct saisi
  const totalPassifAffiche = totalDettes + capitauxPropres;
  const equilibre = Math.abs(totalActif - totalPassifAffiche) < 1;

  const Row = ({ label, val, sub = false, bold = false, color = null }) => (
    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <td style={{ padding: "6px 8px", fontSize: sub ? 12 : 13, paddingLeft: sub ? 24 : 8, color: sub ? "var(--color-text-secondary)" : "var(--color-text-primary)", fontWeight: bold ? 500 : 400 }}>{label}</td>
      <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 13, fontWeight: bold ? 500 : 400, color: color || "var(--color-text-primary)" }}>{fmtE(val)}</td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Bilan simplifié arrêté à la fin du mois sélectionné — à but de pilotage, ne remplace pas un bilan comptable officiel.
        </div>
        <input type="month" value={moisBilan} onChange={e => setMoisBilan(e.target.value)}
          style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>Actif</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Actif circulant</td>
              </tr>
              <Row label="Trésorerie (banque)" val={tresorerieCumulee} sub />
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Actif immobilisé</td>
              </tr>
              {(params.immobilisations || []).map((im, i) => {
                const amortMensuel = (im.amortissement_annuel || 0) / 12;
                const amortCumuleItem = Math.min(amortMensuel * moisEcoules, im.valeur || 0);
                return <Row key={i} label={`${im.label} (net)`} val={(im.valeur || 0) - amortCumuleItem} sub />;
              })}
              {(params.immobilisations || []).length === 0 && <Row label="Aucune immobilisation" val={0} sub />}
              <Row label="Total actif" val={totalActif} bold />
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>Passif</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Capitaux propres</td>
              </tr>
              <Row label="Résultat cumulé" val={capitauxPropres} sub color={capitauxPropres >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"} />
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Dettes</td>
              </tr>
              {(params.dettes || []).map((d, i) => (
                <Row key={i} label={d.label} val={d.montant || 0} sub />
              ))}
              {(params.dettes || []).length === 0 && <Row label="Aucune dette" val={0} sub />}
              <Row label="Total passif" val={totalPassifAffiche} bold />
            </tbody>
          </table>
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: "var(--border-radius-md)", fontSize: 12,
            background: equilibre ? "rgba(46,125,50,0.07)" : "rgba(220,53,69,0.07)",
            color: equilibre ? "#2e7d32" : "#dc3545",
          }}>
            {equilibre ? "✓ Bilan équilibré (Actif = Passif)" : `⚠ Écart actif/passif : ${fmtE(totalActif - totalPassifAffiche)} — vérifier les saisies (immobilisations/dettes).`}
          </div>
        </div>
      </div>
    </div>
  );
}
