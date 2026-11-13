"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, errMsg } from "@/lib/supabase";
import type { Activity, Outing } from "@/lib/types";
import {
  DAYS_SHORT,
  MONTHS_LONG,
  type Filters,
  capitalize,
  eligibleActivities,
  formatDate,
  isWalk,
  seasonLabel,
  toIso,
  todayIso,
} from "@/lib/constants";
import { useApp } from "../Providers";
import { Button, Card, Segmented, Sheet, cx } from "../ui";
import type { PointCtx } from "./PointScreen";
import { Wheel, targetRotation } from "./Roulette";

export function RdvStep({ ctx }: { ctx: PointCtx }) {
  const { on, toast, track, hint } = useApp();
  const sb = supabase();
  const [outings, setOutings] = useState<Outing[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const load = useCallback(async () => {
    const [{ data: o }, { data: a }] = await Promise.all([
      sb.from("outings").select("*").order("date"),
      sb.from("activities").select("*").order("name"),
    ]);
    setOutings(o || []);
    setActivities(a || []);
  }, [sb]);

  useEffect(() => {
    load();
    const offs = [on("db:outings", load), on("db:activities", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  const mine = outings.filter((o) => o.point_id === ctx.point.id);

  async function toggleDate(iso: string) {
    const existing = mine.find((o) => o.date === iso);
    if (existing) {
      if (existing.activity_id && !confirm(`Retirer le rendez-vous du ${formatDate(iso)} ?`)) return;
      setOutings((cur) => cur.filter((o) => o.id !== existing.id));
      await track(Promise.resolve(sb.from("outings").delete().eq("id", existing.id)));
      hint("outings");
    } else {
      const { data, error } = await track(
        Promise.resolve(
          sb.from("outings").insert({ couple_id: ctx.point.couple_id, date: iso, point_id: ctx.point.id }).select().single(),
        ),
      );
      if (error) toast(errMsg(error));
      else if (data) {
        setOutings((cur) => [...cur, data]);
        hint("outings");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Calendar selected={new Set(mine.map((o) => o.date))} onToggle={toggleDate} />
      {mine.length === 0 && (
        <p className="text-center text-sm text-muted">👆 Touchez le ou les jours où vous vous voyez.</p>
      )}
      {mine
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((o) => (
          <DateCard key={o.id} outing={o} activities={activities} allOutings={outings} onChanged={load} />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------

function Calendar({ selected, onToggle }: { selected: Set<string>; onToggle: (iso: string) => void }) {
  const [offset, setOffset] = useState(0);
  const today = todayIso();
  const first = new Date();
  first.setDate(1);
  first.setMonth(first.getMonth() + offset);
  const year = first.getFullYear();
  const month = first.getMonth();
  const startPad = (first.getDay() + 6) % 7; // lundi = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(toIso(new Date(year, month, d)));

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <button className="h-9 w-9 rounded-full bg-cream text-lg disabled:opacity-30" onClick={() => setOffset((o) => o - 1)} disabled={offset <= 0} aria-label="Mois précédent">
          ‹
        </button>
        <p className="font-display text-lg font-semibold">
          {capitalize(MONTHS_LONG[month])} {year}
        </p>
        <button className="h-9 w-9 rounded-full bg-cream text-lg" onClick={() => setOffset((o) => o + 1)} aria-label="Mois suivant">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {DAYS_SHORT.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              disabled={iso < today}
              onClick={() => onToggle(iso)}
              data-testid={`day-${iso}`}
              className={cx(
                "aspect-square rounded-xl text-sm font-medium transition",
                selected.has(iso) ? "pop bg-rose text-white" : "bg-cream",
                iso === today && !selected.has(iso) && "ring-2 ring-peach",
                iso < today && "opacity-30",
              )}
            >
              {Number(iso.slice(8))}
            </button>
          ) : (
            <div key={`p${i}`} />
          ),
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Une date : roulette ou choix manuel
// ---------------------------------------------------------------------

function DateCard({
  outing,
  activities,
  allOutings,
  onChanged,
}: {
  outing: Outing;
  activities: Activity[];
  allOutings: Outing[];
  onChanged: () => void;
}) {
  const { on, send, track, toast, hint } = useApp();
  const sb = supabase();
  const [filters, setFilters] = useState<Filters>({ location: "tous", budget: "tous" });
  const [wheelItems, setWheelItems] = useState<Activity[] | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [busySpin, setBusySpin] = useState(false);
  const [result, setResult] = useState<Activity | null>(null);
  const [manual, setManual] = useState(false);
  const [stepsGoal, setStepsGoal] = useState<string>(outing.steps_goal ? String(outing.steps_goal) : "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activités déjà faites ou déjà prévues ailleurs → exclues de la roulette
  const excluded = useMemo(
    () =>
      new Set(
        allOutings
          .filter((o) => o.id !== outing.id && o.activity_id && (o.status === "faite" || o.status === "prevue"))
          .map((o) => o.activity_id!),
      ),
    [allOutings, outing.id],
  );
  const candidates = useMemo(
    () => eligibleActivities(activities, outing.date, filters, excluded),
    [activities, outing.date, filters, excluded],
  );

  const animate = useCallback(
    (items: Activity[], rot: number, winner: Activity) => {
      setResult(null);
      setBusySpin(true);
      setWheelItems(items);
      setSpinning(false);
      // laisse le temps au DOM d'afficher la roue avant de la faire tourner
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSpinning(true);
          setRotation(rot);
        }),
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setResult(winner);
        setBusySpin(false);
        if (navigator.vibrate) navigator.vibrate(60);
      }, 4300);
    },
    [],
  );

  // L'autre a lancé la roulette → on voit la même animation
  useEffect(
    () =>
      on("bc:spin", (p: { outing_id: string; ids: string[]; winner: string; rotation: number }) => {
        if (p.outing_id !== outing.id) return;
        const items = p.ids.map((id) => activities.find((a) => a.id === id)).filter(Boolean) as Activity[];
        const winner = activities.find((a) => a.id === p.winner);
        if (winner && items.length) animate(items, p.rotation, winner);
      }),
    [on, outing.id, activities, animate],
  );
  useEffect(
    () =>
      on("bc:spin-reset", (p: { outing_id: string }) => {
        if (p.outing_id === outing.id) {
          setResult(null);
          setWheelItems(null);
        }
      }),
    [on, outing.id],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => setStepsGoal(outing.steps_goal ? String(outing.steps_goal) : ""), [outing.steps_goal]);

  function spin() {
    if (candidates.length === 0) return toast("Aucune activité ne correspond à ces filtres 🤷");
    const idx = Math.floor(Math.random() * candidates.length);
    const rot = targetRotation(rotation, idx, candidates.length);
    animate(candidates, rot, candidates[idx]);
    send("spin", { outing_id: outing.id, ids: candidates.map((c) => c.id), winner: candidates[idx].id, rotation: rot });
  }

  async function choose(a: Activity) {
    const { error } = await track(
      Promise.resolve(
        sb
          .from("outings")
          .update({ activity_id: a.id, activity_name: a.name, activity_emoji: a.emoji })
          .eq("id", outing.id),
      ),
    );
    if (error) return toast(errMsg(error));
    setResult(null);
    setWheelItems(null);
    setManual(false);
    hint("outings");
    onChanged();
  }

  async function reset() {
    await track(
      Promise.resolve(
        sb.from("outings").update({ activity_id: null, activity_name: null, activity_emoji: null, steps_goal: null }).eq("id", outing.id),
      ),
    );
    send("spin-reset", { outing_id: outing.id });
    hint("outings");
    onChanged();
  }

  async function saveSteps(v: string) {
    setStepsGoal(v);
    const n = parseInt(v.replace(/\D/g, ""), 10);
    await track(Promise.resolve(sb.from("outings").update({ steps_goal: Number.isFinite(n) ? n : null }).eq("id", outing.id)));
    hint("outings");
  }

  return (
    <Card className="p-4" data-testid={`date-card-${outing.date}`}>
      <p className="font-display text-xl font-semibold">📅 {capitalize(formatDate(outing.date))}</p>

      {outing.activity_id ? (
        <div className="pop mt-3 rounded-3xl bg-gradient-to-br from-rose-soft to-peach-soft p-4 text-center">
          <div className="text-5xl">{outing.activity_emoji}</div>
          <p className="mt-1 font-display text-2xl font-semibold" data-testid="chosen-activity">
            {outing.activity_name}
          </p>
          {isWalk(outing.activity_name) && (
            <label className="mt-3 flex items-center justify-center gap-2 text-sm">
              🎯 Objectif de pas :
              <input
                inputMode="numeric"
                value={stepsGoal}
                placeholder="10 000"
                onChange={(e) => setStepsGoal(e.target.value)}
                onBlur={(e) => saveSteps(e.target.value)}
                className="w-28 rounded-xl bg-card px-3 py-1.5 text-center outline-none"
              />
            </label>
          )}
          <button className="mt-3 text-sm text-rose underline" onClick={reset}>
            Changer d&apos;activité
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Segmented
              value={filters.location}
              onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
              options={[
                { value: "interieur", label: "🏠 Intérieur" },
                { value: "exterieur", label: "🌳 Extérieur" },
                { value: "tous", label: "Peu importe" },
              ]}
            />
            <Segmented
              value={filters.budget}
              onChange={(v) => setFilters((f) => ({ ...f, budget: v }))}
              options={[
                { value: "petit", label: "💸 Petit" },
                { value: "gros", label: "💎 Gros" },
                { value: "tous", label: "Peu importe" },
              ]}
            />
            <p className="text-center text-xs text-muted">
              {candidates.length} activité{candidates.length > 1 ? "s" : ""} possible{candidates.length > 1 ? "s" : ""} ce jour-là
            </p>
          </div>

          {wheelItems && <Wheel items={wheelItems} rotation={rotation} spinning={spinning} />}

          {result && (
            <div className="pop rounded-3xl bg-gradient-to-br from-rose-soft to-peach-soft p-4 text-center">
              <p className="text-sm text-muted">🎉 La roulette a choisi…</p>
              <div className="text-5xl">{result.emoji}</div>
              <p className="font-display text-2xl font-semibold" data-testid="spin-result">
                {result.name}
              </p>
              {isWalk(result.name) && <p className="mt-1 text-sm">👟 Vous pourrez fixer un objectif de pas juste après !</p>}
              <div className="mt-3 flex gap-2">
                <Button variant="soft" className="flex-1" onClick={spin}>
                  Relancer 🔁
                </Button>
                <Button className="flex-1" onClick={() => choose(result)} data-testid="go-btn">
                  C&apos;est parti ! 🚀
                </Button>
              </div>
            </div>
          )}

          {!result && !busySpin && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={spin} disabled={busySpin} data-testid="spin-btn">
                🎡 Lancer la roulette
              </Button>
              <Button variant="soft" onClick={() => setManual(true)}>
                ✋ À la main
              </Button>
            </div>
          )}
        </div>
      )}

      <Sheet open={manual} onClose={() => setManual(false)} title="Choisir une activité">
        <ManualList
          activities={activities}
          excluded={excluded}
          month={Number(outing.date.slice(5, 7))}
          onPick={choose}
        />
      </Sheet>
    </Card>
  );
}

function ManualList({
  activities,
  excluded,
  month,
  onPick,
}: {
  activities: Activity[];
  excluded: Set<string>;
  month: number;
  onPick: (a: Activity) => void;
}) {
  const [all, setAll] = useState(false);
  const list = activities.filter((a) => all || (a.months.includes(month) && !excluded.has(a.id)));
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Voir aussi hors saison / déjà faites
      </label>
      {list.map((a) => (
        <button
          key={a.id}
          onClick={() => onPick(a)}
          className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left active:scale-[0.98]"
        >
          <span className="text-2xl">{a.emoji}</span>
          <span className="flex-1">
            <span className="block font-medium">{a.name}</span>
            <span className="text-xs text-muted">
              {seasonLabel(a.months)} · {a.location === "interieur" ? "🏠" : "🌳"} · {a.budget === "petit" ? "💸 petit" : "💎 gros"}
              {excluded.has(a.id) && " · déjà faite/prévue"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
