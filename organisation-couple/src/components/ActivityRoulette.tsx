"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, errMsg } from "@/lib/supabase";
import type { Activity, Outing } from "@/lib/types";
import { type Filters, eligibleActivities, formatDate, todayIso } from "@/lib/constants";
import { useApp } from "./Providers";
import { Button, Segmented } from "./ui";
import { Wheel, targetRotation } from "./point/Roulette";

/** Roulette lancée depuis la page « Nos activités », sans passer par le point du dimanche. */
export function ActivityRoulette({
  activities,
  outings,
  onPlanned,
}: {
  activities: Activity[];
  outings: Outing[];
  onPlanned: () => void;
}) {
  const { couple, toast, hint } = useApp();
  const [date, setDate] = useState(todayIso());
  const [filters, setFilters] = useState<Filters>({ location: "tous", budget: "tous" });
  const [items, setItems] = useState<Activity[] | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activités déjà faites ou déjà prévues → exclues, comme dans le point du dimanche
  const excluded = useMemo(
    () => new Set(outings.filter((o) => o.activity_id && (o.status === "faite" || o.status === "prevue")).map((o) => o.activity_id!)),
    [outings],
  );
  const candidates = useMemo(() => eligibleActivities(activities, date, filters, excluded), [activities, date, filters, excluded]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function spin() {
    if (candidates.length === 0) return toast("Aucune activité ne correspond à ces filtres 🤷");
    const idx = Math.floor(Math.random() * candidates.length);
    const rot = targetRotation(rotation, idx, candidates.length);
    const winner = candidates[idx];
    setResult(null);
    setBusy(true);
    setItems(candidates);
    setSpinning(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSpinning(true);
        setRotation(rot);
      }),
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(winner);
      setBusy(false);
      if (navigator.vibrate) navigator.vibrate(60);
    }, 4300);
  }

  async function plan(a: Activity) {
    if (!couple) return;
    setSaving(true);
    const { error } = await supabase()
      .from("outings")
      .insert({ couple_id: couple.id, date, activity_id: a.id, activity_name: a.name, activity_emoji: a.emoji });
    setSaving(false);
    if (error) return toast(errMsg(error));
    hint("outings");
    toast(`📅 ${a.name} prévu le ${formatDate(date)} !`);
    onPlanned();
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        Pour quel jour ?
        <input
          type="date"
          value={date}
          min={todayIso()}
          onChange={(e) => {
            if (!e.target.value) return;
            setDate(e.target.value);
            setResult(null);
            setItems(null);
          }}
          className="rounded-2xl border border-line bg-card px-3 py-2 outline-none focus:border-rose"
        />
      </label>
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
        {candidates.length} activité{candidates.length > 1 ? "s" : ""} possible{candidates.length > 1 ? "s" : ""} le{" "}
        {formatDate(date)}
      </p>

      {items && <Wheel items={items} rotation={rotation} spinning={spinning} />}

      {result && (
        <div className="pop rounded-3xl bg-gradient-to-br from-rose-soft to-peach-soft p-4 text-center">
          <p className="text-sm text-muted">🎉 La roulette a choisi…</p>
          <div className="text-5xl">{result.emoji}</div>
          <p className="font-display text-2xl font-semibold">{result.name}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="soft" className="flex-1" onClick={spin} disabled={saving}>
              Relancer 🔁
            </Button>
            <Button className="flex-1" onClick={() => plan(result)} disabled={saving}>
              {saving ? "…" : "On le prévoit ! 📅"}
            </Button>
          </div>
        </div>
      )}

      {!result && (
        <Button onClick={spin} disabled={busy}>
          {busy ? "Ça tourne… 🎡" : "🎡 Lancer la roulette"}
        </Button>
      )}
    </div>
  );
}
