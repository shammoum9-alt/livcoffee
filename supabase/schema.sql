-- ════════════════════════════════════════════
-- Schéma Cateh — Base de données Supabase
-- ════════════════════════════════════════════

-- Ventes (Caisse)
create table ventes (
  id bigint primary key,
  items jsonb not null,
  total numeric not null,
  paiement text not null,
  espece_donnee numeric default 0,
  nom_client text,
  date timestamptz not null,
  deleted boolean default false,
  rembourse boolean default false,
  created_at timestamptz default now()
);

-- Journal caisse (ouverture/fermeture)
create table journal_caisse (
  id bigint primary key,
  type text not null, -- 'ouverture' | 'fermeture'
  date date not null,
  heure text,
  fond numeric,
  fond_ouverture numeric,
  ca_jour numeric,
  ca_cb numeric,
  ca_espece numeric,
  theorique numeric,
  ecart numeric,
  nb_ventes integer,
  created_at timestamptz default now()
);

-- Achats ingrédients alimentaires (Planif)
create table achats_ingredients (
  id numeric primary key,
  ingredient text not null,
  prix_unitaire numeric not null,
  unite text,
  date date not null,
  qte_achetee numeric not null,
  facture_nom text,
  created_at timestamptz default now()
);

-- Achats CBC/CBD
create table achats_cbd (
  id numeric primary key,
  produit_id text not null,
  prix_achat numeric not null,
  prix_vente numeric not null,
  quantite numeric default 0,
  date date not null,
  facture_nom text,
  created_at timestamptz default now()
);

-- Courses (dépenses Compta)
create table courses (
  id bigint primary key,
  date text,
  commercant text,
  montant numeric not null,
  mois integer not null, -- 0-11
  facture_nom text,
  created_at timestamptz default now()
);

-- Quantités planifiées par produit (Planif) — une ligne par produit, mise à jour
create table nbres_planifies (
  produit_id text primary key,
  quantite integer not null default 0,
  updated_at timestamptz default now()
);

-- Recettes/produits modifiables (prix de vente, ingrédients personnalisés)
create table produits (
  id text primary key,
  nom text not null,
  prix numeric not null,
  categorie text not null,
  allergenes jsonb default '[]',
  ingredients jsonb not null,
  feuille_brick boolean default false,
  nbre_par_fournee integer default 1,
  poids_total numeric default 0,
  updated_at timestamptz default now()
);

-- Référentiel CBC/CBD (taux, famille — structure statique mais modifiable)
create table cbc_data (
  id text primary key,
  nom text not null,
  type text,
  taux text,
  famille text not null,
  poids numeric default 1,
  prix_achat numeric,
  prix_vente numeric,
  updated_at timestamptz default now()
);

-- Paramètres globaux (un seul enregistrement, structure JSON complète)
create table params (
  id integer primary key default 1,
  data jsonb not null,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- ════════════════════════════════════════════
-- Row Level Security (RLS) — accès ouvert pour l'app (clé publique)
-- Adapté à un usage interne mono-utilisateur/équipe restreinte.
-- ════════════════════════════════════════════

alter table ventes enable row level security;
alter table journal_caisse enable row level security;
alter table achats_ingredients enable row level security;
alter table achats_cbd enable row level security;
alter table courses enable row level security;
alter table nbres_planifies enable row level security;
alter table produits enable row level security;
alter table cbc_data enable row level security;
alter table params enable row level security;

create policy "accès public lecture/écriture" on ventes for all using (true) with check (true);
create policy "accès public lecture/écriture" on journal_caisse for all using (true) with check (true);
create policy "accès public lecture/écriture" on achats_ingredients for all using (true) with check (true);
create policy "accès public lecture/écriture" on achats_cbd for all using (true) with check (true);
create policy "accès public lecture/écriture" on courses for all using (true) with check (true);
create policy "accès public lecture/écriture" on nbres_planifies for all using (true) with check (true);
create policy "accès public lecture/écriture" on produits for all using (true) with check (true);
create policy "accès public lecture/écriture" on cbc_data for all using (true) with check (true);
create policy "accès public lecture/écriture" on params for all using (true) with check (true);

-- Index pour accélérer les filtres par date (fréquents dans l'app)
create index idx_ventes_date on ventes(date);
create index idx_achats_ing_date on achats_ingredients(date);
create index idx_achats_cbd_date on achats_cbd(date);
create index idx_journal_date on journal_caisse(date);
