import React from "react";
import { ALLERGENES_MAP } from "../constants/theme";

export default function Allergenes({ produits }) {
  const allergenes = Object.keys(ALLERGENES_MAP);
  const cats = [...new Set(produits.map(p => p.categorie))];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", minWidth: 120, fontWeight: 500 }}>Produit</th>
            {allergenes.map(a => (
              <th key={a} style={{ textAlign: "center", padding: "6px 4px", minWidth: 50, fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 11, writingMode: "vertical-rl", height: 80 }}>
                {ALLERGENES_MAP[a]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cats.map(cat => (
            <React.Fragment key={cat}>
              <tr>
                <td colSpan={allergenes.length + 1} style={{ padding: "8px 8px 4px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, background: "var(--color-background-secondary)" }}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </td>
              </tr>
              {produits.filter(p => p.categorie === cat).map(p => (
                <tr key={p.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 400 }}>{p.nom}</td>
                  {allergenes.map(a => (
                    <td key={a} style={{ textAlign: "center", padding: "6px 4px" }}>
                      {p.allergenes?.includes(a)
                        ? <span style={{ color: "var(--color-text-warning)", fontSize: 14 }}>⚠</span>
                        : <span style={{ color: "var(--color-border-tertiary)" }}>·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
