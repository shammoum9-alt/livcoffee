import React, { useState } from "react";
import { fmt, fmtE } from "../utils/format";
import { calcCR } from "../utils/calculs";
import { CAT_COLOR, CAT_BG, ALLERGENES_MAP } from "../constants/theme";

const CAT_LABELS = { sam: "Les Sams", sucre: "Sucrés", sandwich: "Sandwichs", boisson: "Boissons" };

export default function Recettes({ produits, setProduits, nbres, achats }) {
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  const p = selected ? produits.find(x => x.id === selected) : null;
  const cr = p ? calcCR(p) : 0;

  const startEdit = () => { setEditData(JSON.parse(JSON.stringify(p))); setEditing(true); };
  const saveEdit = () => { setProduits(prev => prev.map(x => x.id === editData.id ? editData : x)); setEditing(false); };

  const cats = [...new Set(produits.map(p => p.categorie))];

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "260px 1fr" : "1fr", gap: "1.5rem" }}>
      <div>
        {cats.map(cat => (
          <div key={cat} style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, padding: "4px 0", marginBottom: 4 }}>{CAT_LABELS[cat] || cat}</div>
            {produits.filter(x => x.categorie === cat).map(prod => (
              <button key={prod.id} onClick={() => { setSelected(prod.id); setEditing(false); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                border: "0.5px solid " + (selected === prod.id ? "var(--color-border-primary)" : "var(--color-border-tertiary)"),
                borderRadius: "var(--border-radius-md)", marginBottom: 4, cursor: "pointer",
                background: selected === prod.id ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                color: "var(--color-text-primary)", fontSize: 13,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{prod.nom}</span>
                  <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{prod.prix}€</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  CR: {fmtE(calcCR(prod))} — marge: {fmt((1 - calcCR(prod) / prod.prix) * 100, 0)}%
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {p && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{p.nom}</h2>
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: CAT_BG[p.categorie], color: CAT_COLOR[p.categorie], fontWeight: 500 }}>{p.categorie}</span>
            </div>
            <button onClick={startEdit} style={{ border: "0.5px solid var(--color-border-tertiary)", background: "none", cursor: "pointer", padding: "6px 12px", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Modifier
            </button>
          </div>

          {!editing ? (
            <>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500 }}>
                RECETTE DE BASE — 1 fournée de {p.nbre_par_fournee} pièce{p.nbre_par_fournee > 1 ? "s" : ""}
              </div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <th style={{ textAlign: "left", padding: "4px 0", color: "var(--color-text-secondary)", fontWeight: 400 }}>Ingrédient</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--color-text-secondary)", fontWeight: 400 }}>Qté</th>
                    <th style={{ textAlign: "right", padding: "4px 0", color: "var(--color-text-secondary)", fontWeight: 400 }}>Unité</th>
                    <th style={{ textAlign: "right", padding: "4px 0", color: "var(--color-text-secondary)", fontWeight: 400 }}>Prix/u</th>
                    <th style={{ textAlign: "right", padding: "4px 0", color: "var(--color-text-secondary)", fontWeight: 400 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {p.ingredients.map((ing, i) => (
                    <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "6px 0" }}>{ing.n}</td>
                      <td style={{ textAlign: "right", padding: "6px 8px" }}>{ing.q}</td>
                      <td style={{ textAlign: "right", padding: "6px 0", color: "var(--color-text-secondary)" }}>{ing.u}</td>
                      <td style={{ textAlign: "right", padding: "6px 0", color: "var(--color-text-secondary)" }}>{ing.pu}€</td>
                      <td style={{ textAlign: "right", padding: "6px 0", fontWeight: 400 }}>{fmtE(ing.q * ing.pu)}</td>
                    </tr>
                  ))}
                  {p.feuille_brick && (
                    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "6px 0", color: "var(--color-text-secondary)" }}>Feuille brick <span style={{ fontSize: 11 }}>(1/Sam, 0.1€÷2)</span></td>
                      <td style={{ textAlign: "right", padding: "6px 8px" }}>{p.nbre_par_fournee}</td>
                      <td style={{ textAlign: "right", padding: "6px 0", color: "var(--color-text-secondary)" }}>feuilles</td>
                      <td style={{ textAlign: "right", padding: "6px 0", color: "var(--color-text-secondary)" }}>0.05€</td>
                      <td style={{ textAlign: "right", padding: "6px 0" }}>{fmtE(p.nbre_par_fournee * 0.05)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(() => {
                const crReel = p.ingredients.reduce((s, ing) => {
                  const dernier = (achats || []).filter(a => a.ingredient === ing.n).sort((a, b) => b.id - a.id)[0];
                  const prixReel = dernier ? dernier.prix_unitaire : ing.pu;
                  const qteUnit = p.nbre_par_fournee > 1 ? ing.q / p.nbre_par_fournee : ing.q;
                  return s + qteUnit * prixReel;
                }, 0) + (p.feuille_brick ? 0.05 : 0);
                const margeReel = (1 - crReel / p.prix) * 100;
                const hasRealData = (achats || []).some(a => p.ingredients.some(i => i.n === a.ingredient));
                return (
                  <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {p.nbre_par_fournee > 1 && <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Par fournée</div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{p.nbre_par_fournee} pièces</div>
                    </div>}
                    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>CR théorique</div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{fmtE(cr)}</div>
                    </div>
                    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Marge théorique</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-success)" }}>{fmt((1 - cr / p.prix) * 100, 0)}%</div>
                    </div>
                    <div style={{ background: hasRealData ? (margeReel < 20 ? "rgba(220,53,69,0.08)" : margeReel < 35 ? "rgba(255,152,0,0.08)" : "rgba(46,125,50,0.08)") : "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", border: hasRealData ? (margeReel < 20 ? "1px solid rgba(220,53,69,0.3)" : margeReel < 35 ? "1px solid rgba(255,152,0,0.3)" : "none") : "none" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Marge réelle {hasRealData ? "" : "(pas d'achat)"}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: hasRealData ? (margeReel < 20 ? "#dc3545" : margeReel < 35 ? "#e65100" : "#2e7d32") : "var(--color-text-secondary)" }}>
                        {hasRealData ? `${fmt(margeReel, 0)}%` : "—"}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const n = (nbres && nbres[p.id]) || 0;
                const factor = p.nbre_par_fournee > 1 ? n / p.nbre_par_fournee : n;
                const fournees = p.nbre_par_fournee > 1 ? Math.ceil(n / p.nbre_par_fournee) : null;
                const totalMatieres = p.ingredients.reduce((s, i) => s + i.q * factor * i.pu, 0) + (p.feuille_brick ? n * 0.05 : 0);
                return (
                  <div style={{ marginTop: "1rem", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
                    <div style={{ background: "var(--color-text-primary)", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-background-primary)" }}>Courses pour production</span>
                      <span style={{ fontSize: 12, color: "var(--color-background-secondary)" }}>
                        {n > 0 ? `${n} pièces${fournees ? ` — ${fournees} fournée${fournees > 1 ? "s" : ""}` : ""}` : "→ Saisir dans Stock & Achats"}
                      </span>
                    </div>
                    {n > 0 ? (
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                            <th style={{ textAlign: "left", padding: "6px 12px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 11 }}>Ingrédient</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 11 }}>Quantité à préparer</th>
                            <th style={{ textAlign: "right", padding: "6px 12px", color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 11 }}>Coût</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.ingredients.map((ing, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                              <td style={{ padding: "7px 12px" }}>{ing.n}</td>
                              <td style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>
                                {fmt(ing.q * factor, ing.u === "unit" ? 1 : 3)} {ing.u}
                              </td>
                              <td style={{ textAlign: "right", padding: "7px 12px", color: "var(--color-text-secondary)" }}>{fmtE(ing.q * factor * ing.pu)}</td>
                            </tr>
                          ))}
                          {p.feuille_brick && (
                            <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                              <td style={{ padding: "7px 12px" }}>Feuille brick <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>(1/Sam, découpée en 2)</span></td>
                              <td style={{ textAlign: "right", padding: "7px 8px", fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>{fmt(n, 0)} feuilles</td>
                              <td style={{ textAlign: "right", padding: "7px 12px", color: "var(--color-text-secondary)" }}>{fmtE(n * 0.05)}</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "var(--color-background-secondary)" }}>
                            <td style={{ padding: "7px 12px", fontSize: 12, fontWeight: 500 }}>Total matières</td>
                            <td />
                            <td style={{ textAlign: "right", padding: "7px 12px", fontWeight: 500 }}>{fmtE(totalMatieres)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div style={{ padding: "1rem 12px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
                        Va dans <strong>Stock & Achats</strong> et saisis le nombre souhaité — les quantités apparaîtront ici.
                      </div>
                    )}
                  </div>
                );
              })()}
              {p.allergenes?.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Allergènes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {p.allergenes.map(a => (
                      <span key={a} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-warning)", color: "var(--color-text-warning)" }}>{ALLERGENES_MAP[a] || a}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Prix de vente (€)</label>
                  <input type="number" step="0.1" value={editData.prix}
                    onChange={e => setEditData({ ...editData, prix: parseFloat(e.target.value) || 0 })}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
                </div>
                {editData.nbre_par_fournee > 1 && <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Pièces / fournée</label>
                  <input type="number" step="1" value={editData.nbre_par_fournee}
                    onChange={e => setEditData({ ...editData, nbre_par_fournee: parseInt(e.target.value) || 1 })}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
                </div>}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ingrédients</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 70px 70px 24px", gap: 4, marginBottom: 4 }}>
                {["Nom", "Qté", "Unité", "Prix réf.", "Prix max", ""].map(h => (
                  <div key={h} style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</div>
                ))}
              </div>
              {editData.ingredients.map((ing, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 70px 70px 24px", gap: 4, marginBottom: 2, alignItems: "center" }}>
                    <input value={ing.n} onChange={e => { const a = [...editData.ingredients]; a[i] = { ...a[i], n: e.target.value }; setEditData({ ...editData, ingredients: a }); }}
                      placeholder="Ingrédient"
                      style={{ padding: "5px 7px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
                    <input type="number" step="0.001" value={ing.q} onChange={e => { const a = [...editData.ingredients]; a[i] = { ...a[i], q: parseFloat(e.target.value) || 0 }; setEditData({ ...editData, ingredients: a }); }}
                      placeholder="Qté"
                      style={{ padding: "5px 7px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
                    <input value={ing.u} onChange={e => { const a = [...editData.ingredients]; a[i] = { ...a[i], u: e.target.value }; setEditData({ ...editData, ingredients: a }); }}
                      placeholder="Unité"
                      style={{ padding: "5px 7px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
                    <input type="number" step="0.01" value={ing.pu} onChange={e => { const a = [...editData.ingredients]; a[i] = { ...a[i], pu: parseFloat(e.target.value) || 0 }; setEditData({ ...editData, ingredients: a }); }}
                      placeholder="Réf €"
                      style={{ padding: "5px 7px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
                    <input type="number" step="0.01" value={ing.pu_max || ""} onChange={e => { const a = [...editData.ingredients]; a[i] = { ...a[i], pu_max: parseFloat(e.target.value) || 0 }; setEditData({ ...editData, ingredients: a }); }}
                      placeholder="Max €"
                      style={{ padding: "5px 7px", border: "0.5px solid rgba(220,53,69,0.3)", borderRadius: "var(--border-radius-md)", background: "rgba(220,53,69,0.03)", color: "#dc3545", fontSize: 12 }} />
                    <button onClick={() => { const a = editData.ingredients.filter((_, j) => j !== i); setEditData({ ...editData, ingredients: a }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14 }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 10, color: "var(--color-text-secondary)", paddingLeft: 2 }}>
                    <span>Prix réf: {ing.pu}€/u</span>
                    {ing.pu_max && <span style={{ color: "#dc3545" }}>Max: {ing.pu_max}€/u</span>}
                  </div>
                </div>
              ))}
              <button onClick={() => setEditData({ ...editData, ingredients: [...editData.ingredients, { n: "", q: 0, u: "kg", pu: 0 }] })}
                style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "5px 12px", cursor: "pointer", marginBottom: "1rem" }}>
                + Ajouter
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: "8px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Enregistrer</button>
                <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
