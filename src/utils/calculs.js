// Fonctions de calcul métier : coût de revient, hypothèses mensuelles, résultat comptable.

/** Coût de revient (CR) d'une pièce, en tenant compte des feuilles brick et des fournées. */
export function calcCR(p) {
  const somme = p.ingredients.reduce((s,i)=>s+i.q*i.pu, 0);
  if(p.feuille_brick) return (somme + 0.05*p.nbre_par_fournee) / p.nbre_par_fournee;
  if(p.nbre_par_fournee > 1) return somme / p.nbre_par_fournee;
  return somme;
}

/** Récupère l'hypothèse du mois (clé "YYYY-MM"), avec valeurs par défaut si absente. */
export function getHypotheseMois(params, moisKey){
  const h = (params.hypotheses_mensuelles && params.hypotheses_mensuelles[moisKey]) || {};
  const [y,m] = moisKey.split("-").map(Number);
  const joursTotalDefaut = new Date(y, m, 0).getDate();
  return {
    clientsJour: h.clientsJour || 0,
    ticketMoyen: h.ticketMoyen || 0,
    joursTravailles: (h.joursTravailles !== undefined && h.joursTravailles !== null) ? h.joursTravailles : joursTotalDefaut
  };
}

/** Jours d'ouverture estimés écoulés dans le mois (jusqu'à aujourd'hui si mois courant, sinon tout le mois). */
export function getJoursOuvertureMois(annee, mois){
  const today = new Date();
  const isMoisCourant = (today.getFullYear()===annee && today.getMonth()===mois);
  const dernierJour = new Date(annee, mois+1, 0).getDate();
  return isMoisCourant ? today.getDate() : dernierJour;
}

/** Nombre total de jours calendaires du mois. */
export function getJoursTotalMois(annee, mois){
  return new Date(annee, mois+1, 0).getDate();
}

/**
 * Calcule le résultat net comptable d'un mois donné (réutilisé par Compta, Bilan, Trésorerie).
 * @param {number} annee
 * @param {number} mois - index 0-11
 * @param {Array} ventes
 * @param {object} params
 * @param {Array} courses
 */
export function calculerResultatMois(annee, mois, ventes, params, courses){
  const ventesMois = ventes.filter(v=>{
    if(!v.date || v.deleted) return false;
    const d = new Date(v.date);
    return d.getMonth()===mois && d.getFullYear()===annee;
  });
  const caVentes = ventesMois.reduce((s,v)=>s+v.total,0);
  const coursesMois = courses.filter(c=>c.mois===mois);
  const totalCourses = coursesMois.reduce((s,c)=>s+parseFloat(c.montant||0),0);
  const totalChargesFixes = params.charges_fixes.reduce((s,c)=>s+c.montant,0);
  const totalChargesVarFixes = params.charges_variables_fixes.reduce((s,c)=>s+c.montant,0);
  const totalMensualitesDettes = (params.dettes||[]).reduce((s,d)=>s+(d.mensualite||0),0);
  const charges_sociales = caVentes * params.taux_cotisation_acre;
  const cfp = caVentes * params.taux_cfp;
  const ir = caVentes * params.taux_ir;
  const totalCharges = totalCourses + totalChargesFixes + totalChargesVarFixes + charges_sociales + cfp;
  const resultat_net = caVentes - totalCharges;
  const resultat_comptable = resultat_net - ir;
  // Flux de trésorerie réel : résultat comptable - remboursement du capital des dettes
  // (la mensualité couvre capital+intérêts, déjà approximé ici en charge totale)
  const fluxTresorerie = resultat_comptable - totalMensualitesDettes;
  return { caVentes, totalCourses, totalChargesFixes, totalChargesVarFixes, charges_sociales, cfp, ir, totalCharges, resultat_net, resultat_comptable, totalMensualitesDettes, fluxTresorerie };
}
