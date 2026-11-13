-- =====================================================================
--  Musique : le son du jour que chacun recommande à l'autre
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create table if not exists public.songs (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  title           text not null check (length(trim(title)) between 1 and 200),
  artist          text not null default '',
  cover_url       text,
  artist_picture  text,
  preview_url     text,
  link            text,
  note            text not null default '',
  -- Ce que l'autre en pense
  reaction        text,
  listened_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists songs_couple_idx on public.songs (couple_id, created_at desc);

create table if not exists public.song_comments (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references public.songs on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  couple_id   uuid not null references public.couples on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists song_comments_song_idx on public.song_comments (song_id, created_at);

alter table public.songs         enable row level security;
alter table public.song_comments enable row level security;

create policy "sons: lire" on public.songs for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "sons: recommander" on public.songs for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
-- L'autre peut réagir / marquer « écouté » (seules ces colonnes sont modifiables)
create policy "sons: réagir" on public.songs for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
revoke update on public.songs from authenticated;
grant update (reaction, listened_at, note) on public.songs to authenticated;
create policy "sons: supprimer les siens" on public.songs for delete to authenticated
  using (user_id = auth.uid());

create policy "commentaires sons: lire" on public.song_comments for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "commentaires sons: écrire" on public.song_comments for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "commentaires sons: supprimer les siens" on public.song_comments for delete to authenticated
  using (user_id = auth.uid());

alter table public.songs         replica identity full;
alter table public.song_comments replica identity full;

do $$
declare t text;
begin
  foreach t in array array['songs','song_comments'] loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
