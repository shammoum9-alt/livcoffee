import { supabase } from "./supabase";

// ════════════════════════════════════════════
// Service de données — toutes les opérations CRUD vers Supabase.
// Chaque fonction correspond à une table. Les composants ne parlent
// jamais directement à `supabase`, ils passent par ici.
// ════════════════════════════════════════════

// ── Ventes ──
export async function fetchVentes() {
  const { data, error } = await supabase.from("ventes").select("*").order("date", { ascending: true });
  if (error) throw error;
  return (data || []).map(v => ({
    id: v.id,
    items: v.items,
    total: v.total,
    paiement: v.paiement,
    espece_donnee: v.espece_donnee,
    nomClient: v.nom_client,
    date: v.date,
    deleted: v.deleted,
    rembourse: v.rembourse,
  }));
}

export async function upsertVente(vente) {
  const { error } = await supabase.from("ventes").upsert({
    id: vente.id,
    items: vente.items,
    total: vente.total,
    paiement: vente.paiement,
    espece_donnee: vente.espece_donnee || 0,
    nom_client: vente.nomClient || null,
    date: vente.date,
    deleted: vente.deleted || false,
    rembourse: vente.rembourse || false,
  });
  if (error) throw error;
}

// ── Journal caisse (ouverture/fermeture) ──
export async function fetchJournalCaisse() {
  const { data, error } = await supabase.from("journal_caisse").select("*").order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map(j => ({
    id: j.id, type: j.type, date: j.date, heure: j.heure, fond: j.fond,
    fondOuverture: j.fond_ouverture, caJour: j.ca_jour, caCB: j.ca_cb, caEspece: j.ca_espece,
    theorique: j.theorique, ecart: j.ecart, nbVentes: j.nb_ventes,
  }));
}

export async function insertJournalEvent(event) {
  const { error } = await supabase.from("journal_caisse").insert({
    id: event.id, type: event.type, date: event.date, heure: event.heure, fond: event.fond,
    fond_ouverture: event.fondOuverture, ca_jour: event.caJour, ca_cb: event.caCB,
    ca_espece: event.caEspece, theorique: event.theorique, ecart: event.ecart, nb_ventes: event.nbVentes,
  });
  if (error) throw error;
}

// ── Achats ingrédients alimentaires ──
export async function fetchAchatsIngredients() {
  const { data, error } = await supabase.from("achats_ingredients").select("*").order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id, ingredient: a.ingredient, prix_unitaire: a.prix_unitaire,
    unite: a.unite, date: a.date, qte_achetee: a.qte_achetee, facture_nom: a.facture_nom,
  }));
}

export async function insertAchatsIngredients(achatsArray) {
  const rows = achatsArray.map(a => ({
    id: a.id, ingredient: a.ingredient, prix_unitaire: a.prix_unitaire,
    unite: a.unite, date: a.date, qte_achetee: a.qte_achetee, facture_nom: a.facture_nom || null,
  }));
  const { error } = await supabase.from("achats_ingredients").insert(rows);
  if (error) throw error;
}

// ── Achats CBC/CBD ──
export async function fetchAchatsCBD() {
  const { data, error } = await supabase.from("achats_cbd").select("*").order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id, produit_id: a.produit_id, prix_achat: a.prix_achat, prix_vente: a.prix_vente,
    quantite: a.quantite, date: a.date, facture_nom: a.facture_nom,
  }));
}

export async function insertAchatCBD(achat) {
  const { error } = await supabase.from("achats_cbd").insert({
    id: achat.id, produit_id: achat.produit_id, prix_achat: achat.prix_achat,
    prix_vente: achat.prix_vente, quantite: achat.quantite || 0, date: achat.date,
    facture_nom: achat.facture_nom || null,
  });
  if (error) throw error;
}

// ── Courses (dépenses Compta) ──
export async function fetchCourses() {
  const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: true });
  if (error) throw error;
  return (data || []).map(c => ({
    id: c.id, date: c.date, commercant: c.commercant, montant: c.montant,
    mois: c.mois, facture_nom: c.facture_nom,
  }));
}

export async function upsertCourse(course) {
  const { error } = await supabase.from("courses").upsert({
    id: course.id, date: course.date, commercant: course.commercant,
    montant: parseFloat(course.montant) || 0, mois: course.mois, facture_nom: course.facture_nom || null,
  });
  if (error) throw error;
}

export async function deleteCourse(id) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

// ── Quantités planifiées (Planif) ──
export async function fetchNbresPlanifies() {
  const { data, error } = await supabase.from("nbres_planifies").select("*");
  if (error) throw error;
  const map = {};
  (data || []).forEach(n => { map[n.produit_id] = n.quantite; });
  return map;
}

export async function upsertNbrePlanifie(produitId, quantite) {
  const { error } = await supabase.from("nbres_planifies").upsert({
    produit_id: produitId, quantite, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Produits (recettes modifiables) ──
export async function fetchProduits() {
  const { data, error } = await supabase.from("produits").select("*");
  if (error) throw error;
  if (!data || data.length === 0) return null; // signal : utiliser les valeurs par défaut
  return data.map(p => ({
    id: p.id, nom: p.nom, prix: p.prix, categorie: p.categorie,
    allergenes: p.allergenes || [], ingredients: p.ingredients,
    feuille_brick: p.feuille_brick, nbre_par_fournee: p.nbre_par_fournee, poids_total: p.poids_total,
  }));
}

export async function upsertProduit(produit) {
  const { error } = await supabase.from("produits").upsert({
    id: produit.id, nom: produit.nom, prix: produit.prix, categorie: produit.categorie,
    allergenes: produit.allergenes || [], ingredients: produit.ingredients,
    feuille_brick: produit.feuille_brick, nbre_par_fournee: produit.nbre_par_fournee,
    poids_total: produit.poids_total, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function upsertProduitsBatch(produits) {
  const rows = produits.map(p => ({
    id: p.id, nom: p.nom, prix: p.prix, categorie: p.categorie,
    allergenes: p.allergenes || [], ingredients: p.ingredients,
    feuille_brick: p.feuille_brick, nbre_par_fournee: p.nbre_par_fournee,
    poids_total: p.poids_total, updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("produits").upsert(rows);
  if (error) throw error;
}

// ── Référentiel CBC/CBD ──
export async function fetchCbcData() {
  const { data, error } = await supabase.from("cbc_data").select("*");
  if (error) throw error;
  if (!data || data.length === 0) return null; // signal : utiliser les valeurs par défaut
  return data.map(c => ({
    id: c.id, nom: c.nom, type: c.type, taux: c.taux, famille: c.famille,
    poids: c.poids, prix_achat: c.prix_achat, prix_vente: c.prix_vente,
  }));
}

export async function upsertCbcDataBatch(cbcData) {
  const rows = cbcData.map(c => ({
    id: c.id, nom: c.nom, type: c.type, taux: c.taux, famille: c.famille,
    poids: c.poids, prix_achat: c.prix_achat, prix_vente: c.prix_vente,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("cbc_data").upsert(rows);
  if (error) throw error;
}

// ── Paramètres globaux (un seul enregistrement JSON) ──
export async function fetchParams() {
  const { data, error } = await supabase.from("params").select("data").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

export async function saveParams(params) {
  const { error } = await supabase.from("params").upsert({
    id: 1, data: params, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Upload de factures — reste sur Google Drive via Apps Script (décision : pas de migration ici) ──
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7fi3563a2x5wXbDXQa8ohcDKZCMKX_g1M_0SOZHt5jw2lJJz3f6qWLrucb9Wv3PgUGw/exec";

export async function uploadFactureGoogleDrive(file, mois, fileNamePrefixed) {
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Lecture du fichier échouée"));
    r.readAsDataURL(file);
  });
  const payload = JSON.stringify({
    action: "upload_drive", fileName: fileNamePrefixed, mois, mimeType: file.type, data: base64,
  });
  try {
    const resp = await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: payload });
    const result = await resp.json();
    return result.status === "ok";
  } catch (err) {
    // Fallback no-cors : la requête part mais on ne peut pas lire la réponse — on considère un succès optimiste.
    await fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: payload });
    return true;
  }
}
