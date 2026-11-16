-- =====================================================================
--  Objectifs perso séparés du couple
--  - 3 cases pour les objectifs : atteints / pas atteints / pourquoi
--  - nouvel ordre des étapes : d'abord le perso, ensuite le couple
--  À coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

alter table public.point_answers
  add column if not exists goals_done   text not null default '',
  add column if not exists goals_missed text not null default '',
  add column if not exists goals_why    text not null default '';

grant update (goals_done, goals_missed, goals_why) on public.point_answers to authenticated;

-- Ordre des étapes pour les nouveaux points
--   Perso  : humeur → objectifs (bilan) → objectifs de la semaine prochaine
--   Couple : relecture de l'amélioration → dernière sortie → bien / moins bien
--            → amélioration de la semaine prochaine → outfits → rendez-vous
--   Fin    : récap
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

  st := array['humeur','objectifs','objectifs_suivants','relecture'];
  if exists (select 1 from public.outings
              where couple_id = cid and status = 'prevue'
                and activity_id is not null
                and date <= (now() at time zone 'Europe/Paris')::date) then
    st := st || 'sortie'::text;
  end if;
  st := st || array['bilan','amelioration','outfits','rdv','recap'];

  insert into public.points (couple_id, week_date, steps)
    values (cid, wk, st) returning * into p;

  insert into public.point_answers (point_id, user_id, couple_id)
    select p.id, pr.id, cid from public.profiles pr where pr.couple_id = cid;

  return p;
end $$;

revoke execute on function public.start_point() from public, anon;
grant execute on function public.start_point() to authenticated;
