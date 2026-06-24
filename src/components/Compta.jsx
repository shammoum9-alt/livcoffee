import React, { useState } from "react";
import { getHypotheseMois } from "../utils/calculs";
import { fmtE } from "../utils/format";
import { MOIS_LABELS } from "../constants/theme";
import { uploadFactureGoogleDrive } from "../services/dataService";

export default function Compta({ ventes, params, courses, addCourse, updateCourse, removeCourse }) {
  const now = new Date();
  const moisActuel = now.getMonth();
  const anneeActuelle = now.getFullYear();

  const [selectedMois, setSelectedMois] = useState(moisActuel);
  const [newCourse, setNewCourse] = useState({ date: "", montant: "", commercant: "" });
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = React.useRef(null);
  const pendingUpload = React.useRef(null);

  const ventesMois = ventes.filter(v => {
    if (!v.date || v.deleted) return false;
    const d = new Date(v.date);
    return d.getMonth() === selectedMois && d.getFullYear() === anneeActuelle;
  });

  const caVentes = ventesMois.reduce((s, v) => s + v.total, 0);
  const coursesMois = courses.filter(c => c.mois === selectedMois);
  const totalCourses = coursesMois.reduce((s, c) => s + parseFloat(c.montant || 0), 0);

  const totalChargesFixes = params.charges_fixes.reduce((s, c) => s + c.montant, 0);
  const totalChargesVarFixes = params.charges_variables_fixes.reduce((s, c) => s + c.montant, 0);

  const charges_sociales = caVentes * params.taux_cotisation_acre;
  const cfp = caVentes * params.taux_cfp;
  const ir = caVentes * params.taux_ir;

  const totalCharges = totalCourses + totalChargesFixes + totalChargesVarFixes + charges_sociales + cfp;
  const resultat_net = caVentes - totalCharges;
  const resultat_comptable = resultat_net - ir;

  // ── CA prévisionnel du mois sélectionné, basé sur l'hypothèse saisie en Paramètres ──
  const moisKeySelected = `${anneeActuelle}-${String(selectedMois + 1).padStart(2, "0")}`;
  const hypMois = getHypotheseMois(params, moisKeySelected);
  const caPrevisionnel = (hypMois.clientsJour > 0 && hypMois.ticketMoyen > 0)
    ? hypMois.clientsJour * hypMois.ticketMoyen * hypMois.joursTravailles
    : null;
  const ecartCAPrevisionnel = caPrevisionnel !== null ? caVentes - caPrevisionnel : null;

  const handleAddCourse = () => {
    if (!newCourse.montant) return;
    addCourse({ ...newCourse, mois: selectedMois });
    setNewCourse({ date: "", montant: "", commercant: "" });
    setShowAddCourse(false);
  };

  const handleDeleteCourse = (id) => {
    if (!window.confirm("Supprimer cette course ?")) return;
    removeCourse(id);
  };

  const triggerUpload = (id) => {
    pendingUpload.current = id;
    fileInputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    const id = pendingUpload.current;
    if (!file || !id) return;
    setUploadingId(id);
    try {
      const course = courses.find(c => c.id === id);
      const mois = new Date().toISOString().slice(0, 7);
      const fileName = "facture_" + (course?.date || mois) + "_" + file.name;
      await uploadFactureGoogleDrive(file, mois, fileName);
      await updateCourse({ ...course, facture_nom: file.name });
    } catch (err) {
      alert("Erreur upload: " + err.message);
    } finally {
      setUploadingId(null);
      pendingUpload.current = null;
      e.target.value = "";
    }
  };

  const Row = ({ label, val, sub = false, bold = false, color = null }) => (
    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <td style={{ padding: "6px 8px", fontSize: sub ? 12 : 13, paddingLeft: sub ? 24 : 8, color: sub ? "var(--color-text-secondary)" : "var(--color-text-primary)", fontWeight: bold ? 500 : 400 }}>{label}</td>
      <td style={{ textAlign: "right", padding: "6px 8px", fontSize: 13, fontWeight: bold ? 500 : 400, color: color || "var(--color-text-primary)" }}>{fmtE(val)}</td>
    </tr>
  );

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFile} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {MOIS_LABELS.map((m, i) => (
          <button key={i} onClick={() => setSelectedMois(i)} style={{
            padding: "5px 12px", border: "0.5px solid " + (selectedMois === i ? "var(--color-border-primary)" : "var(--color-border-tertiary)"),
            borderRadius: "var(--border-radius-md)", background: selectedMois === i ? "var(--color-background-secondary)" : "none",
            cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)", fontWeight: selectedMois === i ? 500 : 400,
          }}>{m}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>Compte de résultat — {MOIS_LABELS[selectedMois]}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Produits</td>
              </tr>
              <Row label="Ventes" val={caVentes} bold />
              {caPrevisionnel !== null && (
                <>
                  <Row label="CA prévisionnel (hypothèse)" val={caPrevisionnel} sub />
                  <Row label="Écart vs prévisionnel" val={ecartCAPrevisionnel} sub color={ecartCAPrevisionnel >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"} />
                </>
              )}
              <tr style={{ background: "var(--color-background-secondary)", marginTop: 8 }}>
                <td style={{ padding: "6px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }} colSpan={2}>Charges</td>
              </tr>
              <Row label="Marchandises (courses)" val={totalCourses} sub />
              {params.charges_fixes.map((c, i) => <Row key={i} label={c.label} val={c.montant} sub />)}
              {params.charges_variables_fixes.map((c, i) => <Row key={i} label={c.label} val={c.montant} sub />)}
              <Row label={`Cotisations ACRE (${(params.taux_cotisation_acre * 100).toFixed(1)}%)`} val={charges_sociales} sub />
              <Row label={`CFP (${(params.taux_cfp * 100).toFixed(1)}%)`} val={cfp} sub />
              <Row label="Total charges" val={totalCharges} bold />
              <Row label="Résultat net" val={resultat_net} bold color={resultat_net >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"} />
              <Row label={`IR versement libératoire (${(params.taux_ir * 100).toFixed(1)}%)`} val={ir} sub />
              <Row label="Résultat net comptable" val={resultat_comptable} bold color={resultat_comptable >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)"} />
            </tbody>
          </table>
          {caPrevisionnel === null && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
              Aucune hypothèse définie pour {MOIS_LABELS[selectedMois]} — renseignez-la dans Paramètres pour voir le CA prévisionnel.
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>Courses — {MOIS_LABELS[selectedMois]}</div>
            <button onClick={() => setShowAddCourse(!showAddCourse)} style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
              + Ajouter
            </button>
          </div>

          {showAddCourse && (
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <input placeholder="Date (jj/mm)" value={newCourse.date} onChange={e => setNewCourse({ ...newCourse, date: e.target.value })}
                  style={{ padding: "5px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
                <input type="number" placeholder="Montant TTC (€)" value={newCourse.montant} onChange={e => setNewCourse({ ...newCourse, montant: e.target.value })}
                  style={{ padding: "5px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12 }} />
              </div>
              <input placeholder="Commerçant (Metro, Lidl...)" value={newCourse.commercant} onChange={e => setNewCourse({ ...newCourse, commercant: e.target.value })}
                style={{ width: "100%", padding: "5px 8px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12, marginBottom: 6 }} />
              <button onClick={handleAddCourse} style={{ padding: "5px 14px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 12 }}>Ajouter</button>
            </div>
          )}

          {coursesMois.map(c => {
            const isUploading = uploadingId === c.id;
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13, gap: 6 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "var(--color-text-secondary)", marginRight: 8 }}>{c.date}</span>{c.commercant}
                </span>
                <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{fmtE(parseFloat(c.montant || 0))}</span>
                <button onClick={() => triggerUpload(c.id)} disabled={isUploading}
                  title={c.facture_nom || "Joindre une facture"}
                  style={{
                    padding: "3px 7px", fontSize: 11, borderRadius: "var(--border-radius-md)", cursor: "pointer",
                    background: c.facture_nom ? "rgba(46,125,50,0.08)" : "var(--color-background-secondary)",
                    border: "0.5px solid " + (c.facture_nom ? "rgba(46,125,50,0.3)" : "var(--color-border-tertiary)"),
                    color: c.facture_nom ? "#2e7d32" : "var(--color-text-secondary)",
                  }}>
                  {isUploading ? "…" : "📎"}
                </button>
                <button onClick={() => handleDeleteCourse(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  ✕
                </button>
              </div>
            );
          })}
          {coursesMois.length === 0 && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "1rem 0" }}>Aucune course enregistrée ce mois.</div>}
          {coursesMois.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, fontWeight: 500, borderTop: "0.5px solid var(--color-border-primary)" }}>
            <span>Total courses</span><span>{fmtE(totalCourses)}</span>
          </div>}
        </div>
      </div>
    </div>
  );
}
