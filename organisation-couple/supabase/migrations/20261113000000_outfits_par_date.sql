-- =====================================================================
--  Outfits : chaque photo est rattachée au jour où la tenue a été portée
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

alter table public.outfits add column if not exists worn_on date;

-- Les outfits déjà postés gardent leur jour de publication (heure de Paris)
update public.outfits
   set worn_on = (created_at at time zone 'Europe/Paris')::date
 where worn_on is null;

alter table public.outfits
  alter column worn_on set default ((now() at time zone 'Europe/Paris')::date),
  alter column worn_on set not null;

create index if not exists outfits_worn_on_idx on public.outfits (couple_id, worn_on desc);

-- Chacun peut corriger la date (et la légende) de ses propres outfits
drop policy if exists "outfits: modifier les siens" on public.outfits;
create policy "outfits: modifier les siens" on public.outfits for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());
revoke update on public.outfits from authenticated;
grant update (worn_on, caption) on public.outfits to authenticated;
