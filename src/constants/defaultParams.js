export const defaultParams = {
  taux_cotisation_acre: 0.062,
  taux_cfp: 0.001,
  taux_ir: 0.01,
  abattement: 0.71,
  charges_fixes: [
    { label:"Loyer", montant:650 },
    { label:"Électricité / Eau", montant:80 },
    { label:"Assurance Pro", montant:73 },
    { label:"SumUp / TPE", montant:40 },
  ],
  charges_variables_fixes: [
    { label:"Fournitures diverses", montant:86 },
    { label:"Déplacements/Essence", montant:227 },
  ],
  // Hypothèses mensuelles : clé "YYYY-MM" -> {clientsJour, ticketMoyen, joursTravailles}
  hypotheses_mensuelles: {},
  // ── Bilan & Trésorerie ──
  tresorerie_depart: 2500,
  immobilisations: [
    { label:"Food truck / Matériel", valeur:0, amortissement_annuel:0 },
  ],
  dettes: [],
};
