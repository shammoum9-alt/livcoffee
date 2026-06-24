import { useState, useEffect, useCallback } from "react";
import * as data from "../services/dataService";
import { PRODUITS } from "../constants/produits";
import { CBC_CBD } from "../constants/cbcData";
import { defaultParams } from "../constants/defaultParams";

/** Loggue et signale toute erreur d'écriture de façon visible, plutôt que de
 * laisser une promesse rejetée non gérée planter l'app avec un message illisible. */
function reportWriteError(context, err) {
  console.error(`Erreur Supabase (${context}) :`, err);
  const message = err?.message || err?.error_description || JSON.stringify(err);
  alert(`Erreur lors de l'enregistrement (${context}) :\n${message}`);
}

/**
 * Hook central : charge toutes les données depuis Supabase au démarrage,
 * et expose les setters qui écrivent directement en base (pas de cache local
 * intermédiaire à synchroniser — Supabase est la source de vérité unique).
 */
export function useAppData() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const [ventes, setVentesState] = useState([]);
  const [produits, setProduitsState] = useState(PRODUITS);
  const [cbcData, setCbcDataState] = useState(CBC_CBD);
  const [params, setParamsState] = useState(defaultParams);
  const [courses, setCoursesState] = useState([]);
  const [journalCaisse, setJournalCaisseState] = useState([]);
  const [achats, setAchatsState] = useState([]);
  const [achatsCBC, setAchatsCBCState] = useState([]);
  const [nbres, setNbresState] = useState({});

  // ── Chargement initial ──
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [
          ventesData, produitsData, cbcDataData, paramsData,
          coursesData, journalData, achatsData, achatsCBCData, nbresData,
        ] = await Promise.all([
          data.fetchVentes(),
          data.fetchProduits(),
          data.fetchCbcData(),
          data.fetchParams(),
          data.fetchCourses(),
          data.fetchJournalCaisse(),
          data.fetchAchatsIngredients(),
          data.fetchAchatsCBD(),
          data.fetchNbresPlanifies(),
        ]);
        if (!isMounted) return;
        setVentesState(ventesData);
        if (produitsData) setProduitsState(produitsData);
        if (cbcDataData) setCbcDataState(cbcDataData);
        if (paramsData) setParamsState({ ...defaultParams, ...paramsData });
        setCoursesState(coursesData);
        setJournalCaisseState(journalData);
        setAchatsState(achatsData);
        setAchatsCBCState(achatsCBCData);
        if (nbresData && Object.keys(nbresData).length > 0) setNbresState(nbresData);
        else {
          const defaults = {};
          PRODUITS.forEach(p => {
            defaults[p.id] = p.categorie === "sam" ? 50 : p.categorie === "sandwich" ? 30 : p.categorie === "boisson" ? 40 : 30;
          });
          setNbresState(defaults);
        }
        setLoaded(true);
      } catch (err) {
        console.error("Erreur de chargement Supabase :", err);
        if (isMounted) { setError(err); setLoaded(true); }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // ── Ventes ──
  const addVente = useCallback(async (v) => {
    const nouvelleVente = { ...v, id: v.id || Date.now(), date: v.date || new Date().toISOString() };
    setVentesState(prev => {
      const idx = prev.findIndex(x => x.id === nouvelleVente.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = nouvelleVente; return copy; }
      return [...prev, nouvelleVente];
    });
    try {
      await data.upsertVente(nouvelleVente);
    } catch (err) {
      reportWriteError("vente", err);
    }
  }, []);

  const deleteVente = useCallback(async (id) => {
    setVentesState(prev => prev.map(v => v.id === id ? { ...v, deleted: true } : v));
    const vente = ventes.find(v => v.id === id);
    if (!vente) return;
    try {
      await data.upsertVente({ ...vente, deleted: true });
    } catch (err) {
      reportWriteError("suppression de vente", err);
    }
  }, [ventes]);

  const rembourserVente = useCallback(async (id) => {
    setVentesState(prev => prev.map(v => v.id === id ? { ...v, rembourse: true } : v));
    const vente = ventes.find(v => v.id === id);
    if (!vente) return;
    try {
      await data.upsertVente({ ...vente, rembourse: true });
    } catch (err) {
      reportWriteError("remboursement", err);
    }
  }, [ventes]);

  // ── Journal caisse ──
  const addJournalEvent = useCallback(async (event) => {
    const nouvelEvent = { ...event, id: Date.now() };
    setJournalCaisseState(prev => [...prev, nouvelEvent]);
    try {
      await data.insertJournalEvent(nouvelEvent);
    } catch (err) {
      reportWriteError("ouverture/fermeture de caisse", err);
    }
  }, []);

  // ── Courses ──
  const addCourse = useCallback(async (course) => {
    const nouvelle = { ...course, id: course.id || Date.now() };
    setCoursesState(prev => [...prev, nouvelle]);
    try {
      await data.upsertCourse(nouvelle);
    } catch (err) {
      reportWriteError("ajout de course", err);
    }
  }, []);

  const updateCourse = useCallback(async (course) => {
    setCoursesState(prev => prev.map(c => c.id === course.id ? course : c));
    try {
      await data.upsertCourse(course);
    } catch (err) {
      reportWriteError("modification de course", err);
    }
  }, []);

  const removeCourse = useCallback(async (id) => {
    setCoursesState(prev => prev.filter(c => c.id !== id));
    try {
      await data.deleteCourse(id);
    } catch (err) {
      reportWriteError("suppression de course", err);
    }
  }, []);

  // ── Achats ingrédients ──
  const addAchatsIngredients = useCallback(async (achatsArray) => {
    setAchatsState(prev => [...prev, ...achatsArray]);
    try {
      await data.insertAchatsIngredients(achatsArray);
    } catch (err) {
      reportWriteError("achats ingrédients", err);
    }
  }, []);

  // ── Achats CBD ──
  const addAchatCBD = useCallback(async (achat) => {
    const nouvel = { ...achat, id: achat.id || Date.now() + Math.random() };
    setAchatsCBCState(prev => [...prev, nouvel]);
    try {
      await data.insertAchatCBD(nouvel);
    } catch (err) {
      reportWriteError("achat CBD", err);
    }
  }, []);

  // ── Nbres planifiés ──
  // Note : l'écriture Supabase est déclenchée hors du setState (pas dans le callback
  // de mise à jour) pour éviter de mélanger effet de bord asynchrone et calcul d'état.
  const setNbres = useCallback((updater) => {
    setNbresState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      Object.entries(next).forEach(([produitId, quantite]) => {
        if (prev[produitId] !== quantite) {
          data.upsertNbrePlanifie(produitId, quantite).catch(err =>
            reportWriteError("quantité planifiée", err)
          );
        }
      });
      return next;
    });
  }, []);

  // ── Produits (recettes) ──
  const setProduits = useCallback((updater) => {
    setProduitsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      data.upsertProduitsBatch(next).catch(err => reportWriteError("recette produit", err));
      return next;
    });
  }, []);

  // ── Params ──
  const setParams = useCallback((updater) => {
    setParamsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      data.saveParams(next).catch(err => reportWriteError("paramètres", err));
      return next;
    });
  }, []);

  return {
    loaded, error,
    ventes, addVente, deleteVente, rembourserVente,
    produits, setProduits,
    cbcData,
    params, setParams,
    courses, addCourse, updateCourse, removeCourse,
    journalCaisse, addJournalEvent,
    achats, addAchatsIngredients,
    achatsCBC, addAchatCBD,
    nbres, setNbres,
  };
}
