import React, { useState } from "react";
import { getHypotheseMois } from "../utils/calculs";
import { fmt, fmtE } from "../utils/format";
import { uploadFactureGoogleDrive } from "../services/dataService";

const PREFIX_LABELS = {
  charges_fixes: "Charges fixes mensuelles",
  charges_variables_fixes: "Charges variables récurrentes",
};

export default function Params({ params: paramsRaw, setParams }) {
  // Sécurise les anciens params sauvegardés qui n'ont pas encore les nouveaux champs (immobilisations, dettes, tresorerie_depart)
  const params = {
    ...paramsRaw,
    tresorerie_depart: paramsRaw.tresorerie_depart ?? 2500,
    immobilisations: paramsRaw.immobilisations || [],
    dettes: paramsRaw.dettes || [],
    hypotheses_mensuelles: paramsRaw.hypotheses_mensuelles || {},
  };
  const upd = (key, val) => setParams(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  const updCharge = (type, i, key, val) => {
    setParams(prev => {
      const arr = [...prev[type]];
      arr[i] = { ...arr[i], [key]: key === "montant" ? parseFloat(val) || 0 : val };
      return { ...prev, [type]: arr };
    });
  };
  const addCharge = (type) => setParams(prev => ({ ...prev, [type]: [...prev[type], { label: "Nouveau frais", montant: 0 }] }));
  const delCharge = (type, i) => {
    if (!window.confirm("Supprimer cette charge ?")) return;
    setParams(prev => ({ ...prev, [type]: prev[type].filter((_, j) => j !== i) }));
  };

  // Hypothèses mensuelles : mois sélectionné pour la saisie (défaut = mois en cours)
  const todayForHyp = new Date();
  const [moisHypSelected, setMoisHypSelected] = useState(
    `${todayForHyp.getFullYear()}-${String(todayForHyp.getMonth() + 1).padStart(2, "0")}`
  );
  const hypCourante = getHypotheseMois(params, moisHypSelected);
  const updHypothese = (key, val) => {
    setParams(prev => ({
      ...prev,
      hypotheses_mensuelles: {
        ...prev.hypotheses_mensuelles,
        [moisHypSelected]: { ...getHypotheseMois(prev, moisHypSelected), [key]: parseFloat(val) || 0 },
      },
    }));
  };

  const [uploadingIdx, setUploadingIdx] = useState(null);
  const fileInputRef = React.useRef(null);
  const pendingUpload = React.useRef(null);

  const triggerUpload = (type, i) => {
    pendingUpload.current = { type, i };
    fileInputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingUpload.current) return;
    const { type, i } = pendingUpload.current;
    setUploadingIdx(type + "-" + i);
    try {
      const label = params[type][i]?.label || "frais";
      const mois = new Date().toISOString().slice(0, 7);
      const fileName = PREFIX_LABELS[type] + " – " + label + " – " + file.name;
      await uploadFactureGoogleDrive(file, mois, fileName);
      updCharge(type, i, "facture_nom", file.name);
    } catch (err) {
      alert("Erreur upload: " + err.message);
    } finally {
      setUploadingIdx(null);
      pendingUpload.current = null;
      e.target.value = "";
    }
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFile} style={{ display: "none" }} />

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>Taux fiscaux & sociaux</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          {[
            { label: "Cotisations ACRE (%)", key: "taux_cotisation_acre", mult: 100 },
            { label: "CFP (%)", key: "taux_cfp", mult: 100 },
            { label: "IR versement libératoire (%)", key: "taux_ir", mult: 100 },
            { label: "Abattement fiscal (%)", key: "abattement", mult: 100 },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{f.label}</label>
              <input type="number" step="0.1" value={fmt(params[f.key] * f.mult, 1)}
                onChange={e => upd(f.key, (parseFloat(e.target.value) || 0) / f.mult)}
                style={{ width: "100%", padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>Hypothèses mensuelles</div>
          <input type="month" value={moisHypSelected} onChange={e => setMoisHypSelected(e.target.value)}
            style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
          Sert de base au CA prévisionnel (Compta) et à la comparaison Hypothèse / Réel (Stats).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Clients / jour (estimé)</label>
            <input type="number" step="1" min="0" value={hypCourante.clientsJour || ""}
              onChange={e => updHypothese("clientsJour", e.target.value)}
              placeholder="Ex: 35"
              style={{ width: "100%", padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ticket moyen estimé (€)</label>
            <input type="number" step="0.1" min="0" value={hypCourante.ticketMoyen || ""}
              onChange={e => updHypothese("ticketMoyen", e.target.value)}
              placeholder="Ex: 8.50"
              style={{ width: "100%", padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Jours travaillés dans le mois</label>
            <input type="number" step="1" min="0" max="31" value={hypCourante.joursTravailles}
              onChange={e => updHypothese("joursTravailles", e.target.value)}
              style={{ width: "100%", padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
          </div>
        </div>
        {hypCourante.clientsJour > 0 && hypCourante.ticketMoyen > 0 && (() => {
          const caEstime = hypCourante.clientsJour * hypCourante.ticketMoyen * hypCourante.joursTravailles;
          return (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13 }}>
              CA prévisionnel du mois ({hypCourante.joursTravailles} jours travaillés) : <strong>{fmtE(caEstime)}</strong>
            </div>
          );
        })()}
      </div>

      {[
        { type: "charges_fixes", label: "Charges fixes mensuelles" },
        { type: "charges_variables_fixes", label: "Charges variables récurrentes" },
      ].map(({ type, label }) => (
        <div key={type} style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            <button onClick={() => addCharge(type)} style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>+ Ajouter</button>
          </div>
          {params[type].map((c, i) => {
            const key = type + "-" + i;
            const isUploading = uploadingIdx === key;
            return (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={c.label} onChange={e => updCharge(type, i, "label", e.target.value)}
                  style={{ flex: 1, minWidth: 120, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
                <input type="number" step="0.01" value={c.montant} onChange={e => updCharge(type, i, "montant", e.target.value)}
                  style={{ width: 80, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "right" }} />
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>€/mois</span>
                <button onClick={() => triggerUpload(type, i)} disabled={isUploading}
                  title={c.facture_nom || "Joindre une facture"}
                  style={{
                    padding: "5px 9px", fontSize: 11, borderRadius: "var(--border-radius-md)", cursor: "pointer",
                    background: c.facture_nom ? "rgba(46,125,50,0.08)" : "var(--color-background-secondary)",
                    border: "0.5px solid " + (c.facture_nom ? "rgba(46,125,50,0.3)" : "var(--color-border-tertiary)"),
                    color: c.facture_nom ? "#2e7d32" : "var(--color-text-secondary)",
                  }}>
                  {isUploading ? "…" : "📎"}
                </button>
                <button onClick={() => delCharge(type, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14 }}>
                  ✕
                </button>
              </div>
            );
          })}
          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 500, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 8 }}>
            Total: {fmtE(params[type].reduce((s, c) => s + c.montant, 0))} / mois
          </div>
        </div>
      ))}

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>Bilan & Trésorerie</div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Trésorerie de départ (€)</label>
          <input type="number" step="1" value={params.tresorerie_depart}
            onChange={e => upd("tresorerie_depart", e.target.value)}
            style={{ width: "100%", maxWidth: 220, padding: "7px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Solde du compte bancaire pro au point de départ — sert de base au Plan de trésorerie.</div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Immobilisations (matériel, véhicule…)</label>
            <button onClick={() => setParams(prev => ({ ...prev, immobilisations: [...prev.immobilisations, { label: "Nouvelle immobilisation", valeur: 0, amortissement_annuel: 0 }] }))}
              style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>+ Ajouter</button>
          </div>
          {params.immobilisations.map((im, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={im.label} placeholder="Désignation"
                onChange={e => setParams(prev => { const a = [...prev.immobilisations]; a[i] = { ...a[i], label: e.target.value }; return { ...prev, immobilisations: a }; })}
                style={{ flex: 1, minWidth: 140, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
              <div>
                <input type="number" step="1" value={im.valeur} placeholder="Valeur"
                  onChange={e => setParams(prev => { const a = [...prev.immobilisations]; a[i] = { ...a[i], valeur: parseFloat(e.target.value) || 0 }; return { ...prev, immobilisations: a }; })}
                  style={{ width: 90, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "right" }} />
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "block", textAlign: "center" }}>valeur €</span>
              </div>
              <div>
                <input type="number" step="1" value={im.amortissement_annuel} placeholder="Amort./an"
                  onChange={e => setParams(prev => { const a = [...prev.immobilisations]; a[i] = { ...a[i], amortissement_annuel: parseFloat(e.target.value) || 0 }; return { ...prev, immobilisations: a }; })}
                  style={{ width: 90, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "right" }} />
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "block", textAlign: "center" }}>amort. €/an</span>
              </div>
              <button onClick={() => { if (window.confirm("Supprimer ?")) setParams(prev => ({ ...prev, immobilisations: prev.immobilisations.filter((_, j) => j !== i) })); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14 }}>✕</button>
            </div>
          ))}
          {params.immobilisations.length === 0 && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Aucune immobilisation enregistrée.</div>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Dettes / emprunts en cours</label>
            <button onClick={() => setParams(prev => ({ ...prev, dettes: [...prev.dettes, { label: "Nouvel emprunt", montant: 0, mensualite: 0 }] }))}
              style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>+ Ajouter</button>
          </div>
          {params.dettes.map((dt, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={dt.label} placeholder="Désignation"
                onChange={e => setParams(prev => { const a = [...prev.dettes]; a[i] = { ...a[i], label: e.target.value }; return { ...prev, dettes: a }; })}
                style={{ flex: 1, minWidth: 140, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
              <div>
                <input type="number" step="1" value={dt.montant} placeholder="Capital restant"
                  onChange={e => setParams(prev => { const a = [...prev.dettes]; a[i] = { ...a[i], montant: parseFloat(e.target.value) || 0 }; return { ...prev, dettes: a }; })}
                  style={{ width: 100, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "right" }} />
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "block", textAlign: "center" }}>capital restant €</span>
              </div>
              <div>
                <input type="number" step="1" value={dt.mensualite} placeholder="Mensualité"
                  onChange={e => setParams(prev => { const a = [...prev.dettes]; a[i] = { ...a[i], mensualite: parseFloat(e.target.value) || 0 }; return { ...prev, dettes: a }; })}
                  style={{ width: 90, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "right" }} />
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "block", textAlign: "center" }}>€/mois</span>
              </div>
              <button onClick={() => { if (window.confirm("Supprimer ?")) setParams(prev => ({ ...prev, dettes: prev.dettes.filter((_, j) => j !== i) })); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14 }}>✕</button>
            </div>
          ))}
          {params.dettes.length === 0 && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Aucune dette enregistrée.</div>}
        </div>
      </div>
    </div>
  );
}
