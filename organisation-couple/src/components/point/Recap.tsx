"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Answer, Outing, Point, PointItem } from "@/lib/types";
import { addDays } from "@/lib/bilan";
import { BilanRecap } from "./BilanRecap";
import { REVIEW_OPTIONS, capitalize, formatDate } from "@/lib/constants";
import { useApp } from "../Providers";
import { Card, fullName } from "../ui";

export function Recap({ pointId, celebrate = false }: { pointId: string; celebrate?: boolean }) {
  const { me, partner, on } = useApp();
  const sb = supabase();
  const [point, setPoint] = useState<Point | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [items, setItems] = useState<PointItem[]>([]);
  const [mid, setMid] = useState<Answer[]>([]);
  const fired = useRef(false);

  const load = useCallback(async () => {
    const [{ data: p }, { data: a }, { data: o }] = await Promise.all([
      sb.from("points").select("*").eq("id", pointId).maybeSingle(),
      sb.from("point_answers").select("*").eq("point_id", pointId),
      sb.from("outings").select("*").eq("point_id", pointId).order("date"),
    ]);
    setPoint(p);
    setAnswers(a || []);
    setOutings(o || []);
    if (p && p.kind && p.kind !== "semaine") {
      const { data: it } = await sb.from("point_items").select("*").eq("point_id", pointId).order("created_at");
      setItems(it || []);
    } else if (p) {
      // le mercredi de la même semaine (note de la 1re partie + promesse pour la 2e)
      const { data: m } = await sb.from("points").select("id").eq("kind", "mercredi").eq("week_date", addDays(p.week_date, -4)).maybeSingle();
      if (m) {
        const { data: ma } = await sb.from("point_answers").select("*").eq("point_id", m.id);
        setMid(ma || []);
      }
    }
  }, [sb, pointId]);

  useEffect(() => {
    load();
    const offs = [on("db:point_answers", load), on("db:outings", load), on("db:point_items", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  useEffect(() => {
    if (!celebrate || fired.current) return;
    fired.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      const colors = ["#E0607E", "#FF9F6E", "#FFE4E8", "#FFD1A8"];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 300);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 500);
    });
  }, [celebrate]);

  if (!point) return null;
  if (point.kind && point.kind !== "semaine")
    return <BilanRecap point={point} people={[me, partner].filter(Boolean) as NonNullable<typeof me>[]} answers={answers} items={items} />;
  const people = [me, partner].filter(Boolean).map((p) => ({ p: p!, a: answers.find((x) => x.user_id === p!.id) }));
  const notes = (uid: string, a?: Answer) => {
    const h1 = mid.find((x) => x.user_id === uid)?.half1_score ?? a?.half1_score ?? null;
    const h2 = a?.week_score ?? null;
    return { h1, h2, avg: h1 !== null && h2 !== null ? (h1 + h2) / 2 : h2 };
  };
  const scores = people.map(({ p, a }) => notes(p.id, a).avg).filter((s): s is number => s !== null);
  const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null;
  const planned = outings.filter((o) => o.activity_id);

  return (
    <div className="flex flex-col gap-4" data-testid="recap">
      <Card className="bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="text-sm text-muted">Point du {formatDate(point.week_date, { weekday: false, year: true })}</p>
        <div className="mt-2 flex items-center justify-center gap-6">
          {people.map(({ p, a }) => (
            <div key={p.id} className="flex flex-col items-center">
              <span className="text-5xl">{a?.mood || "🙂"}</span>
              <span className="mt-1 text-xs font-medium">{p.display_name}</span>
            </div>
          ))}
        </div>
        {avg !== null && (
          <p className="mt-3 font-display text-3xl font-semibold text-rose">
            {avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
            <span className="text-base text-muted">/10 de moyenne</span>
          </p>
        )}
      </Card>

      <h2 className="mt-2 text-xl font-semibold">🙋 Perso</h2>
      {people.map(({ p, a }) => (
        <Card key={`perso-${p.id}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{fullName(p)}</h3>
            <span className="rounded-full bg-peach-soft px-3 py-1 text-sm font-semibold">
              {a?.mood} {(() => {
                const n = notes(p.id, a);
                return n.avg !== null ? n.avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "–";
              })()}
              /10
            </span>
          </div>
          {(() => {
            const n = notes(p.id, a);
            if (n.h1 === null) return null;
            return (
              <p className="mt-1 text-sm text-muted" data-testid="recap-halves">
                1re partie {n.h1} · 2e partie {n.h2 ?? "–"}{" "}
                {n.h2 !== null && n.h2 !== n.h1 && (
                  <b className={n.h2 > n.h1 ? "text-good" : "text-bad"}>
                    {n.h2 > n.h1 ? "📈 +" : "📉 "}
                    {n.h2 - n.h1}
                  </b>
                )}
              </p>
            );
          })()}
          <dl className="mt-3 flex flex-col gap-2 text-[15px]">
            <RecapItem label="✅ Objectifs atteints" value={a?.goals_done} />
            <RecapItem label="❌ Objectifs pas atteints" value={a?.goals_missed} />
            <RecapItem label="💬 Pourquoi" value={a?.goals_why} />
            <RecapItem label="💪 Promis mercredi pour la 2e partie" value={mid.find((x) => x.user_id === p.id)?.mid_plan} />
            {a?.goals_review && <RecapItem label="🎯 Mes objectifs" value={a.goals_review} />}
            <RecapItem label="🚀 Objectifs de la semaine prochaine" value={a?.next_goals} always />
          </dl>
        </Card>
      ))}

      <h2 className="mt-2 text-xl font-semibold">💑 Couple</h2>
      {people.map(({ p, a }) => {
        const review = REVIEW_OPTIONS.find((r) => r.value === a?.review_status);
        return (
          <Card key={`couple-${p.id}`}>
            <h3 className="text-lg font-semibold">{fullName(p)}</h3>
            {review && (
              <p className="mt-1 text-sm text-muted">
                Amélioration de la semaine passée : {review.emoji} {review.label}
              </p>
            )}
            <dl className="mt-3 flex flex-col gap-2 text-[15px]">
              <RecapItem label="🌟 Le bien" value={a?.good_things} />
              <RecapItem label="🌧️ Le moins bien" value={a?.less_good} />
              <RecapItem label="🛠️ Mon amélioration pour la semaine" value={a?.next_improvement} always />
            </dl>
          </Card>
        );
      })}

      <Card>
        <h3 className="text-lg font-semibold">📅 Prochain rendez-vous</h3>
        {planned.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Pas encore de date fixée.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {planned.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <span className="text-3xl">{o.activity_emoji}</span>
                <span>
                  <span className="block font-semibold">{o.activity_name}</span>
                  <span className="text-sm text-muted">
                    {capitalize(formatDate(o.date))}
                    {o.steps_goal ? ` · 🎯 ${o.steps_goal.toLocaleString("fr-FR")} pas` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-sm text-muted">✓ Enregistré dans votre historique 💞</p>
    </div>
  );
}

function RecapItem({ label, value, always = false }: { label: string; value?: string | null; always?: boolean }) {
  if (!value && !always) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">{value || "—"}</dd>
    </div>
  );
}
