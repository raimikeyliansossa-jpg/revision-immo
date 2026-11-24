"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, errMsg } from "@/lib/supabase";
import type { Answer, Outing, Photo, PointItem, Profile, StepKey } from "@/lib/types";
import { REVIEW_OPTIONS, capitalize, formatDate } from "@/lib/constants";
import {
  SCORE_RULES,
  addDays,
  lastPlan,
  monthLabel,
  monthPeriod,
  pointNoirSource,
  prevMonthEnd,
  prevQuarterEnd,
  quarterAnalysis,
  quarterMonths,
  quarterNoirs,
  quarterScore,
  type Period,
} from "@/lib/bilan";
import { useApp, useDebouncedSave, useLive } from "../Providers";
import { Button, Card, Empty, Media, cx, fullName, nameOf } from "../ui";
import { Duo, DuoText, ScoreInput } from "./duo";
import type { PointCtx } from "./PointScreen";

const BILAN_STEPS = new Set<StepKey>([
  "mi_constat",
  "mi_note",
  "mi_plan",
  "mois_rappel",
  "mois_chiffres",
  "mois_recit",
  "mois_perso",
  "mois_couple",
  "mois_ameliorations",
  "mois_points_noirs",
  "mois_objectifs",
  "tri_rappel",
  "tri_score",
  "tri_analyse",
  "tri_avis",
  "tri_vision",
  "note_semaine",
]);

export function isBilanStep(step: StepKey) {
  return BILAN_STEPS.has(step);
}

export function BilanStep({ step, ctx }: { step: StepKey; ctx: PointCtx }) {
  switch (step) {
    // ------------------------- Mercredi -------------------------
    case "mi_constat":
      return (
        <div className="flex flex-col gap-5">
          <Reminders ctx={ctx} week month />
          <DuoText
            ctx={ctx}
            field="mid_review"
            label="📝 Mon constat sur la 1re partie de semaine"
            placeholder={"Ce qui avance…\nCe qui traîne…"}
            rows={6}
          />
        </div>
      );
    case "mi_note":
      return <HalfNote ctx={ctx} />;
    case "mi_plan":
      return (
        <div className="flex flex-col gap-4">
          <DuoText
            ctx={ctx}
            field="mid_plan"
            label="💪 Ce que je fais pour la 2e partie de semaine"
            placeholder={"Concrètement, je vais…"}
            rows={6}
            hint="Ça te sera rappelé dimanche, pour vérifier que tu l'as fait 😉"
          />
          <Card className="bg-gradient-to-br from-rose-soft to-peach-soft text-center text-sm">
            🎯 Objectif : une <b>2e partie de semaine meilleure que la 1re</b>. Dimanche, on compare les deux notes 📈
          </Card>
        </div>
      );

    // ------------------------- Bilan du mois -------------------------
    case "mois_rappel":
      return <PointsNoirsReview ctx={ctx} />;
    case "mois_chiffres":
      return <MonthNumbers ctx={ctx} />;
    case "mois_recit":
      return <MonthStory ctx={ctx} />;
    case "mois_perso":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="month_pride" label="🏅 Ma plus grande fierté du mois" placeholder="Je suis fier·e de…" rows={4} />
          <DuoText ctx={ctx} field="month_stuck" label="🚧 Ce qui a coincé" placeholder="J'ai eu du mal avec…" rows={4} />
        </div>
      );
    case "mois_couple":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="month_best" label="💖 Notre plus beau moment du mois" placeholder="Quand on…" rows={4} />
          <DuoText ctx={ctx} field="month_recurring" label="🔁 Le sujet qui est revenu plusieurs fois" placeholder="On a souvent parlé de…" rows={4} />
        </div>
      );
    case "mois_ameliorations":
      return <MonthImprovements ctx={ctx} />;
    case "mois_points_noirs":
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Ce qu&apos;on n&apos;a pas réussi à mettre en place. Pour chacun, réfléchissez tout de suite à <b>la solution</b> et écrivez-la.
            Vous les retrouverez au début du prochain bilan.
          </p>
          <ItemsList ctx={ctx} kind="point_noir" withSolution addLabel="＋ Ajouter un point noir" placeholder="Ce qu'on n'arrive pas à mettre en place…" />
        </div>
      );
    case "mois_objectifs":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="month_goals" label="🙋 Mon objectif perso du mois prochain" placeholder="Ce mois-ci, je vais…" rows={4} />
          <section>
            <h2 className="mb-2 text-[0.95rem] font-semibold">💑 Notre objectif de couple</h2>
            <ItemsList ctx={ctx} kind="objectif_couple" addLabel="＋ Ajouter notre objectif" placeholder="Ensemble, ce mois-ci, on va…" />
          </section>
          <p className="text-xs text-muted">Ils s&apos;afficheront en rappel à chaque point du dimanche et du mercredi 🔔</p>
        </div>
      );

    // ------------------------- Trimestre -------------------------
    case "tri_rappel":
      return <QuarterRecall ctx={ctx} />;
    case "tri_score":
      return <QuarterScore ctx={ctx} />;
    case "tri_analyse":
      return <QuarterAnalysis ctx={ctx} />;
    case "tri_avis":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="avis_good" label={`💖 Ce que l'autre a fait de bien ces 3 mois`} placeholder="J'ai aimé que tu…" rows={5} />
          <DuoText ctx={ctx} field="avis_evolve" label="🌱 Ce que j'aimerais voir évoluer chez l'autre" placeholder="J'aimerais qu'on…" rows={5} />
        </div>
      );
    case "tri_vision":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="q_live" label="🌍 Ce que je veux vivre dans les 3 prochains mois" placeholder="Je veux…" rows={4} />
          <DuoText ctx={ctx} field="q_become" label="🦋 Qui je veux devenir" placeholder="Je veux devenir quelqu'un qui…" rows={4} />
          <DuoText ctx={ctx} field="q_goals" label="🎯 Mes grands objectifs pour y arriver" placeholder={"1. …\n2. …\n3. …"} rows={5} />
          <section>
            <h2 className="mb-2 text-[0.95rem] font-semibold">💑 Ce qu&apos;on veut vivre et construire ensemble</h2>
            <ItemsList ctx={ctx} kind="vision_couple" addLabel="＋ Ajouter un projet à deux" placeholder="Ensemble, on veut…" />
          </section>
          <p className="text-xs text-muted">Tout ça vous sera ressorti au prochain point du trimestre 🔁</p>
        </div>
      );
    case "note_semaine":
      return (
        <div className="flex flex-col gap-4">
          <Card className="text-sm">
            Le bilan remplace le point de ce dimanche : on garde quand même <b>la note de la semaine</b>, pour qu&apos;il ne manque rien dans la courbe 📈
          </Card>
          <WeekNotes ctx={ctx} />
        </div>
      );
    default:
      return null;
  }
}

// =====================================================================
// Petits éléments
// =====================================================================

function Loading() {
  return <p className="py-10 text-center text-3xl">⏳</p>;
}

function Text({ v, empty = "—" }: { v?: string | null; empty?: string }) {
  return <p className="whitespace-pre-wrap break-words text-sm">{v?.trim() ? v : <i className="text-muted">{empty}</i>}</p>;
}

function fmt(n: number | null, digits = 1) {
  return n === null ? "–" : n.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

/** Pastille verte / rouge par rapport à la période précédente */
export function Delta({ cur, prev, unit = "", digits = 1, lowerIsBetter = false }: { cur: number | null; prev: number | null; unit?: string; digits?: number; lowerIsBetter?: boolean }) {
  if (cur === null || prev === null) return <span className="text-xs text-muted">pas de comparaison</span>;
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return <span className="rounded-full bg-line px-2 py-0.5 text-xs font-semibold">= stable</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span
      className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", good ? "bg-good/15 text-good" : "bg-bad/15 text-bad")}
      data-testid={good ? "delta-green" : "delta-red"}
    >
      {good ? "🟢" : "🔴"} {d > 0 ? "+" : ""}
      {fmt(d, digits)}
      {unit}
    </span>
  );
}

function people(ctx: PointCtx): Profile[] {
  return [ctx.me, ctx.partner];
}

// =====================================================================
// Rappels : objectifs du dimanche, du mois, du trimestre
// =====================================================================

export function Reminders({
  ctx,
  week = false,
  midPlan = false,
  month = false,
  quarter = false,
}: {
  ctx: PointCtx;
  week?: boolean;
  midPlan?: boolean;
  month?: boolean;
  quarter?: boolean;
}) {
  const h = ctx.hist;
  if (!h) return null;
  const ans = (pid: string | undefined, uid: string) => (pid ? h.answers.find((a) => a.point_id === pid && a.user_id === uid) : undefined);
  const { mois, tri } = lastPlan(h, ctx.point.week_date);
  const mid = h.points.find((p) => p.kind === "mercredi" && p.week_date === addDays(ctx.point.week_date, -4));
  const coupleGoals = mois ? h.items.filter((i) => i.point_id === mois.id && i.kind === "objectif_couple" && i.body.trim()) : [];
  const blocks: React.ReactNode[] = [];

  if (week && ctx.prev.exists)
    blocks.push(
      <Duo key="w" ctx={ctx} label="🗒️ Mes objectifs fixés dimanche" mine={<Text v={ctx.prev.mine?.next_goals} empty="Aucun objectif fixé" />} theirs={<Text v={ctx.prev.theirs?.next_goals} empty="Aucun objectif fixé" />} />,
    );
  if (midPlan && mid)
    blocks.push(
      <Duo
        key="mp"
        ctx={ctx}
        label="💪 Ce que j'avais promis mercredi pour la 2e partie"
        mine={<Text v={ans(mid.id, ctx.me.id)?.mid_plan} />}
        theirs={<Text v={ans(mid.id, ctx.partner.id)?.mid_plan} />}
      />,
    );
  if (month && mois) {
    blocks.push(
      <Duo
        key="m"
        ctx={ctx}
        label={`📅 Mon objectif du mois (bilan de ${monthLabel(mois.week_date).split(" ")[0]})`}
        mine={<Text v={ans(mois.id, ctx.me.id)?.month_goals} empty="Aucun" />}
        theirs={<Text v={ans(mois.id, ctx.partner.id)?.month_goals} empty="Aucun" />}
      />,
    );
    if (coupleGoals.length)
      blocks.push(
        <Card key="mc" className="bg-rose-soft/60 p-4">
          <p className="text-xs font-semibold text-rose">💑 Notre objectif de couple du mois</p>
          {coupleGoals.map((g) => (
            <p key={g.id} className="mt-1 whitespace-pre-wrap text-[15px]">
              {g.body}
            </p>
          ))}
        </Card>,
      );
  }
  if (quarter && tri)
    blocks.push(
      <Duo
        key="t"
        ctx={ctx}
        label="🌱 Mes grands objectifs du trimestre"
        mine={<Text v={ans(tri.id, ctx.me.id)?.q_goals} empty="Aucun" />}
        theirs={<Text v={ans(tri.id, ctx.partner.id)?.q_goals} empty="Aucun" />}
      />,
    );
  if (!blocks.length) return null;
  return (
    <div className="flex flex-col gap-4" data-testid="reminders">
      {blocks}
    </div>
  );
}

// =====================================================================
// Notes : 1re partie (mercredi) / 2e partie (dimanche)
// =====================================================================

function HalfNote({ ctx }: { ctx: PointCtx }) {
  const theirs = useLive(ctx.partner.id, "ans:half1_score", ctx.theirs.half1_score);
  return (
    <div className="flex flex-col gap-4">
      <Duo
        ctx={ctx}
        label="🔢 Ma note de la 1re partie de semaine (lundi → mercredi)"
        mine={<ScoreInput value={ctx.mine.half1_score} onChange={(v) => ctx.setMine("half1_score", v)} testId="mine-half1" />}
        theirs={
          <p className="py-2 text-center font-display text-4xl font-semibold text-rose" data-testid="theirs-half1">
            {theirs ?? "–"}
            <span className="text-base text-muted">/10</span>
          </p>
        }
      />
      <p className="text-xs text-muted">Dimanche, vous mettrez la note de la 2e partie. La note de la semaine sera la moyenne des deux.</p>
    </div>
  );
}

/** Dimanche (ou bilan qui le remplace) : note de la 2e partie + rattrapage de la 1re si le mercredi a été raté */
export function WeekNotes({ ctx }: { ctx: PointCtx }) {
  const sunday = ctx.point.kind === "semaine" ? ctx.point.week_date : ctx.point.covers_week || ctx.point.week_date;
  const mid = ctx.hist?.points.find((p) => p.kind === "mercredi" && p.week_date === addDays(sunday, -4));
  const midAns = (uid: string) => (mid ? ctx.hist?.answers.find((a) => a.point_id === mid.id && a.user_id === uid) : undefined);
  const myMid = midAns(ctx.me.id)?.half1_score ?? null;
  const theirMid = midAns(ctx.partner.id)?.half1_score ?? null;
  const theirH2 = useLive(ctx.partner.id, "ans:week_score", ctx.theirs.week_score);
  const theirH1Live = useLive(ctx.partner.id, "ans:half1_score", ctx.theirs.half1_score);
  const myH1 = myMid ?? ctx.mine.half1_score;
  const theirH1 = theirMid ?? theirH1Live;

  const summary = (h1: number | null, h2: number | null) => {
    const avg = h1 !== null && h2 !== null ? (h1 + h2) / 2 : (h2 ?? h1);
    return (
      <div className="rounded-2xl bg-cream p-2 text-center text-xs" data-testid="week-summary">
        <p>
          1re : <b>{h1 ?? "–"}</b> · 2e : <b>{h2 ?? "–"}</b>
        </p>
        <p className="mt-1 font-display text-xl font-semibold text-rose">{fmt(avg)}/10</p>
        {h1 !== null && h2 !== null && h1 !== h2 && (
          <p className={cx("font-semibold", h2 > h1 ? "text-good" : "text-bad")}>
            {h2 > h1 ? "📈" : "📉"} {h2 > h1 ? "+" : ""}
            {h2 - h1} en 2e partie
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Duo
        ctx={ctx}
        label="🔢 Ma note de la 2e partie de semaine (jeudi → dimanche)"
        mine={<ScoreInput value={ctx.mine.week_score} onChange={(v) => ctx.setMine("week_score", v)} testId="mine-score" />}
        theirs={
          <p className="py-2 text-center font-display text-4xl font-semibold text-rose" data-testid="theirs-score">
            {theirH2 ?? "–"}
            <span className="text-base text-muted">/10</span>
          </p>
        }
      />
      {(myMid === null || theirMid === null) && (
        <Duo
          ctx={ctx}
          label="⏪ Pas de note mercredi ? Note de la 1re partie (lundi → mercredi)"
          mine={
            myMid === null ? (
              <ScoreInput value={ctx.mine.half1_score} onChange={(v) => ctx.setMine("half1_score", v)} testId="mine-half1" />
            ) : (
              <p className="py-2 text-center text-sm text-muted">Déjà notée mercredi : <b className="text-ink">{myMid}/10</b></p>
            )
          }
          theirs={
            <p className="py-2 text-center font-display text-4xl font-semibold text-rose" data-testid="theirs-half1">
              {theirH1 ?? "–"}
              <span className="text-base text-muted">/10</span>
            </p>
          }
        />
      )}
      <Duo ctx={ctx} label="📊 Ma note de la semaine (moyenne des deux)" mine={summary(myH1, ctx.mine.week_score)} theirs={summary(theirH1, theirH2)} />
    </div>
  );
}

// =====================================================================
// Listes écrites à deux (points noirs, objectif de couple, vision)
// =====================================================================

function ItemsList({
  ctx,
  kind,
  withSolution = false,
  addLabel,
  placeholder,
}: {
  ctx: PointCtx;
  kind: PointItem["kind"];
  withSolution?: boolean;
  addLabel: string;
  placeholder: string;
}) {
  const { toast, hint, track } = useApp();
  const [extra, setExtra] = useState<PointItem[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const fromHist = (ctx.hist?.items || []).filter((i) => i.point_id === ctx.point.id && i.kind === kind);
  const items = [...fromHist, ...extra.filter((e) => !fromHist.some((i) => i.id === e.id))].filter((i) => !removed.has(i.id));

  async function add() {
    const { data, error } = await track(
      Promise.resolve(supabase().from("point_items").insert({ couple_id: ctx.point.couple_id, point_id: ctx.point.id, kind }).select().single()),
    );
    if (error) return toast(errMsg(error));
    setExtra((e) => [...e, data as PointItem]);
    hint("point_items");
  }
  async function remove(id: string) {
    setRemoved((r) => new Set(r).add(id));
    const { error } = await track(Promise.resolve(supabase().from("point_items").delete().eq("id", id)));
    if (error) toast(errMsg(error));
    hint("point_items");
  }

  return (
    <div className="flex flex-col gap-3" data-testid={`items-${kind}`}>
      {items.length === 0 && <p className="rounded-2xl bg-card p-4 text-center text-sm text-muted">Rien pour l&apos;instant.</p>}
      {items.map((it, i) => (
        <ItemRow key={it.id} item={it} index={i} withSolution={withSolution} placeholder={placeholder} onRemove={() => remove(it.id)} />
      ))}
      <Button variant="soft" onClick={add} data-testid={`add-${kind}`}>
        {addLabel}
      </Button>
    </div>
  );
}

function ItemRow({
  item,
  index,
  withSolution,
  placeholder,
  onRemove,
}: {
  item: PointItem;
  index: number;
  withSolution: boolean;
  placeholder: string;
  onRemove: () => void;
}) {
  const { hint } = useApp();
  const [body, setBody] = useState(item.body);
  const [solution, setSolution] = useState(item.solution);
  // Les modifications de l'autre s'affichent dès que je ne tape plus depuis un instant
  const lastEdit = useRef(0);
  const latest = useRef(item);
  latest.current = item;
  useEffect(() => {
    const apply = () => {
      setBody(latest.current.body);
      setSolution(latest.current.solution);
    };
    const wait = 1500 - (Date.now() - lastEdit.current);
    if (wait <= 0) return apply();
    const t = setTimeout(apply, wait);
    return () => clearTimeout(t);
  }, [item.body, item.solution]);
  const { queue, flush } = useDebouncedSave<{ body?: string; solution?: string }>((patch) => {
    const r = supabase()
      .from("point_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    return Promise.resolve(r).then((x) => {
      hint("point_items");
      return x;
    });
  }, 600);
  const field = (v: string, set: (s: string) => void, key: "body" | "solution", ph: string, rows: number, testId: string) => (
    <textarea
      value={v}
      rows={rows}
      placeholder={ph}
      data-testid={testId}
      onBlur={flush}
      onChange={(e) => {
        lastEdit.current = Date.now();
        set(e.target.value);
        queue({ [key]: e.target.value });
      }}
      className="w-full rounded-2xl bg-cream px-3 py-2 leading-snug outline-none ring-rose/40 focus:ring-2"
    />
  );
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{withSolution ? `⚫ Point noir ${index + 1}` : `💑 ${index + 1}`}</span>
        <button onClick={onRemove} className="text-xs text-muted underline" aria-label="Supprimer">
          Supprimer
        </button>
      </div>
      {field(body, setBody, "body", placeholder, 2, `item-body-${index}`)}
      {withSolution && (
        <>
          <p className="text-xs font-semibold text-good">💡 Notre solution</p>
          {field(solution, setSolution, "solution", "On va…", 2, `item-solution-${index}`)}
        </>
      )}
    </Card>
  );
}

// =====================================================================
// Bilan du mois : 1. Points noirs du mois dernier
// =====================================================================

function PointsNoirsReview({ ctx, title }: { ctx: PointCtx; title?: string }) {
  const { track, toast, hint } = useApp();
  const h = ctx.hist;
  const [local, setLocal] = useState<Record<string, PointItem["status"]>>({});
  if (!h) return <Loading />;
  const src = pointNoirSource(h, ctx.point);
  const items = src ? h.items.filter((i) => i.point_id === src.id && i.kind === "point_noir" && i.body.trim()) : [];
  if (!items.length)
    return (
      <Card className="py-8 text-center" data-testid="no-noirs">
        <div className="text-5xl">🌤️</div>
        <p className="mt-2 font-display text-xl font-semibold">Pas de point noir à relire</p>
        <p className="text-sm text-muted">{src ? "Le dernier bilan n'en avait pas." : "C'est votre premier bilan. On commence !"}</p>
      </Card>
    );

  async function setStatus(id: string, status: PointItem["status"]) {
    setLocal((l) => ({ ...l, [id]: status }));
    const { error } = await track(Promise.resolve(supabase().from("point_items").update({ status, updated_at: new Date().toISOString() }).eq("id", id)));
    if (error) toast(errMsg(error));
    hint("point_items");
  }

  return (
    <div className="flex flex-col gap-3">
      {title && <h2 className="text-[0.95rem] font-semibold">{title}</h2>}
      <p className="text-sm text-muted">Bilan de {monthLabel(src!.week_date)} : est-ce que la solution a marché ?</p>
      {items.map((it, i) => {
        const status = local[it.id] !== undefined ? local[it.id] : it.status;
        return (
          <Card key={it.id} className="flex flex-col gap-2 p-4" data-testid={`noir-${i}`}>
            <p className="font-semibold">⚫ {it.body}</p>
            {it.solution.trim() && (
              <p className="text-sm">
                <span className="font-semibold text-good">💡 Solution : </span>
                {it.solution}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatus(it.id, status === "regle" ? null : "regle")}
                data-testid={`noir-regle-${i}`}
                className={cx("rounded-xl px-2 py-2 text-sm font-semibold", status === "regle" ? "bg-good text-white" : "bg-cream")}
              >
                ✅ Réglé
              </button>
              <button
                onClick={() => setStatus(it.id, status === "revient" ? null : "revient")}
                data-testid={`noir-revient-${i}`}
                className={cx("rounded-xl px-2 py-2 text-sm font-semibold", status === "revient" ? "bg-bad text-white" : "bg-cream")}
              >
                🔁 Ça revient
              </button>
            </div>
          </Card>
        );
      })}
      <p className="text-xs text-muted">Un point noir réglé compte +5 au score du trimestre, un point noir qui revient −2.</p>
    </div>
  );
}

// =====================================================================
// Bilan du mois : 2. Les chiffres
// =====================================================================

function usePeriods(ctx: PointCtx, kind: "mois") {
  return useMemo(() => {
    if (!ctx.hist) return null;
    const ids = [ctx.me.id, ctx.partner.id];
    const end = ctx.point.week_date;
    void kind;
    return { cur: monthPeriod(ctx.hist, end, ids), prev: monthPeriod(ctx.hist, prevMonthEnd(end), ids) };
  }, [ctx.hist, ctx.me.id, ctx.partner.id, ctx.point.week_date, kind]);
}

function Metric({
  label,
  cur,
  prev,
  unit = "",
  digits = 1,
  curText,
  lowerIsBetter = false,
}: {
  label: string;
  cur: number | null;
  prev: number | null;
  unit?: string;
  digits?: number;
  curText?: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <b className="font-display text-lg">{curText ?? `${fmt(cur, digits)}${unit}`}</b>
        <Delta cur={cur} prev={prev} digits={digits} lowerIsBetter={lowerIsBetter} />
      </span>
    </div>
  );
}

function MonthNumbers({ ctx }: { ctx: PointCtx }) {
  const p = usePeriods(ctx, "mois");
  if (!p) return <Loading />;
  const { cur, prev } = p;
  return (
    <div className="flex flex-col gap-4" data-testid="month-numbers">
      <Card className="bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="text-sm text-muted">{capitalize(monthLabel(ctx.point.week_date))}</p>
        <p className="font-display text-4xl font-semibold text-rose">{fmt(cur.avg)}/10</p>
        <p className="text-sm text-muted">note moyenne de nos semaines</p>
        <div className="mt-1">
          <Delta cur={cur.avg} prev={prev.avg} />
        </div>
      </Card>

      <WeekBars period={cur} ctx={ctx} />

      {people(ctx).map((pp) => {
        const c = cur.byUser[pp.id];
        const pr = prev.byUser[pp.id];
        const imp = (x: Period["byUser"][string]) => x.improvements.filter((i) => i.status === "tenu").length;
        return (
          <Card key={pp.id} className="p-4">
            <h3 className="mb-1 font-semibold">{fullName(pp)}</h3>
            <Metric label="Note moyenne" cur={c.avg} prev={pr.avg} />
            <Metric label="📈 2e partie vs 1re" cur={c.progress} prev={pr.progress} unit=" pt" />
            <Metric label="✅ Objectifs atteints" cur={c.done.length} prev={pr.done.length} digits={0} />
            <Metric label="❌ Objectifs pas atteints" cur={c.missed.length} prev={pr.missed.length} digits={0} lowerIsBetter />
            <Metric label="🛠️ Améliorations tenues" cur={imp(c)} prev={imp(pr)} digits={0} curText={`${imp(c)} / ${c.improvements.length}`} />
          </Card>
        );
      })}
      <Card className="p-4">
        <Metric label="🎟️ Sorties faites ensemble" cur={cur.outings.length} prev={prev.outings.length} digits={0} />
        <Metric label="📝 Points du dimanche faits" cur={cur.sundays.length} prev={prev.sundays.length} digits={0} />
      </Card>
      <p className="text-xs text-muted">🟢 = mieux que {monthLabel(prevMonthEnd(ctx.point.week_date))} · 🔴 = moins bien. Pour les objectifs pas atteints, moins c&apos;est mieux.</p>
    </div>
  );
}

function WeekBars({ period, ctx }: { period: Period; ctx: PointCtx }) {
  if (!period.weeks.length) return <Empty emoji="📈">Pas encore de note de semaine sur cette période.</Empty>;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Nos semaines (1re partie → 2e partie)</h3>
      <div className="flex flex-col gap-2">
        {period.weeks.map((w) => (
          <div key={w.sunday} className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 text-muted">{formatDate(w.sunday, { weekday: false }).replace(/ \w+$/, (m) => m.slice(0, 4))}</span>
            <div className="flex flex-1 flex-col gap-1">
              {people(ctx).map((pp) => {
                const n = w.byUser[pp.id];
                if (!n) return null;
                const up = n.h1 !== null && n.h2 !== null ? Math.sign(n.h2 - n.h1) : 0;
                return (
                  <div key={pp.id} className="flex items-center gap-1">
                    <span className="w-5 font-semibold">{pp.display_name.trim().charAt(0).toUpperCase() || "•"}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={cx("h-full rounded-full", pp.id === ctx.me.id ? "bg-rose" : "bg-peach")} style={{ width: `${((n.avg ?? 0) / 10) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right">
                      {n.h1 ?? "–"}→{n.h2 ?? "–"} {up > 0 ? "📈" : up < 0 ? "📉" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =====================================================================
// Bilan du mois : 3. Ce qui s'est passé
// =====================================================================

function MonthStory({ ctx }: { ctx: PointCtx }) {
  const p = usePeriods(ctx, "mois");
  if (!p) return <Loading />;
  const { cur } = p;
  return (
    <div className="flex flex-col gap-4" data-testid="month-story">
      {people(ctx).map((pp) => {
        const u = cur.byUser[pp.id];
        return (
          <Card key={pp.id} className="p-4">
            <h3 className="font-semibold">{fullName(pp)}</h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-good">✅ Objectifs atteints ({u.done.length})</p>
            <GoalList list={u.done} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-bad">❌ Pas atteints ({u.missed.length})</p>
            <GoalList list={u.missed} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">🛠️ Améliorations promises pour le couple</p>
            {u.improvements.length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {u.improvements.map((i) => {
                  const r = REVIEW_OPTIONS.find((o) => o.value === i.status);
                  return (
                    <li key={i.sunday}>
                      {r ? r.emoji : "⏳"} {i.text}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}
      <OutingsOfPeriod outings={cur.outings} />
    </div>
  );
}

function GoalList({ list }: { list: { text: string; sunday: string }[] }) {
  if (!list.length) return <p className="text-sm text-muted">—</p>;
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-sm">
      {list.map((g, i) => (
        <li key={i}>
          • {g.text} <span className="text-xs text-muted">({formatDate(g.sunday, { weekday: false })})</span>
        </li>
      ))}
    </ul>
  );
}

function OutingsOfPeriod({ outings }: { outings: Outing[] }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const ids = outings.map((o) => o.id).join(",");
  useEffect(() => {
    if (!ids) return setPhotos([]);
    supabase()
      .from("memories")
      .select("*")
      .in("outing_id", ids.split(","))
      .then(({ data }) => setPhotos(data || []));
  }, [ids]);
  return (
    <Card className="p-4">
      <h3 className="font-semibold">🎟️ Nos sorties et nos moments ensemble ({outings.length})</h3>
      {outings.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Pas de sortie ce mois-ci.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {outings.map((o) => {
            const ph = photos.filter((p) => p.outing_id === o.id).slice(0, 4);
            return (
              <li key={o.id}>
                <p className="text-sm">
                  <span className="text-xl">{o.activity_emoji}</span> <b>{o.activity_name}</b>{" "}
                  <span className="text-muted">· {formatDate(o.date, { weekday: false })}</span>
                </p>
                {ph.length > 0 && (
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {ph.map((p) => (
                      <Media key={p.id} path={p.path} className="aspect-square w-full rounded-xl" />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// =====================================================================
// Bilan du mois : améliorations
// =====================================================================

function MonthImprovements({ ctx }: { ctx: PointCtx }) {
  const p = usePeriods(ctx, "mois");
  const list = (uid: string) => {
    const imps = p?.cur.byUser[uid]?.improvements || [];
    if (!imps.length) return <p className="text-sm text-muted">—</p>;
    return (
      <ul className="flex flex-col gap-1 text-sm">
        {imps.map((i) => (
          <li key={i.sunday}>
            {REVIEW_OPTIONS.find((o) => o.value === i.status)?.emoji || "⏳"} {i.text}
          </li>
        ))}
      </ul>
    );
  };
  return (
    <div className="flex flex-col gap-5">
      <Duo ctx={ctx} label="🗒️ Pour se rappeler : nos améliorations promises ce mois-ci" mine={list(ctx.me.id)} theirs={list(ctx.partner.id)} />
      <DuoText
        ctx={ctx}
        field="month_improved"
        label="🏆 Ce qu'on a vraiment amélioré, ce qui est devenu une habitude"
        placeholder="Maintenant, on…"
        rows={5}
      />
    </div>
  );
}

// =====================================================================
// Trimestre : 1. Ce qu'on s'était dit
// =====================================================================

function QuarterRecall({ ctx }: { ctx: PointCtx }) {
  const h = ctx.hist;
  if (!h) return <Loading />;
  const prevTri = h.points
    .filter((p) => p.kind === "trimestre" && p.week_date < ctx.point.week_date)
    .sort((a, b) => b.week_date.localeCompare(a.week_date))[0];
  const ans = (uid: string) => (prevTri ? h.answers.find((a) => a.point_id === prevTri.id && a.user_id === uid) : undefined);
  const vision = prevTri ? h.items.filter((i) => i.point_id === prevTri.id && i.kind === "vision_couple" && i.body.trim()) : [];
  const col = (a?: Answer) => (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <p className="text-xs font-semibold text-muted">🌍 Ce que je voulais vivre</p>
        <Text v={a?.q_live} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">🦋 Qui je voulais devenir</p>
        <Text v={a?.q_become} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">🎯 Mes grands objectifs</p>
        <Text v={a?.q_goals} />
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      {prevTri ? (
        <>
          <Duo ctx={ctx} label="🔭 Ce que vous vouliez il y a 3 mois" mine={col(ans(ctx.me.id))} theirs={col(ans(ctx.partner.id))} />
          {vision.length > 0 && (
            <Card className="bg-rose-soft/60 p-4">
              <p className="text-xs font-semibold text-rose">💑 Ce qu&apos;on voulait vivre et construire ensemble</p>
              {vision.map((v) => (
                <p key={v.id} className="mt-1 text-[15px]">
                  • {v.body}
                </p>
              ))}
            </Card>
          )}
          <p className="text-sm text-muted">Gardez ça en tête : les deux étapes suivantes montrent ce que vous avez vraiment fait.</p>
        </>
      ) : (
        <Card className="py-6 text-center">
          <div className="text-5xl">🌱</div>
          <p className="mt-2 font-display text-xl font-semibold">Votre tout premier trimestre</p>
          <p className="text-sm text-muted">Ce que vous écrirez à la fin sera ressorti au prochain.</p>
        </Card>
      )}
      <PointsNoirsReview ctx={ctx} title="⚫ Les points noirs du dernier bilan du mois" />
    </div>
  );
}

// =====================================================================
// Trimestre : 2. Le score
// =====================================================================

function QuarterScore({ ctx }: { ctx: PointCtx }) {
  const h = ctx.hist;
  const data = useMemo(() => {
    if (!h) return null;
    const end = ctx.point.week_date;
    return people(ctx).map((pp) => ({ p: pp, cur: quarterScore(h, end, pp.id), prev: quarterScore(h, prevQuarterEnd(end), pp.id) }));
  }, [h, ctx]);
  if (!data) return <Loading />;
  const months = quarterMonths(ctx.point.week_date).map((m) => monthLabel(m).split(" ")[0]);
  return (
    <div className="flex flex-col gap-4" data-testid="quarter-score">
      <p className="text-sm text-muted">
        De {months[0]} à {months[2]}. Le score ne sert pas à vous comparer : chacun se mesure à lui-même, par rapport au trimestre d&apos;avant.
      </p>
      {data.map(({ p, cur, prev }) => {
        const hadPrev = prev.done + prev.missed + prev.better + prev.worse + prev.regle + prev.revient > 0;
        return (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{fullName(p)}</h3>
              {hadPrev ? <Delta cur={cur.total} prev={prev.total} digits={0} unit=" pts" /> : <span className="text-xs text-muted">1er trimestre</span>}
            </div>
            <p className="my-2 text-center font-display text-5xl font-semibold text-rose" data-testid={`score-${p.id === ctx.me.id ? "me" : "partner"}`}>
              {cur.total}
              <span className="text-base text-muted"> pts</span>
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              <ScoreLine label="✅ Objectifs atteints" n={cur.done} pts={SCORE_RULES.done} />
              <ScoreLine label="❌ Objectifs pas atteints" n={cur.missed} pts={SCORE_RULES.missed} />
              <ScoreLine label="📈 2e partie de semaine meilleure" n={cur.better} pts={SCORE_RULES.better} />
              <ScoreLine label="📉 2e partie moins bonne" n={cur.worse} pts={SCORE_RULES.worse} />
              <ScoreLine label="⚫ Points noirs réglés" n={cur.regle} pts={SCORE_RULES.regle} />
              <ScoreLine label="🔁 Points noirs qui reviennent" n={cur.revient} pts={SCORE_RULES.revient} />
            </ul>
            {hadPrev && <p className="mt-2 text-xs text-muted">Trimestre d&apos;avant : {prev.total} pts</p>}
          </Card>
        );
      })}
      <p className="text-xs text-muted">Les objectifs sont comptés ligne par ligne : écrivez un objectif par ligne le dimanche.</p>
    </div>
  );
}

function ScoreLine({ label, n, pts }: { label: string; n: number; pts: number }) {
  return (
    <li className="flex justify-between gap-2">
      <span>
        {label} <span className="text-muted">× {n}</span>
      </span>
      <b className={cx(n * pts > 0 ? "text-good" : n * pts < 0 ? "text-bad" : "text-muted")}>
        {n * pts > 0 ? "+" : ""}
        {n * pts}
      </b>
    </li>
  );
}

// =====================================================================
// Trimestre : 3. L'analyse
// =====================================================================

function QuarterAnalysis({ ctx }: { ctx: PointCtx }) {
  const h = ctx.hist;
  const data = useMemo(() => {
    if (!h) return null;
    const end = ctx.point.week_date;
    return {
      people: people(ctx).map((pp) => ({ p: pp, a: quarterAnalysis(h, end, pp.id) })),
      noirs: quarterNoirs(h, end),
    };
  }, [h, ctx]);
  if (!data) return <Loading />;
  const n = (c: number) => (c > 1 ? ` (×${c})` : "");
  return (
    <div className="flex flex-col gap-4" data-testid="quarter-analysis">
      {data.people.map(({ p, a }) => (
        <Card key={p.id} className="flex flex-col gap-3 p-4">
          <h3 className="font-semibold">{fullName(p)}</h3>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-good">🟢 Ce qui est atteint</p>
            {a.done.length === 0 && a.habits.length === 0 && a.impTenu === 0 ? (
              <p className="text-sm text-muted">Rien de noté pour l&apos;instant.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {a.done.slice(0, 10).map((d) => (
                  <li key={d.text}>
                    ✅ {d.text}
                    {n(d.count)}
                  </li>
                ))}
                {a.habits.map((x, i) => (
                  <li key={i}>🏆 Habitude : {x}</li>
                ))}
                {a.impTenu > 0 && <li>🛠️ {a.impTenu} amélioration{a.impTenu > 1 ? "s" : ""} de couple tenue{a.impTenu > 1 ? "s" : ""}</li>}
              </ul>
            )}
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-bad">🔴 Ce qui n&apos;est pas atteint</p>
            {a.missed.length === 0 && a.impPasTenu === 0 ? (
              <p className="text-sm text-muted">Rien 👏</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {a.missed.slice(0, 10).map((d) => (
                  <li key={d.text}>
                    ❌ {d.text}
                    {n(d.count)}
                  </li>
                ))}
                {a.impPasTenu > 0 && <li>🛠️ {a.impPasTenu} amélioration{a.impPasTenu > 1 ? "s" : ""} de couple pas tenue{a.impPasTenu > 1 ? "s" : ""}</li>}
              </ul>
            )}
          </section>
          {(a.wake.length > 0 || a.impPasTenu >= 2) && (
            <section className="rounded-2xl border-2 border-bad/40 bg-bad/10 p-3" data-testid="wake">
              <p className="font-display text-lg font-semibold text-bad">🚨 Réveille-toi, {nameOf(p)}</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {a.wake.map((w) => (
                  <li key={w.text}>
                    <b>{w.text}</b> : raté <b>{w.count} semaine{w.count > 1 ? "s" : ""}</b> sur {a.weeksCount}
                  </li>
                ))}
                {a.impPasTenu >= 2 && (
                  <li>
                    Améliorations de couple pas tenues <b>{a.impPasTenu} fois</b>
                  </li>
                )}
              </ul>
            </section>
          )}
        </Card>
      ))}
      <Card className="flex flex-col gap-2 p-4">
        <h3 className="font-semibold">⚫ Nos points noirs</h3>
        {data.noirs.regle.length === 0 && data.noirs.revient.length === 0 ? (
          <p className="text-sm text-muted">Aucun point noir relu ce trimestre.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.noirs.regle.map((i) => (
              <li key={i.id}>🟢 Réglé : {i.body}</li>
            ))}
            {data.noirs.revient.map((i) => (
              <li key={i.id} className="font-semibold text-bad">
                🚨 Revient encore : {i.body}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
