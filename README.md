# Cateh Pro

Application de gestion pour un commerce café & CBD : caisse, suivi de stock, recettes,
comptabilité, bilan prévisionnel et plan de trésorerie.

## Stack technique

- **Front-end** : React 18 (Create React App, pas de framework meta comme Next.js)
- **Backend** : aucun serveur applicatif — c'est une architecture **BaaS** (Backend-as-a-Service).
  Le front-end parle directement à **Supabase** (PostgreSQL hébergé + API REST auto-générée).
  La sécurité d'accès repose sur les *policies* Row Level Security (RLS) côté base, pas sur du
  code serveur. Voir la section "Sécurité" ci-dessous — c'est un point à revoir avant toute
  exposition publique.
- **Stockage de fichiers** : Google Drive (via un Google Apps Script existant, décision produit
  délibérée — voir `services/dataService.js`, fonction `uploadFactureGoogleDrive`). Ce n'est
  **pas** Supabase Storage.
- **Pas de back-end Node/Express séparé.** Si un futur besoin (webhooks, jobs planifiés, logique
  serveur sensible) l'impose, ce sera une brique à ajouter — actuellement absente par choix,
  pas par oubli.

## Démarrage

```bash
npm install
cp .env.example .env
# Renseigner REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY dans .env
# (valeurs dans Supabase → Settings → API)
npm start
```

## Structure

```
src/
├── App.jsx                  # Point d'entrée, navigation par onglets
├── components/               # Un fichier par écran/section
│   ├── Caisse.jsx
│   ├── Dashboard.jsx         # "Stats"
│   ├── Recettes.jsx
│   ├── StockAchats.jsx       # Conteneur à 2 sous-onglets (Alimentaire / CBC-CBD)
│   │   ├── PlanifAlimentaire.jsx
│   │   └── CBC.jsx
│   ├── Compta.jsx
│   ├── BilanPrevisionnel.jsx
│   ├── PlanTresorerie.jsx
│   ├── Allergenes.jsx
│   ├── Params.jsx
│   ├── SyncStatus.jsx
│   └── shared/DateRangePicker.jsx
├── hooks/
│   └── useAppData.js         # Hook central : charge tout au démarrage, expose les setters
│                              # qui écrivent directement en base (pas de cache intermédiaire
│                              # à synchroniser manuellement)
├── services/
│   ├── supabase.js           # Client Supabase (lit les clés depuis .env)
│   └── dataService.js        # Toutes les fonctions CRUD, table par table
├── utils/
│   ├── format.js             # fmt(), fmtE() — formatage de nombres/montants
│   └── calculs.js            # Logique métier : coût de revient, hypothèses, résultat mensuel
└── constants/
    ├── produits.js           # Catalogue café/snacking (valeurs par défaut)
    ├── cbcData.js            # Référentiel CBC/CBD (valeurs par défaut)
    ├── theme.js               # Couleurs, allergènes, libellés mois
    └── defaultParams.js       # Paramètres financiers par défaut

supabase/
└── schema.sql                # Schéma complet des tables + policies RLS
```

## Base de données (Supabase / PostgreSQL)

9 tables, schéma complet dans `supabase/schema.sql` :

| Table | Contenu |
|---|---|
| `ventes` | Lignes de caisse (items, total, paiement, remboursement) |
| `journal_caisse` | Événements ouverture/fermeture de caisse |
| `achats_ingredients` | Achats d'ingrédients alimentaires (prix réel, quantité) |
| `achats_cbd` | Achats CBC/CBD (prix d'achat/vente, quantité) |
| `courses` | Dépenses (pour la Compta) |
| `nbres_planifies` | Quantités planifiées par produit |
| `produits` | Recettes modifiables (surcharge du catalogue par défaut) |
| `cbc_data` | Référentiel CBC/CBD modifiable |
| `params` | Un seul enregistrement JSON : taux, charges, hypothèses, bilan/trésorerie |

`produits` et `cbc_data` sont vides par défaut — l'app retombe alors sur les constantes
(`constants/produits.js`, `constants/cbcData.js`). Dès qu'une modification est faite via l'UI,
la table se peuple et devient la source de vérité.

## Logique métier à connaître avant de toucher au code

- **Décumulation des stocks** (alimentaire et CBD) : le stock affiché = achats cumulés depuis
  toujours **moins** la consommation réelle déduite des ventes effectives (pas de la
  planification prévisionnelle). Voir `getStockAchete` dans `PlanifAlimentaire.jsx` et
  `getStockCumule` dans `CBC.jsx`. Un stock négatif est possible et volontairement affiché en
  rouge — il signale un achat non tracé, pas un bug.
- **Hypothèses mensuelles** (`Params.jsx`) : clients/jour × ticket moyen × jours travaillés,
  saisies par mois (clé `"YYYY-MM"`). Utilisées par Stats (comparaison réel/hypothèse), Compta
  (CA prévisionnel) et Trésorerie (projection des mois futurs).
- **Plan de trésorerie** (`PlanTresorerie.jsx`) : les mois passés/courant utilisent les données
  réelles, les mois futurs utilisent les hypothèses. Le bilan (`BilanPrevisionnel.jsx`) est une
  vue simplifiée (pas un bilan comptable officiel) — actif = trésorerie cumulée + immobilisations
  nettes, passif = dettes + résultat cumulé.

## Sécurité

**Authentification** : compte unique partagé (email/mot de passe géré par Supabase Auth),
suffisant pour l'usage actuel (un commerce, une petite équipe). Voir `hooks/useAuth.js` et
`components/Login.jsx`. L'app ne charge aucune donnée (`useAppData`) avant qu'une session
valide soit confirmée.

**Policies RLS** : toutes les tables exigent `auth.uid() is not null` (voir
`supabase/schema.sql`). Sans session valide, aucune lecture ni écriture n'est possible, même
avec la clé publique en main.

Si le besoin évolue vers plusieurs comptes distincts avec des permissions différentes
(plusieurs commerces, rôles admin/employé...), il faudra :
1. Créer un compte par utilisateur dans Supabase Auth
2. Affiner les policies pour filtrer par `auth.uid()` précis plutôt que juste sa présence
   (actuellement, n'importe quel compte authentifié voit tout — adapté à un seul compte
   partagé, pas à une séparation de droits)

## Ce qui n'existe pas encore (transparence pour la suite)

- Aucun test (unitaire ou intégration) — la logique de `utils/calculs.js` est la priorité si
  des tests sont ajoutés, car c'est la partie financière sensible.
- Pas de TypeScript — tout est en JS, pas de typage statique.
- Pas de CI/CD configuré.
- Le `.env` versionné dans cet export contient de vraies clés pour permettre un démarrage
  immédiat — à régénérer/exclure proprement une fois le repo Git en place (voir `.gitignore`).
