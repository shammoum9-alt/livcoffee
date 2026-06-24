import React, { useState } from "react";
import { fmtE, fmt } from "../utils/format";
import { FAM_COLORS } from "../constants/theme";
import { uploadFactureGoogleDrive } from "../services/dataService";

export default function CBC({ cbcData, setCbcData, achatsCBC, addAchatCBD, ventes }) {
  const familles = [...new Set(cbcData.map(p => p.famille))];
  const todayStr = new Date().toISOString().slice(0, 10);

  const getLastPrix = (id, type) => {
    const a = (achatsCBC || []).filter(x => x.produit_id === id).sort((a, b) => b.id - a.id)[0];
    if (!a) return null;
    return type === "achat" ? a.prix_achat : a.prix_vente;
  };

  // Quantité vendue cumulée de ce produit CBC, depuis le début (ventes réelles, hors suppressions)
  const getQuantiteVendue = (id) => {
    return (ventes || []).filter(v => !v.deleted).reduce((s, v) => {
      const qteLigne = (v.items || []).filter(it => it.produit === id).reduce((s2, it) => s2 + (parseFloat(it.qte) || 0), 0);
      return s + qteLigne;
    }, 0);
  };

  // Stock disponible = quantités achetées cumulées (historisées via "Modifier") − quantités vendues cumulées en Caisse
  const getStockCumule = (id) => {
    const achete = (achatsCBC || []).filter(x => x.produit_id === id).reduce((s, x) => s + (x.quantite || 0), 0);
    const vendu = getQuantiteVendue(id);
    return achete - vendu;
  };

  const [modalEdit, setModalEdit] = useState(null);
  const [factureFile, setFactureFile] = useState(null);
  const [showFactureModal, setShowFactureModal] = useState(null);
  const [modalNouveau, setModalNouveau] = useState(null);
  const factureInputRef = React.useRef(null);

  const openEdit = (p) => {
    setModalEdit({
      produit: p,
      prix_achat: (getLastPrix(p.id, "achat") ?? p.prix_achat).toString(),
      prix_vente: (getLastPrix(p.id, "vente") ?? p.prix_vente).toString(),
      quantite: "",
    });
    setFactureFile(null);
  };

  const ouvrirNouveau = (famille) => {
    setModalNouveau({ nom: "", famille, type: "fleur", taux: "", prix_achat: "", prix_vente: "" });
  };

  const creerProduit = () => {
    if (!modalNouveau || !modalNouveau.nom.trim()) return;
    const nouveau = {
      id: "cbc_" + Date.now(),
      nom: modalNouveau.nom.trim(),
      type: modalNouveau.type,
      taux: modalNouveau.taux,
      famille: modalNouveau.famille,
      poids: 1,
      prix_achat: parseFloat(modalNouveau.prix_achat) || 0,
      prix_vente: parseFloat(modalNouveau.prix_vente) || 0,
    };
    setCbcData(prev => [...prev, nouveau]);
    setModalNouveau(null);
  };

  const supprimerProduit = (p) => {
    if (!window.confirm(`Supprimer définitivement "${p.nom}" ? L'historique des achats associés sera conservé mais ne pourra plus être consulté depuis cette liste.`)) return;
    setCbcData(prev => prev.filter(x => x.id !== p.id));
  };

  const handleFactureSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFactureFile(file);
  };

  const validerPrix = async () => {
    if (!modalEdit) return;
    const p = modalEdit.produit;
    const nouvelAchat = {
      produit_id: p.id,
      prix_achat: parseFloat(modalEdit.prix_achat) || p.prix_achat,
      prix_vente: parseFloat(modalEdit.prix_vente) || p.prix_vente,
      quantite: parseFloat(modalEdit.quantite) || 0,
      date: todayStr,
      facture_nom: factureFile ? factureFile.name : null,
    };

    if (factureFile) {
      try {
        const mois = todayStr.slice(0, 7);
        const fileName = "facture_CBD_" + todayStr + "_" + factureFile.name;
        await uploadFactureGoogleDrive(factureFile, mois, fileName);
      } catch (err) {
        // L'upload de facture est secondaire : on n'empêche pas l'enregistrement de l'achat si Drive échoue.
      }
    }

    await addAchatCBD(nouvelAchat);
    setModalEdit(null);
    setFactureFile(null);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
        Tableau des produits CBC/CBD. Cliquez sur "Modifier" pour historiser un nouveau prix et/ou une quantité achetée.
      </div>

      {modalEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setModalEdit(null)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{modalEdit.produit.nom}</span>
              <button onClick={() => setModalEdit(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
            </div>

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Prix d'achat (€)</label>
            <input type="number" step="0.01" value={modalEdit.prix_achat}
              onChange={e => setModalEdit({ ...modalEdit, prix_achat: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 10, color: "#111", background: "#fafafa" }} />

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Prix de vente (€)</label>
            <input type="number" step="0.01" value={modalEdit.prix_vente}
              onChange={e => setModalEdit({ ...modalEdit, prix_vente: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 10, color: "#111", background: "#fafafa" }} />

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Quantité achetée (facultatif)</label>
            <input type="number" step="1" placeholder="0" value={modalEdit.quantite}
              onChange={e => setModalEdit({ ...modalEdit, quantite: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, color: "#111", background: "#fafafa" }} />

            <input ref={factureInputRef} type="file" accept="image/*,application/pdf" onChange={handleFactureSelect} style={{ display: "none" }} />
            <button onClick={() => factureInputRef.current?.click()}
              style={{ width: "100%", padding: "9px", background: factureFile ? "rgba(46,125,50,0.06)" : "none", border: "1px dashed " + (factureFile ? "#2e7d32" : "#ccc"), borderRadius: 8, cursor: "pointer", fontSize: 13, color: factureFile ? "#2e7d32" : "#666", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📎 {factureFile ? factureFile.name : "Joindre une facture (facultatif)"}
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={validerPrix}
                style={{ flex: 1, padding: "10px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                Valider
              </button>
              <button onClick={() => setModalEdit(null)}
                style={{ padding: "10px 16px", background: "none", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#888" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showFactureModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowFactureModal(null)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Historique des achats</span>
              <button onClick={() => setShowFactureModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {(achatsCBC || []).filter(a => a.produit_id === showFactureModal.id).sort((a, b) => b.id - a.id).map(a => (
                <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>{a.date}</span>
                    <span style={{ fontWeight: 500 }}>{fmtE(a.prix_achat)} → {fmtE(a.prix_vente)}</span>
                  </div>
                  {a.quantite > 0 && <div style={{ color: "#888", fontSize: 12 }}>Qté: {a.quantite}</div>}
                  {a.facture_nom && <div style={{ color: "#2e7d32", fontSize: 12 }}>📎 {a.facture_nom}</div>}
                </div>
              ))}
              {(achatsCBC || []).filter(a => a.produit_id === showFactureModal.id).length === 0 && (
                <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>Aucun achat historisé.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalNouveau && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setModalNouveau(null)}>
          <div style={{ background: "#ffffff", color: "#111", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Nouveau produit {modalNouveau.famille}</span>
              <button onClick={() => setModalNouveau(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
            </div>

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Nom du produit</label>
            <input value={modalNouveau.nom} onChange={e => setModalNouveau({ ...modalNouveau, nom: e.target.value })}
              placeholder={`Ex: ${modalNouveau.famille} Fleur 15%`} autoFocus
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 10, color: "#111", background: "#fafafa" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Type</label>
                <select value={modalNouveau.type} onChange={e => setModalNouveau({ ...modalNouveau, type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, color: "#111", background: "#fafafa" }}>
                  <option value="fleur">Fleur</option>
                  <option value="résine">Résine</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Taux (%)</label>
                <input value={modalNouveau.taux} onChange={e => setModalNouveau({ ...modalNouveau, taux: e.target.value })}
                  placeholder="Ex: 15%"
                  style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, color: "#111", background: "#fafafa" }} />
              </div>
            </div>

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Prix d'achat (€)</label>
            <input type="number" step="0.01" value={modalNouveau.prix_achat}
              onChange={e => setModalNouveau({ ...modalNouveau, prix_achat: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 10, color: "#111", background: "#fafafa" }} />

            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Prix de vente (€)</label>
            <input type="number" step="0.01" value={modalNouveau.prix_vente}
              onChange={e => setModalNouveau({ ...modalNouveau, prix_vente: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #ddd", borderRadius: 8, marginBottom: 14, color: "#111", background: "#fafafa" }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={creerProduit} disabled={!modalNouveau.nom.trim()}
                style={{ flex: 1, padding: "10px", background: modalNouveau.nom.trim() ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: modalNouveau.nom.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}>
                Créer
              </button>
              <button onClick={() => setModalNouveau(null)}
                style={{ padding: "10px 16px", background: "none", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#888" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {familles.map(fam => (
        <div key={fam} style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ padding: "3px 12px", borderRadius: "var(--border-radius-md)", background: FAM_COLORS[fam]?.bg || "#EEE", color: FAM_COLORS[fam]?.fg || "#333", fontSize: 12, fontWeight: 500 }}>{fam}</span>
            <button onClick={() => ouvrirNouveau(fam)} style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
              + Ajouter
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {["Produit", "Stock cumulé", "Achat actuel", "Vente actuelle", "Marge", "Facture", "", ""].map((h, i) => (
                  <th key={h + i} style={{ textAlign: h === "Produit" ? "left" : "right", padding: "6px 8px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cbcData.filter(p => p.famille === fam).map(p => {
                const prixAchatActuel = getLastPrix(p.id, "achat") ?? p.prix_achat;
                const prixVenteActuel = getLastPrix(p.id, "vente") ?? p.prix_vente;
                const marge = prixVenteActuel > 0 ? (prixVenteActuel - prixAchatActuel) / prixVenteActuel * 100 : 0;
                const stock = getStockCumule(p.id);
                return (
                  <tr key={p.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 400 }}>{p.nom}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px", color: stock > 0 ? "#2e7d32" : stock < 0 ? "#dc3545" : "var(--color-text-secondary)", fontWeight: stock !== 0 ? 500 : 400 }}>
                      {stock !== 0 ? stock : "—"}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 8px", color: "var(--color-text-secondary)" }}>{fmtE(prixAchatActuel)}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px", fontWeight: 500 }}>{fmtE(prixVenteActuel)}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px", color: marge > 50 ? "var(--color-text-success)" : "var(--color-text-warning)" }}>{fmt(marge, 0)}%</td>
                    <td style={{ textAlign: "right", padding: "6px 4px" }}>
                      <button onClick={() => setShowFactureModal(p)}
                        style={{ padding: "5px 10px", background: "none", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 11 }}>
                        📎
                      </button>
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 4px" }}>
                      <button onClick={() => openEdit(p)}
                        style={{ padding: "5px 12px", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 12 }}>
                        Modifier
                      </button>
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 4px" }}>
                      <button onClick={() => supprimerProduit(p)}
                        style={{ padding: "5px 10px", background: "rgba(220,53,69,0.06)", color: "#dc3545", border: "0.5px solid rgba(220,53,69,0.3)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 11 }}>
                        Suppr.
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
        Le prix saisi via "Modifier" devient le prix actif partout (caisse, marges) — l'historique complet est conservé.
      </div>
    </div>
  );
}
