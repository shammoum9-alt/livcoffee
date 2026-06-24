import React from "react";
import DateRangePicker from "./shared/DateRangePicker";
import { useDefaultDateRange } from "../hooks/useDefaultDateRange";
import { getHypotheseMois } from "../utils/calculs";
import { fmtE } from "../utils/format";
import { CAT_COLOR } from "../constants/theme";

export default function Dashboard({ ventes, produits, params }) {
  const [range, setRange] = useDefaultDateRange();

  const ventesPeriode = ventes.filter(v => {
    if (!v.date || v.deleted) return false;
    const d = v.date.slice(0, 10);
    return d >= range.from && d <= range.to;
  });

  const caTotal = ventesPeriode.reduce((s, v) => s + v.total, 0);
  const nbVentes = ventesPeriode.length;
  const ticketMoyen = nbVentes ? caTotal / nbVentes : 0;

  const ventesParProduit = {};
  ventesPeriode.forEach(v => v.items?.forEach(it => {
    if (!ventesParProduit[it.produit]) ventesParProduit[it.produit] = { qte: 0, ca: 0 };
    const p = produits.find(x => x.id === it.produit);
    ventesParProduit[it.produit].qte += it.qte;
    ventesParProduit[it.produit].ca += it.qte * (p?.prix || 0);
  }));

  const topProduits = Object.entries(ventesParProduit)
    .map(([id, v]) => ({ id, ...v, nom: produits.find(x => x.id === id)?.nom || id }))
    .sort((a, b) => b.qte - a.qte);

  const maxQte = topProduits[0]?.qte || 1;

  const venteParJour = {};
  ventesPeriode.forEach(v => {
    const d = v.date?.slice(0, 10);
    if (d) { venteParJour[d] = (venteParJour[d] || 0) + v.total; }
  });

  const cbPeriode = ventesPeriode.filter(v => v.paiement === "CB").reduce((s, v) => s + v.total, 0);
  const espPeriode = ventesPeriode.filter(v => v.paiement === "Espèce").reduce((s, v) => s + v.total, 0);

  const periodeLabel = range.from === range.to
    ? new Date(range.from).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : `${new Date(range.from).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → ${new Date(range.to).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

  const kpis = [
    { label: `CA — ${periodeLabel}`, val: fmtE(caTotal) },
    { label: "Nb ventes", val: nbVentes },
    { label: "Ticket moyen", val: nbVentes ? fmtE(ticketMoyen) : "—" },
    { label: "CB", val: fmtE(cbPeriode) },
    { label: "Espèce", val: fmtE(espPeriode) },
  ];

  // ── Hypothèse vs Réel : proratisé jour par jour sur les mois couverts par la plage ──
  const hypotheseComparaison = (() => {
    if (!params?.hypotheses_mensuelles) return null;
    const from = new Date(range.from), to = new Date(range.to);
    const moisVus = new Set();
    let caAttendu = 0, clientsAttendus = 0, ticketSum = 0, ticketCount = 0, joursAvecHypothese = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      moisVus.add(moisKey);
    }
    moisVus.forEach(moisKey => {
      const hyp = getHypotheseMois(params, moisKey);
      if (hyp.clientsJour <= 0 || hyp.ticketMoyen <= 0) return;
      const [y, m] = moisKey.split("-").map(Number);
      const joursTotalMois = new Date(y, m, 0).getDate();
      const debutMois = new Date(y, m - 1, 1), finMois = new Date(y, m - 1, joursTotalMois);
      const debutChevauchement = debutMois > from ? debutMois : from;
      const finChevauchement = finMois < to ? finMois : to;
      const joursChevauchement = Math.round((finChevauchement - debutChevauchement) / 86400000) + 1;
      if (joursChevauchement <= 0) return;
      const ratioTravailles = hyp.joursTravailles / joursTotalMois;
      const joursTravaillesDansPlage = joursChevauchement * ratioTravailles;
      caAttendu += hyp.clientsJour * hyp.ticketMoyen * joursTravaillesDansPlage;
      clientsAttendus += hyp.clientsJour * joursTravaillesDansPlage;
      ticketSum += hyp.ticketMoyen; ticketCount++;
      joursAvecHypothese += joursChevauchement;
    });
    if (ticketCount === 0) return null;
    const ticketMoyenAttendu = ticketSum / ticketCount;
    return {
      nbJoursCouverts: joursAvecHypothese,
      clientsAttendus,
      caAttendu,
      ticketMoyenAttendu,
      ecartCA: caTotal - caAttendu,
      ecartClients: nbVentes - clientsAttendus,
      ecartTicket: ticketMoyen - ticketMoyenAttendu,
    };
  })();

  return (
    <div>
      <DateRangePicker range={range} setRange={setRange} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: "2rem" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {hypotheseComparaison && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.75rem" }}>
            Hypothèse vs Réel — {periodeLabel}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            {[
              { label: "CA attendu", val: fmtE(hypotheseComparaison.caAttendu), ecart: hypotheseComparaison.ecartCA, ecartLabel: fmtE(hypotheseComparaison.ecartCA) },
              { label: "Clients attendus", val: Math.round(hypotheseComparaison.clientsAttendus), ecart: hypotheseComparaison.ecartClients, ecartLabel: (hypotheseComparaison.ecartClients >= 0 ? "+" : "") + hypotheseComparaison.ecartClients },
              { label: "Ticket moyen attendu", val: fmtE(hypotheseComparaison.ticketMoyenAttendu), ecart: hypotheseComparaison.ecartTicket, ecartLabel: fmtE(hypotheseComparaison.ecartTicket) },
            ].map(k => (
              <div key={k.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{k.val}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: k.ecart >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
                  {k.ecart >= 0 ? "▲ " : "▼ "}{k.ecartLabel} vs hypothèse
                </div>
              </div>
            ))}
          </div>
          {hypotheseComparaison.nbJoursCouverts < (Math.round((new Date(range.to) - new Date(range.from)) / 86400000) + 1) && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
              Hypothèse renseignée pour {hypotheseComparaison.nbJoursCouverts} jour(s) sur la période sélectionnée — complétez les mois manquants dans Paramètres pour une comparaison complète.
            </div>
          )}
        </div>
      )}

      {topProduits.length > 0 ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>Ventes par produit — {periodeLabel}</div>
          {topProduits.map(p => {
            const prod = produits.find(x => x.id === p.id);
            return (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[prod?.categorie] || "#888", display: "inline-block" }} />
                    {p.nom}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{p.qte} unités — {fmtE(p.ca)}</span>
                </div>
                <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(p.qte / maxQte) * 100}%`, background: CAT_COLOR[prod?.categorie] || "#888", borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: "2rem", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "1rem" }}>CA par jour</div>
          {Object.entries(venteParJour).sort().map(([d, ca]) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span style={{ fontWeight: 500 }}>{fmtE(ca)}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
          Aucune vente sur cette période.<br />Enregistrez vos ventes dans l'onglet Caisse, ou élargissez la plage de dates.
        </div>
      )}
    </div>
  );
}
