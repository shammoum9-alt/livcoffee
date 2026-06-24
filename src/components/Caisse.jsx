import React, { useState } from "react";
import { fmtE } from "../utils/format";

export default function Caisse({ produits, cbcData, achatsCBC, addVente, ventes, deleteVente, rembourserVente, journalCaisse, addJournalEvent }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [lignes, setLignes] = useState([{ produit: "", qte: 1 }]);
  const [paiement, setPaiement] = useState("CB");
  const [espece_donnee, setEspeceDonnee] = useState("");
  const [nomClient, setNomClient] = useState("");
  const [saved, setSaved] = useState(false);

  const [showFacture, setShowFacture] = useState(null);
  const [editVente, setEditVente] = useState(null);
  const [showOuverture, setShowOuverture] = useState(false);
  const [showFermeture, setShowFermeture] = useState(false);

  const [dateOuverture, setDateOuverture] = useState(todayStr);
  const [fondOuvertureSaisie, setFondOuvertureSaisie] = useState("");
  const [fondFermetureSaisie, setFondFermetureSaisie] = useState("");
  const [dateHistorique, setDateHistorique] = useState(todayStr); // jour consulté dans l'historique (indépendant du jour réel de la caisse)

  const ouvertureToday = journalCaisse.filter(e => e.type === "ouverture" && e.date === todayStr).slice(-1)[0] || null;
  const fermetureToday = journalCaisse.filter(e => e.type === "fermeture" && e.date === todayStr).slice(-1)[0] || null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!ouvertureToday) setShowOuverture(true);
  }, [todayStr]);

  const getPrix = (id) => {
    const p = produits.find(x => x.id === id);
    if (p) return p.prix || 0;
    const c = (cbcData || []).find(x => x.id === id);
    if (!c) return 0;
    const dernier = (achatsCBC || []).filter(a => a.produit_id === id).sort((a, b) => b.id - a.id)[0];
    return dernier ? dernier.prix_vente : c.prix_vente || 0;
  };
  const getNom = (id) => { const p = produits.find(x => x.id === id) || (cbcData || []).find(x => x.id === id); return p?.nom || id; };

  const total = lignes.reduce((s, l) => s + getPrix(l.produit) * l.qte, 0);
  const monnaie = paiement === "Espèce" && espece_donnee ? parseFloat(espece_donnee) - total : null;

  const addLigne = () => setLignes(prev => [...prev, { produit: "", qte: 1 }]);
  const removeLigne = (i) => setLignes(prev => prev.filter((_, j) => j !== i));
  const updateLigne = (i, k, v) => setLignes(prev => prev.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const valider = () => {
    const items = lignes.filter(l => l.produit);
    if (!items.length) return;
    addVente({ items, total, paiement, espece_donnee: parseFloat(espece_donnee) || 0, nomClient: nomClient.trim() });
    setLignes([{ produit: "", qte: 1 }]); setPaiement("CB"); setEspeceDonnee(""); setNomClient("");
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };

  const ventesAujourdhui = ventes.filter(v => !v.deleted && v.date && v.date.startsWith(todayStr));
  const caJour = ventesAujourdhui.filter(v => !v.rembourse).reduce((s, v) => s + v.total, 0);
  const caCB = ventesAujourdhui.filter(v => !v.rembourse && v.paiement === "CB").reduce((s, v) => s + v.total, 0);
  const caEspece = ventesAujourdhui.filter(v => !v.rembourse && v.paiement === "Espèce").reduce((s, v) => s + v.total, 0);
  const nbJour = ventesAujourdhui.filter(v => !v.rembourse).length;

  const ventesOrdonnees = [...ventesAujourdhui].sort((a, b) => new Date(a.date) - new Date(b.date));
  const premiereVente = ventesOrdonnees[0];
  const derniereVente = ventesOrdonnees[ventesOrdonnees.length - 1];

  // Historique consultable : suit dateHistorique, indépendant des KPIs caisse (toujours liés à aujourd'hui)
  const ventesHistorique = ventes.filter(v => !v.deleted && v.date && v.date.startsWith(dateHistorique));

  const confirmerOuverture = () => {
    const fond = parseFloat(fondOuvertureSaisie) || 0;
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    addJournalEvent({ type: "ouverture", date: dateOuverture, heure, fond });
    setShowOuverture(false); setFondOuvertureSaisie("");
  };

  const fondOuv = ouvertureToday?.fond || 0;
  const theorique = fondOuv + caEspece;
  const fondFerm = parseFloat(fondFermetureSaisie) || 0;
  const ecart = fondFermetureSaisie ? fondFerm - theorique : null;

  const confirmerFermeture = () => {
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    addJournalEvent({ type: "fermeture", date: todayStr, heure, fond: fondFerm, fondOuverture: fondOuv, caJour, caCB, caEspece, theorique, ecart, nbVentes: nbJour });
    setShowFermeture(false); setFondFermetureSaisie("");
  };

  const exportCSV = () => {
    const rows = [["Date", "Heure", "Client", "Produits", "Total", "Paiement", "Remboursé"]];
    ventes.filter(v => !v.deleted).forEach(v => {
      const prods = v.items?.map(it => `${it.qte}x ${getNom(it.produit)}`).join("|") || "";
      const h = new Date(v.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      rows.push([new Date(v.date).toLocaleDateString("fr-FR"), h, v.nomClient || "", prods, v.total.toFixed(2), v.paiement, v.rembourse ? "Oui" : "Non"]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `ventes_sam_${todayStr}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const cats = [...new Set(produits.map(p => p.categorie))];
  const Dropdown = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ flex: 2, padding: "6px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }}>
      <option value="">— Produit —</option>
      {cats.map(cat => (
        <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
          {produits.filter(p => p.categorie === cat).map(p => (
            <option key={p.id} value={p.id}>{p.nom} — {p.prix}€</option>
          ))}
        </optgroup>
      ))}
      {(cbcData || []).length > 0 && (<>
        <optgroup label="── CBC Fleurs">{cbcData.filter(x => x.famille === "CBC" && x.type === "fleur").map(x => <option key={x.id} value={x.id}>{x.nom} — {fmtE(getPrix(x.id))}</option>)}</optgroup>
        <optgroup label="── CBC Résines">{cbcData.filter(x => x.famille === "CBC" && x.type === "résine").map(x => <option key={x.id} value={x.id}>{x.nom} — {fmtE(getPrix(x.id))}</option>)}</optgroup>
        <optgroup label="── CBD Fleurs">{cbcData.filter(x => x.famille === "CBD" && x.type === "fleur").map(x => <option key={x.id} value={x.id}>{x.nom} — {fmtE(getPrix(x.id))}</option>)}</optgroup>
        <optgroup label="── CBD Résines">{cbcData.filter(x => x.famille === "CBD" && x.type === "résine").map(x => <option key={x.id} value={x.id}>{x.nom} — {fmtE(getPrix(x.id))}</option>)}</optgroup>
      </>)}
    </select>
  );

  const btnSt = (color = "default") => ({
    fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
    borderRadius: "var(--border-radius-md)",
    border: color === "danger" ? "0.5px solid rgba(220,53,69,0.4)" : color === "warning" ? "0.5px solid rgba(255,152,0,0.4)" : color === "primary" ? "0.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
    background: color === "danger" ? "rgba(220,53,69,0.08)" : color === "warning" ? "rgba(255,152,0,0.10)" : "var(--color-background-secondary)",
    color: color === "danger" ? "#dc3545" : color === "warning" ? "#e65100" : "var(--color-text-secondary)",
  });

  return (
    <div>
      {showOuverture && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "2rem", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>☀️ Ouverture de caisse</div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: "1.5rem" }}>Saisissez le fond de départ</div>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Date d'ouverture</label>
            <input type="date" value={dateOuverture} onChange={e => setDateOuverture(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, color: "#111", background: "#fafafa" }} />
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Fond de caisse (€)</label>
            <input type="number" step="0.50" min="0" placeholder="Ex: 150.00" value={fondOuvertureSaisie}
              onChange={e => setFondOuvertureSaisie(e.target.value)} autoFocus
              style={{ width: "100%", padding: "10px 12px", fontSize: 18, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16, color: "#111", background: "#fafafa" }} />
            <button onClick={confirmerOuverture}
              style={{ width: "100%", padding: "12px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Ouvrir la caisse
            </button>
            <button onClick={() => setShowOuverture(false)}
              style={{ width: "100%", padding: "8px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888" }}>
              Passer
            </button>
          </div>
        </div>
      )}

      {showFermeture && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowFermeture(false)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: "1.5rem" }}>🌙 Fermeture de caisse</div>
            <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem", fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 0" }}>
                {[
                  ["Fond d'ouverture", fmtE(fondOuv)],
                  ["Heure d'ouverture", ouvertureToday?.heure || "—"],
                  ["1ère vente", premiereVente ? new Date(premiereVente.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"],
                  ["Dernière vente", derniereVente ? new Date(derniereVente.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"],
                  ["CA espèces", fmtE(caEspece)],
                  ["CA CB", fmtE(caCB)],
                  ["CA total", fmtE(caJour)],
                  ["Nb ventes", nbJour],
                  ["Théorique en caisse", fmtE(theorique)],
                ].map(([label, val]) => (
                  <React.Fragment key={label}>
                    <span style={{ color: "#666" }}>{label}</span>
                    <span style={{ textAlign: "right", fontWeight: 500, color: "#111" }}>{val}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Fond compté réel (€)</label>
            <input type="number" step="0.50" min="0" placeholder="Montant en caisse" value={fondFermetureSaisie}
              onChange={e => setFondFermetureSaisie(e.target.value)} autoFocus
              style={{ width: "100%", padding: "10px 12px", fontSize: 18, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, color: "#111", background: "#fafafa" }} />
            {ecart !== null && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 15,
                display: "flex", justifyContent: "space-between",
                background: Math.abs(ecart) < 0.5 ? "#e8f5e9" : ecart > 0 ? "#e3f2fd" : "#fdecea",
                color: Math.abs(ecart) < 0.5 ? "#2e7d32" : ecart > 0 ? "#1565c0" : "#c62828",
              }}>
                <span>Écart</span>
                <span>{ecart > 0 ? "+" : ""}{fmtE(ecart)} {Math.abs(ecart) < 0.5 ? "✓" : ecart > 0 ? "(excédent)" : "(manquant)"}</span>
              </div>
            )}
            <button onClick={confirmerFermeture} disabled={!fondFermetureSaisie}
              style={{ width: "100%", padding: "12px", background: fondFermetureSaisie ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: fondFermetureSaisie ? "pointer" : "default", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Clôturer la journée
            </button>
            <button onClick={() => setShowFermeture(false)}
              style={{ width: "100%", padding: "8px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13 }}>
          {ouvertureToday ? (
            <>
              <span style={{ fontWeight: 500 }}>☀️ Ouverte</span>
              <span style={{ color: "var(--color-text-secondary)", marginLeft: 6 }}>à {ouvertureToday.heure} — Fond: {fmtE(ouvertureToday.fond)}</span>
              {fermetureToday && <span style={{ color: "#e65100", marginLeft: 8 }}>· 🌙 Clôturée à {fermetureToday.heure}</span>}
            </>
          ) : (
            <span style={{ color: "var(--color-text-secondary)" }}>Caisse non ouverte aujourd'hui</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!ouvertureToday && <button onClick={() => setShowOuverture(true)} style={{ ...btnSt("primary"), fontWeight: 500 }}>☀️ Ouvrir</button>}
          {ouvertureToday && !fermetureToday && <button onClick={() => setShowFermeture(true)} style={{ ...btnSt("warning"), fontWeight: 500 }}>🌙 Fermer la caisse</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: "1.5rem" }}>
        {[
          { label: "CA aujourd'hui", val: fmtE(caJour) },
          { label: "CB", val: fmtE(caCB) },
          { label: "Espèce", val: fmtE(caEspece) },
          { label: "Nb ventes", val: nbJour },
          { label: "Ticket moyen", val: nbJour ? fmtE(caJour / nbJour) : "—" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>Nouvelle vente</div>
          <button onClick={exportCSV} style={btnSt()}>Export CSV</button>
        </div>
        <input placeholder="Nom client (facultatif)" value={nomClient} onChange={e => setNomClient(e.target.value)}
          style={{ width: "100%", padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, marginBottom: 10 }} />
        {lignes.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <Dropdown value={l.produit} onChange={v => updateLigne(i, "produit", v)} />
            <input type="number" min="1" step="1" value={l.qte} onChange={e => updateLigne(i, "qte", parseInt(e.target.value) || 1)}
              style={{ width: 55, padding: "6px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, textAlign: "center" }} />
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)", minWidth: 50, textAlign: "right" }}>
              {l.produit ? fmtE(getPrix(l.produit) * l.qte) : ""}
            </span>
            <button onClick={() => removeLigne(i)} disabled={lignes.length === 1}
              style={{ ...btnSt("danger"), opacity: lignes.length === 1 ? 0.3 : 1, padding: "5px 8px" }}>
              ✕
            </button>
          </div>
        ))}
        <button onClick={addLigne} style={{ fontSize: 13, color: "var(--color-text-secondary)", background: "none", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "6px 14px", cursor: "pointer", marginBottom: "1rem", width: "100%" }}>
          + Ajouter un produit
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <select value={paiement} onChange={e => { setPaiement(e.target.value); setEspeceDonnee(""); }}
            style={{ padding: "6px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }}>
            <option>CB</option><option>Espèce</option>
          </select>
          {paiement === "Espèce" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
              <input type="number" placeholder={`Donné (min ${fmtE(total)})`} value={espece_donnee}
                onChange={e => setEspeceDonnee(e.target.value)} min={total} step="0.50"
                style={{ flex: 1, padding: "6px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid " + (monnaie !== null && monnaie < 0 ? "#dc3545" : "var(--color-border-tertiary)"), background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />
              {monnaie !== null && (
                <div style={{ padding: "6px 14px", borderRadius: "var(--border-radius-md)", background: monnaie >= 0 ? "var(--color-background-success)" : "rgba(220,53,69,0.08)", color: monnaie >= 0 ? "var(--color-text-success)" : "#dc3545", fontWeight: 500, fontSize: 16, whiteSpace: "nowrap" }}>
                  {monnaie >= 0 ? `Rendu : ${fmtE(monnaie)}` : `Manque : ${fmtE(-monnaie)}`}
                </div>
              )}
            </div>
          )}
          <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 500 }}>{fmtE(total)}</span>
        </div>
        <button onClick={valider} disabled={!lignes.some(l => l.produit) || (paiement === "Espèce" && monnaie !== null && monnaie < 0)} style={{
          width: "100%", padding: "10px", borderRadius: "var(--border-radius-md)",
          background: saved ? "var(--color-background-success)" : lignes.some(l => l.produit) && !(paiement === "Espèce" && monnaie !== null && monnaie < 0) ? "var(--color-text-primary)" : "var(--color-background-secondary)",
          color: saved ? "var(--color-text-success)" : lignes.some(l => l.produit) ? "var(--color-background-primary)" : "var(--color-text-secondary)",
          border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, transition: "all 0.2s",
        }}>
          {saved ? <>Enregistré</> : "Valider la vente"}
        </button>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: "0.75rem" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>
            Historique des ventes
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setDateHistorique(todayStr)} style={{ fontSize: 11, padding: "3px 9px", border: "0.5px solid " + (dateHistorique === todayStr ? "var(--color-border-primary)" : "var(--color-border-tertiary)"), borderRadius: "var(--border-radius-md)", background: dateHistorique === todayStr ? "var(--color-background-secondary)" : "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>Aujourd'hui</button>
            <input type="date" value={dateHistorique} max={todayStr}
              onChange={e => setDateHistorique(e.target.value)}
              style={{ padding: "4px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
          </div>
        </div>
        {ventesHistorique.length > 0 ? (
          [...ventesHistorique].reverse().map(v => (
            <div key={v.id} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: v.rembourse ? "var(--color-background-secondary)" : "var(--color-background-primary)", opacity: v.rembourse ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  {v.nomClient && <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>👤 {v.nomClient}</div>}
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{new Date(v.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {v.items?.map((it, i) => (
                      <span key={i} style={{ padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 12, textDecoration: v.rembourse ? "line-through" : "" }}>
                        {it.qte}× {getNom(it.produit)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, textDecoration: v.rembourse ? "line-through" : "" }}>{fmtE(v.total)}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: v.paiement === "CB" ? "var(--color-background-info)" : "var(--color-background-success)", color: v.paiement === "CB" ? "var(--color-text-info)" : "var(--color-text-success)" }}>{v.paiement}</span>
                  {v.rembourse && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-warning)", color: "var(--color-text-warning)" }}>Remboursé</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => setShowFacture(v)} style={btnSt()}>Facture</button>
                {!v.rembourse && <button onClick={() => setEditVente({ ...v, items: [...v.items] })} style={btnSt("primary")}>Modifier</button>}
                {!v.rembourse && <button onClick={() => { if (window.confirm("Rembourser ?")) rembourserVente(v.id); }} style={btnSt("warning")}>Rembourser</button>}
                <button onClick={() => { if (window.confirm("Supprimer ?")) deleteVente(v.id); }} style={btnSt("danger")}>Suppr.</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)", fontSize: 13 }}>
            Aucune vente ce jour-là.
          </div>
        )}
      </div>

      {editVente && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setEditVente(null)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Modifier la vente</span>
              <button onClick={() => setEditVente(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
            </div>
            <input placeholder="Nom client (facultatif)" value={editVente.nomClient || ""} onChange={e => setEditVente({ ...editVente, nomClient: e.target.value })}
              style={{ width: "100%", padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 10, color: "#111", background: "#fafafa" }} />
            {editVente.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <Dropdown value={it.produit} onChange={v => { const a = [...editVente.items]; a[i] = { ...a[i], produit: v }; setEditVente({ ...editVente, items: a }); }} />
                <input type="number" min="1" value={it.qte} onChange={e => { const a = [...editVente.items]; a[i] = { ...a[i], qte: parseInt(e.target.value) || 1 }; setEditVente({ ...editVente, items: a }); }}
                  style={{ width: 55, padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, textAlign: "center", color: "#111" }} />
                <span style={{ minWidth: 50, textAlign: "right", fontSize: 13, color: "#888" }}>{fmtE(getPrix(it.produit) * it.qte)}</span>
                <button onClick={() => {
                  const reste = editVente.items.filter((_, j) => j !== i);
                  if (reste.length === 0) { if (window.confirm("Rembourser la vente ?")) { rembourserVente(editVente.id); setEditVente(null); } return; }
                  setEditVente({ ...editVente, items: reste });
                }} style={{ background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.3)", cursor: "pointer", color: "#dc3545", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={() => setEditVente({ ...editVente, items: [...editVente.items, { produit: "", qte: 1 }] })}
              style={{ fontSize: 13, color: "#888", background: "none", border: "1px dashed #ddd", borderRadius: 6, padding: "5px 14px", cursor: "pointer", marginBottom: "1rem", width: "100%" }}>
              + Ajouter un produit
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500, marginBottom: "1rem", fontSize: 14, color: "#111" }}>
              <span>Nouveau total</span>
              <span>{fmtE(editVente.items.reduce((s, it) => s + getPrix(it.produit) * it.qte, 0))}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => {
                const items = editVente.items.filter(it => it.produit);
                const newTotal = items.reduce((s, it) => s + getPrix(it.produit) * it.qte, 0);
                addVente({ ...editVente, items, total: newTotal, id: editVente.id, date: editVente.date });
                setEditVente(null);
              }} style={{ flex: 1, padding: "9px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Enregistrer</button>
              <button onClick={() => setEditVente(null)} style={{ padding: "9px 16px", background: "none", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#888" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showFacture && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowFacture(null)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "2rem", maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div><div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>Facture / Reçu</div><div style={{ fontSize: 12, color: "#666" }}>SAM — Café & CBD</div></div>
              <button onClick={() => setShowFacture(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
              <div>{new Date(showFacture.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
              <div>{new Date(showFacture.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
              {showFacture.nomClient && <div style={{ marginTop: 4, fontWeight: 600, color: "#111" }}>Client : {showFacture.nomClient}</div>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: "1rem" }}>
              <thead><tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "5px 0", fontWeight: 400, color: "#888" }}>Produit</th>
                <th style={{ textAlign: "center", padding: "5px 8px", fontWeight: 400, color: "#888" }}>Qté</th>
                <th style={{ textAlign: "right", padding: "5px 0", fontWeight: 400, color: "#888" }}>P.U.</th>
                <th style={{ textAlign: "right", padding: "5px 0", fontWeight: 400, color: "#888" }}>Total</th>
              </tr></thead>
              <tbody>
                {showFacture.items?.map((it, i) => {
                  const pu = getPrix(it.produit);
                  return (<tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px 0", color: "#111" }}>{getNom(it.produit)}</td>
                    <td style={{ textAlign: "center", padding: "8px 8px", color: "#111" }}>{it.qte}</td>
                    <td style={{ textAlign: "right", padding: "8px 0", color: "#888" }}>{pu}€</td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 600, color: "#111" }}>{fmtE(pu * it.qte)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
            <div style={{ borderTop: "2px solid #111", paddingTop: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#111" }}><span>Total</span><span>{fmtE(showFacture.total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}><span>Paiement</span><span>{showFacture.paiement}</span></div>
              {showFacture.paiement === "Espèce" && showFacture.espece_donnee > 0 && (<>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}><span>Donné</span><span>{fmtE(showFacture.espece_donnee)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#2e7d32", fontWeight: 500 }}><span>Rendu</span><span>{fmtE(showFacture.espece_donnee - showFacture.total)}</span></div>
              </>)}
              {showFacture.rembourse && <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "#e65100", fontWeight: 600 }}>⚠ Cette vente a été remboursée</div>}
            </div>
            <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: 11, color: "#888", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
              TVA non applicable — Article 293B du CGI
            </div>
            <button onClick={() => window.print()} style={{ marginTop: "1rem", width: "100%", padding: "10px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Imprimer / PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
