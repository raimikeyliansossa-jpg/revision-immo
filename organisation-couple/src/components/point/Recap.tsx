"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Answer, Outing, Point } from "@/lib/types";
import { REVIEW_OPTIONS, capitalize, formatDate } from "@/lib/constants";
import { useApp } from "../Providers";
import { Card, fullName } from "../ui";

export function Recap({ pointId, celebrate = false }: { pointId: string; celebrate?: boolean }) {
  const { me, partner, on } = useApp();
  const sb = supabase();
  const [point, setPoint] = useState<Point | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [outings, setOutings] = useState<Outing[]>([]);
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
  }, [sb, pointId]);

  useEffect(() => {
    load();
    const offs = [on("db:point_answers", load), on("db:outings", load)];
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
  const people = [me, partner].filter(Boolean).map((p) => ({ p: p!, a: answers.find((x) => x.user_id === p!.id) }));
  const scores = answers.map((a) => a.week_score).filter((s): s is number => s !== null);
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

      {people.map(({ p, a }) => {
        const review = REVIEW_OPTIONS.find((r) => r.value === a?.review_status);
        return (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{fullName(p)}</h3>
              <span className="rounded-full bg-rose-soft px-3 py-1 text-sm font-semibold text-rose">
                {a?.mood} {a?.week_score ?? "–"}/10
              </span>
            </div>
            {review && (
              <p className="mt-2 text-sm text-muted">
                Amélioration de la semaine passée : {review.emoji} {review.label}
              </p>
            )}
            <dl className="mt-3 flex flex-col gap-2 text-[15px]">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">🛠️ Mon amélioration</dt>
                <dd className="whitespace-pre-wrap break-words">{a?.next_improvement || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">🎯 Mes objectifs</dt>
                <dd className="whitespace-pre-wrap break-words">{a?.next_goals || "—"}</dd>
              </div>
              {a?.good_things && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">🌟 Le bien</dt>
                  <dd className="whitespace-pre-wrap break-words">{a.good_things}</dd>
                </div>
              )}
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
