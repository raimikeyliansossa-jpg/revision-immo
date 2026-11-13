-- =====================================================================
--  Outfits : réaction de l'autre (un emoji + un petit commentaire)
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create table if not exists public.outfit_reactions (
  outfit_id   uuid not null references public.outfits on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  couple_id   uuid not null references public.couples on delete cascade,
  emoji       text,
  comment     text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (outfit_id, user_id)
);

create index if not exists outfit_reactions_couple_idx on public.outfit_reactions (couple_id);

alter table public.outfit_reactions enable row level security;

create policy "réactions outfits: lire" on public.outfit_reactions for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "réactions outfits: ajouter la sienne" on public.outfit_reactions for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "réactions outfits: modifier la sienne" on public.outfit_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "réactions outfits: supprimer la sienne" on public.outfit_reactions for delete to authenticated
  using (user_id = auth.uid());

alter table public.outfit_reactions replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'outfit_reactions') then
    alter publication supabase_realtime add table public.outfit_reactions;
  end if;
end $$;
