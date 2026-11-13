-- =====================================================================
--  Organisation couple — schéma complet
--  À coller tel quel dans Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.couples (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique not null,
  cover_path   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  couple_id     uuid references public.couples on delete set null,
  display_name  text not null default '',
  emoji         text not null default '❤️',
  created_at    timestamptz not null default now()
);

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples on delete cascade,
  name        text not null,
  emoji       text not null default '✨',
  months      smallint[] not null default '{1,2,3,4,5,6,7,8,9,10,11,12}',
  location    text not null default 'interieur' check (location in ('interieur','exterieur')),
  budget      text not null default 'petit' check (budget in ('petit','gros')),
  created_at  timestamptz not null default now()
);

create table if not exists public.points (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples on delete cascade,
  week_date     date not null,
  steps         text[] not null,
  current_step  smallint not null default 0,
  max_step      smallint not null default 0,
  status        text not null default 'en_cours' check (status in ('en_cours','termine')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  unique (couple_id, week_date)
);

create table if not exists public.point_answers (
  point_id          uuid not null references public.points on delete cascade,
  user_id           uuid not null references auth.users on delete cascade,
  couple_id         uuid not null references public.couples on delete cascade,
  review_status     text check (review_status in ('tenu','moitie','pas_tenu')),
  mood              text,
  week_score        smallint check (week_score between 0 and 10),
  goals_review      text not null default '',
  good_things       text not null default '',
  less_good         text not null default '',
  next_improvement  text not null default '',
  next_goals        text not null default '',
  ready_step        smallint,
  updated_at        timestamptz not null default now(),
  primary key (point_id, user_id)
);

create table if not exists public.outings (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references public.couples on delete cascade,
  date               date not null,
  activity_id        uuid references public.activities on delete set null,
  activity_name      text,
  activity_emoji     text,
  steps_goal         integer,
  status             text not null default 'prevue' check (status in ('prevue','faite','pas_faite')),
  point_id           uuid references public.points on delete set null,
  reviewed_point_id  uuid references public.points on delete set null,
  created_at         timestamptz not null default now()
);

create table if not exists public.outing_ratings (
  outing_id   uuid not null references public.outings on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  couple_id   uuid not null references public.couples on delete cascade,
  score       smallint check (score between 0 and 10),
  comment     text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (outing_id, user_id)
);

create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  path        text not null,
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  path        text not null,
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists activities_couple_idx on public.activities (couple_id);
create index if not exists points_couple_idx on public.points (couple_id, week_date desc);
create index if not exists outings_couple_idx on public.outings (couple_id, date);
create index if not exists outfits_couple_idx on public.outfits (couple_id, created_at desc);
create index if not exists memories_couple_idx on public.memories (couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. Petites fonctions utilitaires
-- ---------------------------------------------------------------------

create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- Date du dimanche de la semaine en cours (heure de Paris)
create or replace function public.this_sunday()
returns date language sql stable as $$
  select d + ((7 - extract(isodow from d)::int) % 7)
  from (select (now() at time zone 'Europe/Paris')::date as d) t
$$;

create or replace function public.seed_activities(p_couple uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  all_year smallint[] := '{1,2,3,4,5,6,7,8,9,10,11,12}';
begin
  insert into public.activities (couple_id, name, emoji, months, location, budget) values
    (p_couple, 'Cinéma', '🎬', all_year, 'interieur', 'petit'),
    (p_couple, 'Randonnée', '🥾', '{4,5,6,7,8,9,10}', 'exterieur', 'petit'),
    (p_couple, 'Journée photos', '📸', all_year, 'exterieur', 'petit'),
    (p_couple, 'Théâtre', '🎭', all_year, 'interieur', 'gros'),
    (p_couple, 'Comedy club', '🎤', all_year, 'interieur', 'gros'),
    (p_couple, 'Tête dans les nuages', '🕹️', all_year, 'interieur', 'gros'),
    (p_couple, 'Atelier cuisine', '👩‍🍳', all_year, 'interieur', 'gros'),
    (p_couple, 'Atelier poterie', '🏺', all_year, 'interieur', 'gros'),
    (p_couple, 'Peinture', '🎨', all_year, 'interieur', 'petit'),
    (p_couple, 'Lego', '🧱', all_year, 'interieur', 'petit'),
    (p_couple, 'Marché de Noël', '🎄', '{11,12}', 'exterieur', 'petit'),
    (p_couple, 'Patinoire', '⛸️', '{11,12,1,2,3}', 'interieur', 'petit'),
    (p_couple, 'Badminton', '🏸', all_year, 'interieur', 'petit'),
    (p_couple, 'Concert orchestre', '🎻', all_year, 'interieur', 'gros'),
    (p_couple, 'Concert piano', '🎹', all_year, 'interieur', 'gros'),
    (p_couple, 'Journée shopping vintage', '🧥', all_year, 'interieur', 'petit'),
    (p_couple, 'Journée soldes', '🛍️', '{1,2,6,7}', 'interieur', 'gros'),
    (p_couple, 'Musée', '🖼️', all_year, 'interieur', 'petit'),
    (p_couple, 'Pique-nique', '🧺', '{5,6,7,8,9}', 'exterieur', 'petit'),
    (p_couple, 'Journée jeux', '🎲', all_year, 'interieur', 'petit'),
    (p_couple, 'Journée lecture', '📚', all_year, 'interieur', 'petit'),
    (p_couple, 'Journée musique album', '🎧', all_year, 'interieur', 'petit'),
    (p_couple, 'Journée séries/films avec skincare', '🧖', all_year, 'interieur', 'petit'),
    (p_couple, 'Spa', '🛁', all_year, 'interieur', 'gros'),
    (p_couple, 'Journée sport', '🏃', all_year, 'exterieur', 'petit'),
    (p_couple, 'Marche à pied', '👟', all_year, 'exterieur', 'petit'),
    (p_couple, 'Resto', '🍽️', all_year, 'interieur', 'gros'),
    (p_couple, 'Atelier création parfum', '🌸', all_year, 'interieur', 'gros'),
    (p_couple, 'Piscine', '🏊', all_year, 'interieur', 'petit'),
    (p_couple, 'Accrobranche', '🌳', '{4,5,6,7,8,9,10}', 'exterieur', 'gros'),
    (p_couple, 'Atelier bracelets', '📿', all_year, 'interieur', 'petit'),
    (p_couple, 'Mini golf', '⛳', '{4,5,6,7,8,9,10}', 'exterieur', 'petit'),
    (p_couple, 'Barque', '🚣', '{5,6,7,8,9}', 'exterieur', 'petit'),
    (p_couple, 'Journée cueillette', '🍓', '{5,6,7,8,9,10}', 'exterieur', 'petit');
end $$;

-- ---------------------------------------------------------------------
-- 3. Créer / rejoindre l'espace couple
-- ---------------------------------------------------------------------

create or replace function public.create_couple(p_name text, p_emoji text)
returns public.couples language plpgsql security definer set search_path = public as $$
declare
  c public.couples;
  code text;
  i int;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and couple_id is not null) then
    raise exception 'Tu fais déjà partie d''un espace couple';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1);
    end loop;
    exit when not exists (select 1 from public.couples where invite_code = code);
  end loop;
  insert into public.couples (invite_code) values (code) returning * into c;
  insert into public.profiles (id, couple_id, display_name, emoji)
    values (auth.uid(), c.id, p_name, p_emoji)
    on conflict (id) do update set couple_id = excluded.couple_id,
      display_name = excluded.display_name, emoji = excluded.emoji;
  perform public.seed_activities(c.id);
  return c;
end $$;

create or replace function public.join_couple(p_code text, p_name text, p_emoji text)
returns public.couples language plpgsql security definer set search_path = public as $$
declare
  c public.couples;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into c from public.couples where invite_code = upper(trim(p_code)) for update;
  if not found then raise exception 'Code d''invitation inconnu'; end if;
  if (select count(*) from public.profiles where couple_id = c.id and id <> auth.uid()) >= 2 then
    raise exception 'Cet espace est déjà complet (2 personnes)';
  end if;
  insert into public.profiles (id, couple_id, display_name, emoji)
    values (auth.uid(), c.id, p_name, p_emoji)
    on conflict (id) do update set couple_id = excluded.couple_id,
      display_name = excluded.display_name, emoji = excluded.emoji;
  return c;
end $$;

-- ---------------------------------------------------------------------
-- 4. Le point du dimanche : démarrer, « Prêt ✓ », revenir en arrière
-- ---------------------------------------------------------------------

create or replace function public.start_point()
returns public.points language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_couple_id();
  p public.points;
  wk date := public.this_sunday();
  st text[];
begin
  if cid is null then raise exception 'Pas d''espace couple'; end if;
  if (select count(*) from public.profiles where couple_id = cid) < 2 then
    raise exception 'Invite d''abord ta moitié avec le code 💌';
  end if;

  -- Un point en cours ? On le reprend.
  select * into p from public.points
   where couple_id = cid and status = 'en_cours'
   order by week_date desc limit 1;
  if found then return p; end if;

  -- Le point de ce dimanche existe déjà (terminé) ? On le renvoie.
  select * into p from public.points where couple_id = cid and week_date = wk;
  if found then return p; end if;

  st := array['relecture'];
  if exists (select 1 from public.outings
              where couple_id = cid and status = 'prevue'
                and activity_id is not null
                and date <= (now() at time zone 'Europe/Paris')::date) then
    st := st || 'sortie'::text;
  end if;
  st := st || array['humeur','objectifs','bilan','prochaine','outfits','rdv','recap'];

  insert into public.points (couple_id, week_date, steps)
    values (cid, wk, st) returning * into p;

  insert into public.point_answers (point_id, user_id, couple_id)
    select p.id, pr.id, cid from public.profiles pr where pr.couple_id = cid;

  return p;
end $$;

create or replace function public.set_ready(p_point uuid, p_step int, p_ready boolean)
returns public.points language plpgsql security definer set search_path = public as $$
declare
  p public.points;
  last_idx int;
  nxt int;
begin
  select * into p from public.points
   where id = p_point and couple_id = public.my_couple_id() for update;
  if not found then raise exception 'Point introuvable'; end if;

  update public.point_answers
     set ready_step = case when p_ready then p_step else null end, updated_at = now()
   where point_id = p_point and user_id = auth.uid();

  if p_ready and p_step = p.current_step
     and (select count(*) from public.point_answers
           where point_id = p_point and ready_step = p.current_step) >= 2 then
    last_idx := array_length(p.steps, 1) - 1;
    nxt := least(p.current_step + 1, last_idx);
    update public.points
       set current_step = nxt,
           max_step = greatest(max_step, nxt),
           status = case when nxt = last_idx then 'termine' else status end,
           completed_at = case when nxt = last_idx and completed_at is null then now() else completed_at end
     where id = p_point
     returning * into p;
  end if;
  return p;
end $$;

create or replace function public.go_to_step(p_point uuid, p_step int)
returns public.points language plpgsql security definer set search_path = public as $$
declare
  p public.points;
begin
  select * into p from public.points
   where id = p_point and couple_id = public.my_couple_id() for update;
  if not found then raise exception 'Point introuvable'; end if;
  if p_step < 0 or p_step > p.max_step then raise exception 'Étape pas encore débloquée'; end if;
  update public.point_answers set ready_step = null where point_id = p_point;
  update public.points set current_step = p_step where id = p_point returning * into p;
  return p;
end $$;

grant execute on function public.create_couple(text, text) to authenticated;
grant execute on function public.join_couple(text, text, text) to authenticated;
grant execute on function public.start_point() to authenticated;
grant execute on function public.set_ready(uuid, int, boolean) to authenticated;
grant execute on function public.go_to_step(uuid, int) to authenticated;
revoke execute on function public.seed_activities(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Sécurité (RLS) : seules les 2 personnes du couple voient leurs données
-- ---------------------------------------------------------------------

alter table public.couples            enable row level security;
alter table public.profiles           enable row level security;
alter table public.activities         enable row level security;
alter table public.points             enable row level security;
alter table public.point_answers      enable row level security;
alter table public.outings            enable row level security;
alter table public.outing_ratings     enable row level security;
alter table public.outfits            enable row level security;
alter table public.memories           enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "couple: lire" on public.couples for select to authenticated
  using (id = public.my_couple_id());
create policy "couple: modifier" on public.couples for update to authenticated
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());

create policy "profils: lire" on public.profiles for select to authenticated
  using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "profils: modifier le sien" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- on ne peut modifier que prénom et emoji (pas changer de couple)
revoke update on public.profiles from authenticated;
grant update (display_name, emoji) on public.profiles to authenticated;
revoke update on public.couples from authenticated;
grant update (cover_path) on public.couples to authenticated;

create policy "activités: tout" on public.activities for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy "points: lire" on public.points for select to authenticated
  using (couple_id = public.my_couple_id());

create policy "réponses: lire" on public.point_answers for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "réponses: modifier la sienne" on public.point_answers for update to authenticated
  using (user_id = auth.uid() and couple_id = public.my_couple_id())
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
revoke update on public.point_answers from authenticated;
grant update (review_status, mood, week_score, goals_review, good_things, less_good,
              next_improvement, next_goals, updated_at) on public.point_answers to authenticated;

create policy "sorties: tout" on public.outings for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

create policy "notes: lire" on public.outing_ratings for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "notes: ajouter la sienne" on public.outing_ratings for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "notes: modifier la sienne" on public.outing_ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and couple_id = public.my_couple_id());

create policy "outfits: lire" on public.outfits for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "outfits: ajouter" on public.outfits for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "outfits: supprimer les siens" on public.outfits for delete to authenticated
  using (user_id = auth.uid());

create policy "souvenirs: lire" on public.memories for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "souvenirs: ajouter" on public.memories for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "souvenirs: supprimer" on public.memories for delete to authenticated
  using (couple_id = public.my_couple_id());

create policy "push: les siens" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. Temps réel
-- ---------------------------------------------------------------------

alter table public.points         replica identity full;
alter table public.point_answers  replica identity full;
alter table public.outings        replica identity full;
alter table public.outing_ratings replica identity full;
alter table public.outfits        replica identity full;
alter table public.memories       replica identity full;
alter table public.activities     replica identity full;
alter table public.couples        replica identity full;
alter table public.profiles       replica identity full;

do $$
declare t text;
begin
  foreach t in array array['points','point_answers','outings','outing_ratings','outfits',
                           'memories','activities','couples','profiles'] loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Canal privé « couple:<id> » (présence, « écrit… », frappe en direct)
create policy "temps réel: recevoir" on realtime.messages for select to authenticated
  using (realtime.topic() = 'couple:' || public.my_couple_id()::text);
create policy "temps réel: envoyer" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'couple:' || public.my_couple_id()::text);

-- ---------------------------------------------------------------------
-- 7. Stockage privé des photos (dossier = id du couple)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "photos: lire" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "photos: ajouter" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "photos: supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple_id()::text);
