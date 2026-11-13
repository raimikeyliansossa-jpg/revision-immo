"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { Card, Empty, Page, PageHeader, Segmented, nameOf } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Outing, OutingRating } from "@/lib/types";
import { capitalize, formatDate, todayIso } from "@/lib/constants";

export default function SortiesPage() {
  const { me, partner, on } = useApp();
  const [outings, setOutings] = useState<Outing[]>([]);
  const [ratings, setRatings] = useState<OutingRating[]>([]);
  const [tab, setTab] = useState<"historique" | "classement">("historique");

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: o }, { data: r }] = await Promise.all([
      sb.from("outings").select("*").not("activity_id", "is", null).order("date", { ascending: false }),
      sb.from("outing_ratings").select("*"),
    ]);
    setOutings(o || []);
    setRatings(r || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:outings", load), on("db:outing_ratings", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  const upcoming = outings.filter((o) => o.status === "prevue" && o.date >= todayIso()).reverse();
  const done = outings.filter((o) => o.status === "faite");
  const r = (o: Outing, uid?: string) => ratings.find((x) => x.outing_id === o.id && x.user_id === uid);

  const ranking = Object.values(
    done.reduce<Record<string, { name: string; emoji: string; scores: number[]; count: number }>>((acc, o) => {
      const k = o.activity_name || "?";
      acc[k] ||= { name: k, emoji: o.activity_emoji || "✨", scores: [], count: 0 };
      acc[k].count++;
      ratings.filter((x) => x.outing_id === o.id && x.score !== null).forEach((x) => acc[k].scores.push(x.score!));
      return acc;
    }, {}),
  )
    .map((x) => ({ ...x, avg: x.scores.length ? x.scores.reduce((a, b) => a + b, 0) / x.scores.length : null }))
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <Page>
      <PageHeader title="Nos sorties" emoji="🗺️" />

      {upcoming.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold">À venir</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 !p-3">
                <span className="text-3xl">{o.activity_emoji}</span>
                <div>
                  <p className="font-semibold">{o.activity_name}</p>
                  <p className="text-sm text-muted">
                    {capitalize(formatDate(o.date))}
                    {o.steps_goal ? ` · 🎯 ${o.steps_goal.toLocaleString("fr-FR")} pas` : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "historique", label: "📜 Historique" },
          { value: "classement", label: "🏆 Classement" },
        ]}
      />

      <div className="mt-4">
        {done.length === 0 ? (
          <Empty emoji="🗺️">Vos sorties apparaîtront ici après les avoir notées pendant le point du dimanche.</Empty>
        ) : tab === "historique" ? (
          <div className="flex flex-col gap-3">
            {done.map((o) => (
              <Card key={o.id}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{o.activity_emoji}</span>
                  <div className="flex-1">
                    <p className="font-display text-lg font-semibold">{o.activity_name}</p>
                    <p className="text-sm text-muted">{capitalize(formatDate(o.date, { weekday: true, year: true }))}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[me, partner].map((p) => {
                    const x = r(o, p?.id);
                    return (
                      <div key={p?.id || "x"} className="rounded-2xl bg-cream p-3">
                        <p className="text-xs font-semibold">{nameOf(p)}</p>
                        <p className="font-display text-2xl font-semibold text-rose">
                          {x?.score ?? "–"}
                          <span className="text-sm text-muted">/10</span>
                        </p>
                        {x?.comment && <p className="mt-1 whitespace-pre-wrap text-sm">{x.comment}</p>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.map((x, i) => (
              <li key={x.name} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                <span className="w-8 text-center font-display text-xl font-semibold text-muted">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </span>
                <span className="text-3xl">{x.emoji}</span>
                <span className="flex-1">
                  <span className="block font-medium">{x.name}</span>
                  <span className="text-xs text-muted">
                    {x.count} fois
                  </span>
                </span>
                <span className="font-display text-xl font-semibold text-rose">
                  {x.avg !== null ? x.avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "–"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Page>
  );
}
