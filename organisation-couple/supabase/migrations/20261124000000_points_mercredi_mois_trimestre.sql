-- =====================================================================
--  Nouveaux points : mercredi « Mi-temps », bilan du mois, trimestre
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1. Chaque point a un type. week_date = la date de référence du point :
--    semaine   → le dimanche
--    mercredi  → le mercredi de la semaine
--    mois      → le dernier jour du mois
--    trimestre → le dernier jour du trimestre
alter table public.points
  add column if not exists kind text not null default 'semaine',
  add column if not exists covers_week date;

do $$
declare c text;
begin
  if not exists (select 1 from pg_constraint where conname = 'points_kind_check') then
    alter table public.points add constraint points_kind_check
      check (kind in ('semaine','mercredi','mois','trimestre'));
  end if;
  -- l'ancienne unicité (couple, date) devient (couple, type, date)
  for c in
    select conname from pg_constraint
     where conrelid = 'public.points'::regclass and contype = 'u'
       and conname <> 'points_couple_kind_date_key'
  loop
    execute format('alter table public.points drop constraint %I', c);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'points_couple_kind_date_key') then
    alter table public.points add constraint points_couple_kind_date_key unique (couple_id, kind, week_date);
  end if;
end $$;

-- 2. Nouvelles réponses (chacun ne modifie que sa propre ligne)
alter table public.point_answers
  add column if not exists half1_score     smallint check (half1_score between 0 and 10),
  add column if not exists mid_review      text not null default '',
  add column if not exists mid_plan        text not null default '',
  add column if not exists month_pride     text not null default '',
  add column if not exists month_stuck     text not null default '',
  add column if not exists month_best      text not null default '',
  add column if not exists month_recurring text not null default '',
  add column if not exists month_improved  text not null default '',
  add column if not exists month_goals     text not null default '',
  add column if not exists avis_good       text not null default '',
  add column if not exists avis_evolve     text not null default '',
  add column if not exists q_live          text not null default '',
  add column if not exists q_become        text not null default '',
  add column if not exists q_goals         text not null default '';

grant update (half1_score, mid_review, mid_plan, month_pride, month_stuck, month_best,
              month_recurring, month_improved, month_goals, avis_good, avis_evolve,
              q_live, q_become, q_goals) on public.point_answers to authenticated;

-- 3. Listes écrites à deux : points noirs + solutions, objectif de couple, vision de couple
create table if not exists public.point_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples on delete cascade,
  point_id    uuid not null references public.points on delete cascade,
  kind        text not null check (kind in ('point_noir','objectif_couple','vision_couple')),
  body        text not null default '',
  solution    text not null default '',
  status      text check (status in ('regle','revient')),
  created_by  uuid references auth.users on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists point_items_couple_idx on public.point_items (couple_id, point_id);

alter table public.point_items enable row level security;
drop policy if exists "listes: lire" on public.point_items;
drop policy if exists "listes: ajouter" on public.point_items;
drop policy if exists "listes: modifier" on public.point_items;
drop policy if exists "listes: supprimer" on public.point_items;
create policy "listes: lire" on public.point_items for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "listes: ajouter" on public.point_items for insert to authenticated
  with check (couple_id = public.my_couple_id()
              and exists (select 1 from public.points p where p.id = point_id and p.couple_id = public.my_couple_id()));
create policy "listes: modifier" on public.point_items for update to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy "listes: supprimer" on public.point_items for delete to authenticated
  using (couple_id = public.my_couple_id());

revoke all on public.point_items from anon;
grant select, insert, delete on public.point_items to authenticated;
revoke update on public.point_items from authenticated;
grant update (body, solution, status, updated_at) on public.point_items to authenticated;

alter table public.point_items replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'point_items') then
    alter publication supabase_realtime add table public.point_items;
  end if;
end $$;

-- 4. Date de référence d'un point selon son type (heure de Paris)
create or replace function public.point_period(p_kind text)
returns date language plpgsql stable set search_path = public as $$
declare
  d date := (now() at time zone 'Europe/Paris')::date;
  q date;
begin
  if p_kind = 'mercredi' then
    return public.this_sunday() - 4;
  elsif p_kind = 'mois' then
    -- les 7 premiers jours du mois : c'est encore le bilan du mois d'avant
    if extract(day from d) <= 7 then d := d - 8; end if;
    return (date_trunc('month', d) + interval '1 month - 1 day')::date;
  elsif p_kind = 'trimestre' then
    q := (date_trunc('quarter', d) + interval '3 months - 1 day')::date;
    -- les 14 premiers jours d'un trimestre : c'est encore le trimestre d'avant
    if d - date_trunc('quarter', d)::date < 14 then
      q := (date_trunc('quarter', d) - interval '1 day')::date;
    end if;
    return q;
  end if;
  return public.this_sunday();
end $$;

-- 5. Lancer (ou reprendre) un point d'un type donné
drop function if exists public.start_point();
create or replace function public.start_point(p_kind text default 'semaine')
returns public.points language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.my_couple_id();
  p public.points;
  k text := coalesce(p_kind, 'semaine');
  wk date;
  st text[];
  today date := (now() at time zone 'Europe/Paris')::date;
  cover date;
begin
  if cid is null then raise exception 'Pas d''espace couple'; end if;
  if k not in ('semaine','mercredi','mois','trimestre') then raise exception 'Type de point inconnu'; end if;
  if (select count(*) from public.profiles where couple_id = cid) < 2 then
    raise exception 'Invite d''abord ta moitié avec le code 💌';
  end if;
  wk := public.point_period(k);

  -- Un point de ce type en cours ? On le reprend.
  select * into p from public.points
   where couple_id = cid and kind = k and status = 'en_cours'
   order by week_date desc limit 1;
  if found then return p; end if;

  -- Déjà fait pour cette période ? On le renvoie.
  select * into p from public.points where couple_id = cid and kind = k and week_date = wk;
  if found then return p; end if;

  if k = 'mercredi' then
    st := array['mi_constat','mi_note','mi_plan','recap'];

  elsif k = 'semaine' then
    st := array['humeur','objectifs','objectifs_suivants','relecture'];
    if exists (select 1 from public.outings
                where couple_id = cid and status = 'prevue'
                  and activity_id is not null and date <= today) then
      st := st || 'sortie'::text;
    end if;
    st := st || array['bilan','amelioration','outfits','rdv','recap'];

  else
    -- Le bilan remplace le point du dimanche : on garde la note de la 2e partie de semaine
    if extract(isodow from today) = 7
       and not exists (select 1 from public.points
                        where couple_id = cid and kind = 'semaine' and week_date = public.this_sunday()) then
      cover := public.this_sunday();
    end if;
    if k = 'mois' then
      st := array['mois_rappel','mois_chiffres','mois_recit'];
      if cover is not null then st := st || 'note_semaine'::text; end if;
      st := st || array['mois_perso','mois_couple','mois_ameliorations','mois_points_noirs','mois_objectifs','recap'];
    else
      st := array['tri_rappel','tri_score','tri_analyse'];
      if cover is not null then st := st || 'note_semaine'::text; end if;
      st := st || array['tri_avis','tri_vision','recap'];
    end if;
  end if;

  insert into public.points (couple_id, week_date, steps, kind, covers_week)
    values (cid, wk, st, k, cover) returning * into p;

  insert into public.point_answers (point_id, user_id, couple_id)
    select p.id, pr.id, cid from public.profiles pr where pr.couple_id = cid;

  return p;
end $$;

revoke execute on function public.start_point(text) from public, anon;
grant execute on function public.start_point(text) to authenticated;
revoke execute on function public.point_period(text) from public, anon;
grant execute on function public.point_period(text) to authenticated;
