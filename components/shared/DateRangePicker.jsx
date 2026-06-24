import React from "react";

/**
 * Sélecteur de plage de dates réutilisable. Défaut : aujourd'hui.
 * Présets rapides + sélection manuelle de plage (du / au).
 */
export default function DateRangePicker({ range, setRange }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const fmtLocal = (d) => d.toISOString().slice(0, 10);

  const applyPreset = (preset) => {
    const today = new Date();
    let from, to;
    if (preset === "today") { from = to = todayStr; }
    else if (preset === "week") {
      const day = today.getDay() || 7;
      const monday = new Date(today); monday.setDate(today.getDate() - day + 1);
      from = fmtLocal(monday); to = todayStr;
    } else if (preset === "month") {
      from = fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1));
      to = todayStr;
    } else if (preset === "year") {
      from = fmtLocal(new Date(today.getFullYear(), 0, 1));
      to = todayStr;
    }
    setRange({ from, to, preset });
  };

  const presets = [
    { id: "today", label: "Aujourd'hui" },
    { id: "week", label: "Cette semaine" },
    { id: "month", label: "Ce mois" },
    { id: "year", label: "Cette année" },
  ];

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {presets.map(p => (
          <button key={p.id} onClick={() => applyPreset(p.id)} style={{
            padding: "5px 12px", border: "0.5px solid " + (range.preset === p.id ? "var(--color-border-primary)" : "var(--color-border-tertiary)"),
            borderRadius: "var(--border-radius-md)", background: range.preset === p.id ? "var(--color-background-secondary)" : "none",
            cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)", fontWeight: range.preset === p.id ? 500 : 400,
          }}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Du</label>
        <input type="date" value={range.from} max={range.to}
          onChange={e => setRange({ from: e.target.value, to: range.to, preset: null })}
          style={{ padding: "5px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>au</label>
        <input type="date" value={range.to} min={range.from} max={todayStr}
          onChange={e => setRange({ from: range.from, to: e.target.value, preset: null })}
          style={{ padding: "5px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
      </div>
    </div>
  );
}
