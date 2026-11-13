-- =====================================================================
--  Outfits : petite conversation sous chaque outfit (vous deux, autant
--  de messages que vous voulez). Les emojis restent dans outfit_reactions.
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create table if not exists public.outfit_comments (
  id          uuid primary key default gen_random_uuid(),
  outfit_id   uuid not null references public.outfits on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  couple_id   uuid not null references public.couples on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists outfit_comments_outfit_idx on public.outfit_comments (outfit_id, created_at);
create index if not exists outfit_comments_couple_idx on public.outfit_comments (couple_id);

alter table public.outfit_comments enable row level security;

create policy "commentaires outfits: lire" on public.outfit_comments for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "commentaires outfits: écrire" on public.outfit_comments for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "commentaires outfits: supprimer les siens" on public.outfit_comments for delete to authenticated
  using (user_id = auth.uid());

-- Les petits mots déjà laissés deviennent le premier message de la conversation
insert into public.outfit_comments (outfit_id, user_id, couple_id, body, created_at)
select outfit_id, user_id, couple_id, comment, updated_at
  from public.outfit_reactions r
 where trim(comment) <> ''
   and not exists (select 1 from public.outfit_comments c
                    where c.outfit_id = r.outfit_id and c.user_id = r.user_id and c.body = r.comment);

alter table public.outfit_comments replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'outfit_comments') then
    alter publication supabase_realtime add table public.outfit_comments;
  end if;
end $$;
