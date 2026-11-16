# Roadmap — Cateh Pro

Plan de développement, décisions d'architecture et dette technique. Pour comprendre et
installer l'application, voir le [README](README.md).

**Légende** — Priorité : 🔴 bloquant · 🟠 important · 🟢 confort · Statut : `[ ]` à faire · `[~]` en cours / à valider · `[x]` fait

---

## 🚦 Décision en attente

**CBD : maintenu ou non, et sous quelle forme ?** C'est la seule décision qui peut remettre en
cause le choix de la caisse. Le module CBC/CBD reste gelé tel quel en attendant.

- [ ] **DEC-1** 🔴 Le gérant confirme la liste des produits CBD. Depuis le 15/05/2026, le CBD
  alimentaire (boissons, tisanes, huiles, confiseries) est interdit en France : aucune boisson
  ni aucun snack au CBD. À faire confirmer par un juriste ou l'expert-comptable.
- [ ] **DEC-2** 🔴 **Avant de signer avec SumUp** : demande écrite à SumUp et à Qonto sur
  l'acceptation de l'activité CBD (produits, taux de THC). SumUp est à la fois la caisse et le
  prestataire de paiement : un blocage du compte coupe les deux. Repli si refus : Hiboutik
  (caisse) + terminal de paiement de la banque.

---

## Calendrier

> ⚠️ **Recalé le 16/11/2026** : ouverture décalée à **début janvier 2027 au minimum**. Le
> local n'est pas encore trouvé : la date d'ouverture reste à fixer une fois le local signé.
> Les jalons sont donc exprimés par rapport à l'ouverture (J).

| Jalon | Date |
|---|---|
| **Local trouvé et bail signé** (associés) | à venir, conditionne la date J |
| Compte SumUp d'essai + accès développeur (associés) | dès que possible (en retard) |
| Vraie carte, recettes et allergènes saisis dans l'app (associés) | avant le gel |
| **Gel de la V1** : tag `v1.0` sur `main`, création du projet Supabase staging | J − 3 semaines |
| **Rodage** sur `main` : corrections de bugs uniquement, nouveautés dans `develop` | J − 3 semaines → J − 1 |
| **Ouverture** du café (J) | début janvier 2027 au plus tôt |
| Première fusion `develop` → `main` (hors correctifs) | J + 2 semaines stables |

---

## Architecture décidée

- **Encaissement : SumUp** (caisse certifiée NF525). Les ventes, CB et espèces, sont saisies
  dans la caisse SumUp avec son catalogue. L'app **n'encaisse pas** : une app qui enregistre
  elle-même les ventes doit être conforme à l'art. 286, I, 3° bis du CGI (inaltérabilité,
  clôtures, archivage 6 ans, attestation de l'éditeur).
- **Import des ventes** : une Supabase Edge Function lit l'API SumUp (la clé reste côté
  serveur, jamais dans le front-end) et écrit le détail des tickets dans `ventes`. Le détail
  des commandes est conservé dans l'app (stock, ventes par produit, marges).
- **Dépenses : Qonto** est la référence (transactions, justificatifs, export comptable).
  L'app ne garde que les achats d'ingrédients, nécessaires au stock et au coût de revient.
- **Comptes** : 2 comptes (un par associé), mêmes droits, champ `saisi_par` sur chaque écriture.
- **Matériel** : pas de tablette pour l'instant. Encaissement sur le terminal SumUp, app sur
  téléphone et PC. Les écrans du quotidien doivent être utilisables sur téléphone.
- **HACCP** (températures, traçabilité des lots) : hors de l'app (cahier ou application dédiée).

### Git et environnements
- `main` : version stable utilisée par les associés. Ne reçoit que des corrections.
- `develop` : fonctionnalités du backlog d'après-ouverture. Reste en local (pas de déploiement).
- `fix/...` : part de `main`, fusionnée dans `main`, puis **`main` est fusionnée dans `develop`
  le jour même**.
- `feature/...`, `chore/...` : partent de `develop`, PR vers `develop` (voir [CONTRIBUTING](CONTRIBUTING.md)).
- **Une seule base Supabase jusqu'au gel**. Ensuite : `prod` (pour `main`, offre Pro) et
  `staging` (pour `develop`, offre gratuite). Changements de schéma via des migrations
  versionnées dans `supabase/migrations/`, appliquées sur staging puis sur prod.

---

## V1 — avant l'ouverture

Ordre de réalisation. **Si retard, on coupe dans cet ordre** : VEN-2 (contrôle manuel du Z),
puis VEN-3 en import CSV, puis STK-1 en simple saisie de quantités. **On ne coupe jamais**
les étapes 1, 2, 3, 6 et 8.

| Étape | Items | Note |
|---|---|---|
| 1 | TEC-2, TEC-3, TEC-6 | Base propre et versionnée |
| 2 | AUT-1, CPT-1, CPT-2 | |
| 3 | STK-4, STK-2, STK-3 | Utilisables sur téléphone |
| 4 | VEN-3, VEN-4, VEN-5 | Dépend du compte SumUp |
| 5 | STK-1 | |
| 6 | ALG-1 | |
| 7 | VEN-2 | Coupable si retard |
| 8 | TEC-7 | Juste avant le rodage |
| 9 | TEC-8 | Le jour du gel |

### Ventes (SumUp)
- [ ] **VEN-1** 🔴 Ouvrir le compte SumUp et demander l'accès développeur (associé titulaire).
  Tester sur ce compte que l'API renvoie bien le détail des produits (`products[]`) pour une
  vente faite avec le catalogue SumUp.
- [ ] **VEN-2** 🟠 Contrôle de clôture : rapprochement entre le Z SumUp et les ventes importées
  (montant total, nombre de tickets, CB / espèces).
- [ ] **VEN-3** 🔴 Edge Function d'import des ventes SumUp, déclenchée par un bouton
  « Synchroniser ». Repli : import CSV du rapport des ventes par article.
- [ ] **VEN-4** 🟠 `Caisse.jsx` passe en lecture seule (affichage des ventes importées).
  `journal_caisse` n'est plus alimenté par l'app.
- [ ] **VEN-5** 🔴 Table de correspondance produit SumUp ↔ produit de l'app.

### Stocks et production
*Le stock est calculé (achats cumulés − consommation déduite des ventes), voir
`getStockAchete` dans `src/components/PlanifAlimentaire.jsx`.*

- [x] **STK-0** « À acheter » = besoin restant (souhaité − vendu du jour) − stock. Liste
  théorique remplacée par un budget estimé.
- [ ] **STK-1** 🔴 Contrôle des stocks à l'ouverture de la boutique (une seule interface) :
  produits finis chaque jour, matières premières 2 à 3 fois par semaine.
- [ ] **STK-2** 🔴 Saisie des pertes et invendus jetés. Sans elle, le stock affiché est
  surestimé. L'écart constaté à l'inventaire (STK-1) = pertes.
- [ ] **STK-3** 🟠 Quantités souhaitées liées au jour : remise à zéro quotidienne ou date
  associée. Sinon le « À acheter » est faux.
- [ ] **STK-4** 🔴 Enregistrer la production par lots : « N samoussas de type X, à consommer
  avant le JJ/MM » (samoussas fabriqués à l'avance et congelés). Le besoin et le stock
  doivent basculer **ensemble** sur cette référence, sinon le double comptage revient.

### Comptes et compta
- [ ] **AUT-1** 🔴 2 comptes Supabase (un par associé), mêmes droits. Colonne `saisi_par`
  (par défaut `auth.uid()`) sur chaque écriture.
- [ ] **CPT-1** 🔴 Supprimer la table `courses`. « Marchandises » du mois = somme de
  `achats_ingredients` + `achats_cbd`, filtrée par date complète. Corrige le bug actuel :
  `courses.mois` (0-11) n'a pas d'année, donc les mois de deux années différentes s'additionnent.
- [ ] **CPT-2** 🟠 Retirer l'envoi des factures sur Google Drive (Qonto stocke les justificatifs).

### Allergènes
- [ ] **ALG-1** 🔴 Allergènes justes pour toute la vraie carte + fiche imprimable pour le
  comptoir. Obligatoire dès l'ouverture. Données saisies par les associés avec les recettes.

### Technique
- [ ] **TEC-2** 🟠 Supprimer les doublons à la racine (`App.jsx`, `components/`, `constants/`,
  `hooks/`, `services/`, `utils/`, `cateh-pro-src/`…). Create React App ne compile que `src/`.
- [ ] **TEC-3** 🟠 Régénérer les clés Supabase. Aucune clé n'a été commitée (seul
  `.env.example`, avec des valeurs factices), mais le dépôt est public.
- [ ] **TEC-6** 🟠 Vérifier que le projet Supabase est hébergé dans l'UE (RGPD).
- [ ] **TEC-7** 🔴 Passage en Supabase Pro + sauvegardes + procédure de restauration testée.
- [ ] **TEC-8** 🔴 Gel : tag `v1.0` sur `main`, `develop` alignée sur `main`, projet Supabase
  staging et première migration versionnée.

---

## Après l'ouverture — backlog `develop`

Ordre de réalisation :

1. [ ] **TEC-1** 🟠 Tests sur `utils/calculs.js` et sur le calcul « À acheter ». Filet de
   sécurité pour toutes les fusions suivantes.
2. [ ] **CPT-3** 🟠 Rapprochement Qonto : import des transactions par API, comparaison avec
   les achats.
3. [ ] **UI-1** 🟢 Deux espaces : *Gestion* et *Derrière le comptoir*. Nourri par les retours
   du rodage.
4. [ ] **STK-5** 🟢 Sous-recettes (farce, pâte réutilisées), si la carte dépasse 3 ou 4 variantes.
5. [ ] **TEC-4** 🟢 TypeScript. **TEC-5** 🟢 CI/CD. Déclenchement automatique de l'import
   SumUp (`pg_cron`).
6. [ ] Publication open-source (OSS) et fidélité (FID), voir ci-dessous.

### Pistes à étudier
- **VEN-6** 🟢 Saisie du ticket dans l'app, montant envoyé au terminal SumUp Solo (API Cloud),
  statut renvoyé. Techniquement faisable, mais l'app redevient un logiciel de caisse (art. 286
  CGI). Seulement si les associés décident d'assumer cette conformité, avec l'avis de
  l'expert-comptable.
- **TEC-9** 🟢 Benchmark d'hébergement, seulement si le coût Supabase devient trop lourd ou
  pour l'auto-hébergement.
- **HAC-1** 🟢 HACCP dans l'app, à rediscuter une fois le café en route.

---

## Publication open-source
*Prérequis avant toute publication. Le dépôt est à passer en privé d'ici là (décision de
l'associé propriétaire).*

> **Périmètre** : back-office (recettes, production, stock, achats, prévisionnel), sans
> encaissement.

- [ ] **OSS-1** 🔴 Multi-comptes : les policies RLS filtrent par `auth.uid()`, pas seulement
  par la présence d'une session.
- [ ] **OSS-2** 🟠 Catalogue CBD et produits configurables plutôt que codés en dur
  (`src/constants/produits.js`, `src/constants/cbcData.js`).
- [ ] **OSS-3** 🟠 Choisir une licence : AGPL (évite une reprise en SaaS fermé) ou MIT
  (adoption maximale).
- Prérequis déjà listés : TEC-1, TEC-2, TEC-3.

## Fidélité client
- [ ] **FID-1** 🟢 Programme de fidélité → conformité RGPD (chiffrement des données
  personnelles, droit de rétractation).
