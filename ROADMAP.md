# Roadmap — Cateh Pro

Dette technique connue et évolutions prévues. Pour comprendre et installer l'application,
voir le [README](README.md).

**Légende** — Priorité : 🔴 bloquant · 🟠 important · 🟢 confort · Statut : `[ ]` à faire · `[~]` en cours / à valider · `[x]` fait

## Vue d'ensemble

| # | Chantier | Étape | Priorité | Items |
|---|---|---|---|---|
| 1 | [Fiabilité caisse & ventes](#1-fiabilité-caisse--ventes) | V1 | 🔴 | 2 |
| 2 | [Fiabilité des stocks](#2-fiabilité-des-stocks) | V1 | 🔴 | 4 |
| 3 | [Interface](#3-interface) | V1 | 🟢 | 1 |
| 4 | [Dette technique](#4-dette-technique) | Continu | 🟠 | 5 |
| 5 | [Publication open-source](#5-publication-open-source) | Avant mise en public | 🔴 | 4 |
| 6 | [Fidélité client](#6-fidélité-client) | V2 | 🟢 | 1 |

---

## 1. Fiabilité caisse & ventes
*V1 — prérequis*

- [~] **VEN-1** 🔴 Connexion validation de vente → SumUp → Qonto (banque). Peut-être déjà fait, à valider.
- [ ] **VEN-2** 🔴 Validation de la fermeture de caisse, avec contrôle de cohérence sur :
  - le montant total encaissé
  - le nombre de tickets
  - le type de vente (CB / espèces)

## 2. Fiabilité des stocks
*V1 — prérequis. Contexte : le stock est calculé (achats cumulés − consommation déduite des
ventes), voir `getStockAchete` dans `src/components/PlanifAlimentaire.jsx`.*

- [ ] **STK-1** 🔴 Contrôle des stocks à l'ouverture de la boutique (une seule interface avec sélection) :
  - stock de produits finis : vérification quotidienne
  - stock de matières premières : vérification 2 à 3 fois par semaine
- [ ] **STK-2** 🔴 Saisie des pertes et invendus jetés. Aujourd'hui l'app ne les voit pas, donc
  le stock affiché est surestimé. Se recoupe avec STK-1 (l'écart constaté à l'inventaire = pertes).
- [ ] **STK-3** 🟠 Remise à jour quotidienne des « Quantités souhaitées ». Le « À acheter » déduit
  les ventes du jour : si les quantités ne correspondent pas à la journée en cours, le calcul est faux.
  Options : remise à zéro automatique chaque jour, ou date associée aux quantités.
- [ ] **STK-4** 🟢 Enregistrer la fabrication réelle (fournées produites). Si c'est fait, le besoin
  et le stock doivent basculer **ensemble** sur cette référence au lieu des ventes, sinon le
  double comptage revient.

## 3. Interface
*V1 — optionnel*

- [ ] **UI-1** 🟢 Simplification de l'interface en deux espaces — *Gestion* et *Derrière le comptoir*
  (Caisse / Stats / Stock & achats) — et embellissement.

## 4. Dette technique
*À traiter au fil de l'eau.*

- [ ] **TEC-1** 🟠 Aucun test (unitaire ou intégration). Priorité : `utils/calculs.js`, la partie
  financière sensible.
- [ ] **TEC-2** 🟠 Supprimer le doublon racine / `src/` : Create React App ne compile que `src/`,
  et les copies à la racine divergent déjà (ex. `components/PlanifAlimentaire.jsx`).
- [ ] **TEC-3** 🔴 Le `.env` versionné contient de vraies clés Supabase : les régénérer, l'exclure
  (voir `.gitignore`) et vérifier qu'elles n'apparaissent dans aucun historique Git.
- [ ] **TEC-4** 🟢 Pas de TypeScript — tout est en JS, sans typage statique.
- [ ] **TEC-5** 🟢 Pas de CI/CD configuré.

## 5. Publication open-source
*Prérequis avant de rendre le dépôt public, dans l'ordre.*

> **Périmètre envisagé** : back-office (recettes, fournées, stock, achats, prévisionnel), sans
> encaissement. SumUp, déjà certifié, reste la source des ventes et l'app les importe. Une app
> qui enregistre elle-même les ventes (espèces comprises) doit être inaltérable, sécurisée,
> conservée et archivée (art. 286, I, 3° bis du CGI), ce qui n'est pas le cas aujourd'hui
> (suppression de ventes possible, lignes modifiables). À faire valider par l'expert-comptable.

1. **TEC-3** — régénérer les clés Supabase et nettoyer l'historique Git.
2. [ ] **OSS-1** 🔴 Rendre l'app multi-comptes : les policies RLS doivent filtrer par `auth.uid()`,
   pas seulement vérifier qu'une session existe (voir la section Sécurité du README).
3. [ ] **OSS-2** 🟠 Rendre configurables le catalogue CBD et les produits plutôt que codés en dur
   (`constants/produits.js`, `constants/cbcData.js`).
4. **TEC-2** — supprimer le doublon racine / `src/`.
5. **TEC-1** — tests sur `utils/calculs.js`, puis :
   - [ ] **OSS-3** 🟠 Choisir une licence : AGPL pour éviter une reprise en SaaS fermé, MIT pour
     une adoption maximale.
6. [ ] **OSS-4** 🔴 Retirer l'encaissement du périmètre publié (voir encadré ci-dessus).

## 6. Fidélité client
*V2*

- [ ] **FID-1** 🟢 Programme de fidélité → conformité RGPD à prévoir (chiffrement des données
  personnelles, droit de rétractation).
