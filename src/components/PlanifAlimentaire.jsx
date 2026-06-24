import React, { useState } from "react";
import { fmt, fmtE } from "../utils/format";
import { uploadFactureGoogleDrive } from "../services/dataService";

export default function PlanifAlimentaire({ produits, nbres, setNbres, achats, addAchatsIngredients, addCourse, ventes }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = React.useRef(null);

  const [coursesSession, setCoursesSession] = useState(() => {
    const map = {};
    produits.forEach(p => p.ingredients.forEach(ing => {
      if (!map[ing.n]) map[ing.n] = { checked: false, prix_reel: "", unite: ing.u, pu_ref: ing.pu, pu_max: ing.pu_max || 0 };
    }));
    return map;
  });

  const venduAujourd = {};
  (ventes || []).filter(v => !v.deleted && !v.rembourse && v.date && v.date.startsWith(todayStr))
    .forEach(v => v.items?.forEach(it => {
      venduAujourd[it.produit] = (venduAujourd[it.produit] || 0) + it.qte;
    }));

  const totalProduits = Object.values(nbres).reduce((s, v) => s + v, 0);

  const coursesMap = {};
  produits.forEach(p => {
    const n = nbres[p.id] || 0;
    if (n <= 0) return;
    const factor = p.nbre_par_fournee > 0 ? n / p.nbre_par_fournee : n;
    p.ingredients.forEach(ing => {
      const key = ing.n;
      if (!coursesMap[key]) coursesMap[key] = { qte: 0, unite: ing.u, pu: ing.pu, pu_max: ing.pu_max || 0 };
      coursesMap[key].qte += ing.q * factor;
    });
    if (p.feuille_brick) {
      if (!coursesMap["Feuille brick"]) coursesMap["Feuille brick"] = { qte: 0, unite: "unit", pu: 0.1, pu_max: 0.15 };
      coursesMap["Feuille brick"].qte += n / 2;
    }
  });
  const emb = totalProduits / 8;
  if (!coursesMap["Serviette"]) coursesMap["Serviette"] = { qte: 0, unite: "unit", pu: 0.015, pu_max: 0.02 };
  coursesMap["Serviette"].qte += emb;
  if (!coursesMap["Barquette"]) coursesMap["Barquette"] = { qte: 0, unite: "unit", pu: 0.07, pu_max: 0.10 };
  coursesMap["Barquette"].qte += emb;

  const totalCoursesTh = Object.values(coursesMap).reduce((s, v) => s + v.qte * v.pu, 0);

  const getLastPrix = (nom) => {
    const a = (achats || []).filter(x => x.ingredient === nom).sort((a, b) => b.id - a.id)[0];
    return a ? a.prix_unitaire : null;
  };

  // Quantité totale vendue de chaque produit, depuis le début (ventes réelles, hors suppressions)
  const quantitesVenduesParProduit = {};
  (ventes || []).filter(v => !v.deleted).forEach(v => {
    (v.items || []).forEach(it => {
      quantitesVenduesParProduit[it.produit] = (quantitesVenduesParProduit[it.produit] || 0) + (parseFloat(it.qte) || 0);
    });
  });

  // Consommation réelle d'un ingrédient = somme, sur tous les produits vendus, de (qté vendue / pièces par fournée) × qté ingrédient par fournée
  const getConsommationReelle = (nomIngredient) => {
    let total = 0;
    produits.forEach(p => {
      const qteVendue = quantitesVenduesParProduit[p.id] || 0;
      if (qteVendue <= 0) return;
      const factor = p.nbre_par_fournee > 0 ? qteVendue / p.nbre_par_fournee : qteVendue;
      const ing = p.ingredients.find(i => i.n === nomIngredient);
      if (ing) total += ing.q * factor;
      if (p.feuille_brick && nomIngredient === "Feuille brick") total += qteVendue / 2;
    });
    return total;
  };

  // Stock disponible = total acheté (cumulé depuis toujours) − total consommé (déduit des ventes réelles depuis toujours)
  const getStockAchete = (nom) => {
    const acheteCumule = (achats || []).filter(x => x.ingredient === nom).reduce((s, x) => s + x.qte_achetee, 0);
    const consomme = getConsommationReelle(nom);
    return acheteCumule - consomme;
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadMsg(null);
    try {
      const mois = todayStr.slice(0, 7);
      const fileName = "facture_" + todayStr + "_" + file.name;
      const success = await uploadFactureGoogleDrive(file, mois, fileName);
      setUploadMsg(success ? "✅ Facture envoyée dans CBD Flandres/" + mois + "/" : "❌ Erreur lors de l'envoi au Drive");
    } catch (err) {
      setUploadMsg("❌ " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const validerAchats = async () => {
    const coches = Object.entries(coursesSession).filter(([, v]) => v.checked && v.prix_reel);
    if (!coches.length) return;
    const getQteReelle = (nom, v) => {
      const saisie = parseFloat(v.qte_reelle);
      return !isNaN(saisie) ? saisie : (coursesMap[nom]?.qte || 0);
    };
    const nouveauxAchats = coches.map(([nom, v]) => ({
      id: Date.now() + Math.random(),
      ingredient: nom,
      prix_unitaire: parseFloat(v.prix_reel) || 0,
      unite: v.unite,
      date: todayStr,
      qte_achetee: getQteReelle(nom, v),
    }));
    const totalReel = coches.reduce((acc, [nom, v]) =>
      acc + (parseFloat(v.prix_reel) || 0) * getQteReelle(nom, v), 0);

    await addAchatsIngredients(nouveauxAchats);
    await addCourse({
      date: new Date().toLocaleDateString("fr-FR"),
      commercant: "Courses du " + new Date().toLocaleDateString("fr-FR"),
      montant: totalReel.toFixed(2),
      mois: new Date().getMonth(),
    });
    setCoursesSession(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { next[k] = { ...v, checked: false, prix_reel: "", qte_reelle: undefined }; });
      return next;
    });
    alert(nouveauxAchats.length + " achats enregistrés — Total réel : " + totalReel.toFixed(2) + "€");
  };

  const cats = [...new Set(produits.map(p => p.categorie))];
  const alerteCount = Object.entries(coursesSession).filter(([nom, v]) => {
    const pu_max = coursesMap[nom]?.pu_max || 0;
    return v.checked && v.prix_reel && pu_max > 0 && parseFloat(v.prix_reel) > pu_max;
  }).length;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>Quantités souhaitées</div>
        {cats.map(cat => (
          <div key={cat} style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
              {produits.filter(p => p.categorie === cat).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)" }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{p.nom}</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <input type="number" min="0" step="1" value={nbres[p.id] || 0}
                      onChange={e => setNbres(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      style={{ width: 55, padding: "4px 6px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "center" }} />
                    {(() => {
                      const prevu = nbres[p.id] || 0;
                      const vendu = venduAujourd[p.id] || 0;
                      const restant = prevu - vendu;
                      if (prevu === 0) return null;
                      return (
                        <span style={{ fontSize: 10, fontWeight: 500, color: restant <= 0 ? "#dc3545" : restant < prevu ? "#e65100" : "#dc3545" }}>
                          {restant <= 0 ? "✓ tout vendu" : "→ " + restant + " restants"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>🛒 Courses du jour</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Cochez et saisissez le prix réel payé par unité</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleUpload} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ fontSize: 12, padding: "5px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
              {uploading ? "Envoi..." : "📎 Déposer facture"}
            </button>
          </div>
        </div>

        {uploadMsg && (
          <div style={{
            padding: "7px 12px", borderRadius: "var(--border-radius-md)", marginBottom: 12, fontSize: 12,
            background: uploadMsg.startsWith("✅") ? "rgba(46,125,50,0.07)" : "rgba(220,53,69,0.07)",
            color: uploadMsg.startsWith("✅") ? "#2e7d32" : "#dc3545",
            border: "0.5px solid " + (uploadMsg.startsWith("✅") ? "rgba(46,125,50,0.3)" : "rgba(220,53,69,0.3)"),
          }}>
            {uploadMsg}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <th style={{ padding: "7px 8px", width: 32 }}></th>
                <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 500 }}>Ingrédient</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 11 }}>Besoin</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 400, color: "#2e7d32", fontSize: 11 }}>Stock dispo</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, fontSize: 11 }}>À acheter</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 11 }}>Réf.</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 400, color: "#dc3545", fontSize: 11 }}>Max</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 11 }}>Dernier</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, fontSize: 12 }}>Qté réelle</th>
                <th style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, fontSize: 12 }}>Prix réel /u</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(coursesMap).sort((a, b) => a[0].localeCompare(b[0])).map(([nom, v]) => {
                const sess = coursesSession[nom] || { checked: false, prix_reel: "", unite: v.unite, pu_ref: v.pu, pu_max: v.pu_max };
                const prixReel = parseFloat(sess.prix_reel) || 0;
                const lastPrix = getLastPrix(nom);
                const depasse = sess.prix_reel && v.pu_max > 0 && prixReel > v.pu_max;
                const perim = nom.toLowerCase().includes("viande") || nom.toLowerCase().includes("poulet") || nom.toLowerCase().includes("framboise") ? "🔴" :
                  nom.toLowerCase().includes("lait") || nom.toLowerCase().includes("oeuf") ? "🟡" : "🟢";
                return (
                  <tr key={nom} style={{
                    borderBottom: "0.5px solid var(--color-border-tertiary)",
                    background: depasse ? "rgba(220,53,69,0.04)" : sess.checked ? "rgba(46,125,50,0.02)" : "transparent",
                    transition: "background 0.15s",
                  }}>
                    <td style={{ padding: "7px 8px", textAlign: "center" }}>
                      <input type="checkbox" checked={!!sess.checked}
                        onChange={e => setCoursesSession(prev => {
                          const checked = e.target.checked;
                          const current = prev[nom] || sess;
                          // Au moment de cocher, on pré-remplit la quantité réelle avec le besoin théorique calculé,
                          // mais elle reste modifiable juste après (cas : acheter plus/moins que prévu).
                          return {
                            ...prev,
                            [nom]: {
                              ...current,
                              checked,
                              qte_reelle: checked && (current.qte_reelle === undefined || current.qte_reelle === "")
                                ? v.qte
                                : current.qte_reelle,
                            },
                          };
                        })}
                        style={{ width: 16, height: 16, cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "7px 8px", fontWeight: sess.checked ? 500 : 400 }}>
                      <span style={{ marginRight: 5 }}>{perim}</span>{nom}
                    </td>
                    {(() => {
                      const stockDispo = getStockAchete(nom);
                      const aAcheter = Math.max(0, v.qte - Math.max(0, stockDispo));
                      return (<>
                        <td style={{ textAlign: "right", padding: "7px 8px", color: "var(--color-text-secondary)", fontSize: 12 }}>
                          {fmt(v.qte, 2)} {v.unite}
                        </td>
                        <td style={{ textAlign: "right", padding: "7px 8px", fontSize: 12, color: stockDispo > 0 ? "#2e7d32" : stockDispo < 0 ? "#dc3545" : "var(--color-text-secondary)", fontWeight: stockDispo !== 0 ? 500 : 400 }}>
                          {fmt(stockDispo, 2) + " " + v.unite}
                        </td>
                        <td style={{ textAlign: "right", padding: "7px 8px", fontSize: 12, fontWeight: aAcheter > 0 ? 500 : 400, color: aAcheter === 0 ? "#2e7d32" : "#e65100" }}>
                          {aAcheter === 0 ? "✓ OK" : fmt(aAcheter, 2) + " " + v.unite}
                        </td>
                      </>);
                    })()}
                    <td style={{ textAlign: "right", padding: "7px 8px", color: "var(--color-text-secondary)", fontSize: 12 }}>{v.pu}€</td>
                    <td style={{ textAlign: "right", padding: "7px 8px", fontSize: 12, fontWeight: v.pu_max > 0 ? 500 : 400, color: v.pu_max > 0 ? "#dc3545" : "var(--color-text-secondary)" }}>
                      {v.pu_max > 0 ? v.pu_max + "€" : "—"}
                    </td>
                    <td style={{ textAlign: "right", padding: "7px 8px", fontSize: 12 }}>
                      {lastPrix
                        ? <span style={{ color: v.pu_max > 0 && lastPrix > v.pu_max ? "#dc3545" : lastPrix > v.pu ? "#e65100" : "#2e7d32", fontWeight: 500 }}>{lastPrix}€</span>
                        : <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
                    </td>
                    <td style={{ padding: "7px 4px", textAlign: "right" }}>
                      {sess.checked && (
                        <input type="number" step="0.01" min="0"
                          value={sess.qte_reelle !== undefined ? sess.qte_reelle : v.qte}
                          onChange={e => setCoursesSession(prev => ({ ...prev, [nom]: { ...(prev[nom] || sess), qte_reelle: e.target.value } }))}
                          style={{
                            width: 64, padding: "4px 6px", textAlign: "right", fontSize: 13,
                            border: "0.5px solid var(--color-border-tertiary)",
                            borderRadius: "var(--border-radius-md)",
                            background: "var(--color-background-primary)",
                            color: "var(--color-text-primary)",
                          }} />
                      )}
                    </td>
                    <td style={{ padding: "7px 4px", textAlign: "right" }}>
                      {sess.checked && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                          <input type="number" step="0.01" min="0" placeholder="0.00"
                            value={sess.prix_reel}
                            onChange={e => setCoursesSession(prev => ({ ...prev, [nom]: { ...(prev[nom] || sess), prix_reel: e.target.value } }))}
                            style={{
                              width: 72, padding: "4px 6px", textAlign: "right", fontSize: 13,
                              border: "0.5px solid " + (depasse ? "#dc3545" : "var(--color-border-tertiary)"),
                              borderRadius: "var(--border-radius-md)",
                              background: depasse ? "rgba(220,53,69,0.05)" : "var(--color-background-primary)",
                              color: depasse ? "#dc3545" : "var(--color-text-primary)",
                            }} />
                          {depasse && <span style={{ fontSize: 10, color: "#dc3545", whiteSpace: "nowrap", fontWeight: 600 }}>
                            ⚠ +{((prixReel / v.pu_max - 1) * 100).toFixed(0)}%
                          </span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {Object.values(coursesSession).some(v => v.checked) && (
          <div style={{ marginTop: "1rem", padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{Object.values(coursesSession).filter(v => v.checked).length} articles cochés</span>
              {alerteCount > 0 && <span style={{ marginLeft: 10, fontSize: 12, color: "#dc3545" }}>⚠ {alerteCount} prix au-dessus du seuil max</span>}
            </div>
            <button onClick={validerAchats}
              style={{ padding: "8px 20px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Valider les achats
            </button>
          </div>
        )}
      </div>

      {(() => {
        const valeurStockDispo = Object.keys(coursesMap).reduce((s, nom) => {
          const stock = getStockAchete(nom);
          return s + (stock > 0 ? stock * (coursesMap[nom].pu || 0) : 0);
        }, 0);
        const aCompleter = Object.keys(coursesMap).filter(nom => Math.max(0, getStockAchete(nom)) < coursesMap[nom].qte).length;
        if (Object.keys(coursesMap).length === 0) return null;
        return (
          <div style={{ background: "rgba(46,125,50,0.06)", border: "0.5px solid rgba(46,125,50,0.3)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: "1rem", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
            <span>📦 <strong>{fmtE(valeurStockDispo)}</strong> de stock disponible (valeur)</span>
            {aCompleter > 0 && <span style={{ color: "#e65100" }}>⏳ <strong>{aCompleter}</strong> ingrédient{aCompleter > 1 ? "s" : ""} à acheter pour couvrir le besoin du jour</span>}
            {aCompleter === 0 && <span style={{ color: "#2e7d32", fontWeight: 500 }}>🎉 Stock suffisant pour le besoin du jour !</span>}
          </div>
        );
      })()}

      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>
        Liste théorique — {fmtE(totalCoursesTh)}
      </div>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Ingrédient", "Quantité", "Unité", "Prix réf.", "Total", "Périm."].map(h => (
              <th key={h} style={{ textAlign: h === "Ingrédient" ? "left" : "right", padding: "4px 8px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(coursesMap).sort((a, b) => a[0].localeCompare(b[0])).map(([nom, v]) => (
            <tr key={nom} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <td style={{ padding: "6px 8px" }}>{nom}</td>
              <td style={{ textAlign: "right", padding: "6px 8px" }}>{fmt(v.qte, 3)}</td>
              <td style={{ textAlign: "right", padding: "6px 8px", color: "var(--color-text-secondary)" }}>{v.unite}</td>
              <td style={{ textAlign: "right", padding: "6px 8px", color: "var(--color-text-secondary)" }}>{v.pu}€</td>
              <td style={{ textAlign: "right", padding: "6px 8px", fontWeight: 500 }}>{fmtE(v.qte * v.pu)}</td>
              <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 11 }}>
                {nom.toLowerCase().includes("viande") || nom.toLowerCase().includes("poulet") || nom.toLowerCase().includes("framboise") ? "🔴" :
                  nom.toLowerCase().includes("lait") || nom.toLowerCase().includes("oeuf") ? "🟡" : "🟢"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
