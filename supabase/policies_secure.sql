-- ════════════════════════════════════════════
-- Durcissement des policies RLS — à exécuter après schema.sql
-- Remplace l'accès public (using true) par un accès réservé aux utilisateurs
-- authentifiés (auth.uid() is not null), conforme à l'authentification par
-- compte partagé mise en place dans l'app (voir hooks/useAuth.js).
-- ════════════════════════════════════════════

-- On supprime les anciennes policies permissives...
drop policy if exists "accès public lecture/écriture" on ventes;
drop policy if exists "accès public lecture/écriture" on journal_caisse;
drop policy if exists "accès public lecture/écriture" on achats_ingredients;
drop policy if exists "accès public lecture/écriture" on achats_cbd;
drop policy if exists "accès public lecture/écriture" on courses;
drop policy if exists "accès public lecture/écriture" on nbres_planifies;
drop policy if exists "accès public lecture/écriture" on produits;
drop policy if exists "accès public lecture/écriture" on cbc_data;
drop policy if exists "accès public lecture/écriture" on params;

-- ...et on les remplace par des policies qui exigent une session valide.
create policy "utilisateurs authentifiés uniquement" on ventes
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on journal_caisse
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on achats_ingredients
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on achats_cbd
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on courses
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on nbres_planifies
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on produits
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on cbc_data
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "utilisateurs authentifiés uniquement" on params
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
