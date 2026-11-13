"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { Card, Empty, Page, PageHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Answer, Point } from "@/lib/types";
import { formatDate } from "@/lib/constants";

type Row = { point: Point; answers: Answer[]; avg: number | null };

export default function EvolutionPage() {
  const { on } = useApp();
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: p }, { data: a }] = await Promise.all([
      sb.from("points").select("*").order("week_date", { ascending: false }),
      sb.from("point_answers").select("*"),
    ]);
    setRows(
      (p || []).map((point: Point) => {
        const answers = (a || []).filter((x: Answer) => x.point_id === point.id);
        const s = answers.map((x) => x.week_score).filter((v): v is number => v !== null);
        return { point, answers, avg: s.length ? s.reduce((x, y) => x + y, 0) / s.length : null };
      }),
    );
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:points", load), on("db:point_answers", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  const last8 = rows.filter((r) => r.avg !== null).slice(0, 8).reverse();

  return (
    <Page>
      <PageHeader title="Notre évolution" emoji="📈" />
      <Card className="mb-5">
        <h2 className="text-lg font-semibold">Moyenne de nos notes de semaine</h2>
        <p className="mb-2 text-xs text-muted">8 derniers points · touche un point pour voir le détail</p>
        {last8.length === 0 ? (
          <Empty emoji="📈">Le graphique apparaîtra après votre premier point.</Empty>
        ) : (
          <LineChart data={last8.map((r) => ({ label: formatDate(r.point.week_date, { weekday: false }), value: r.avg! }))} />
        )}
      </Card>

      <h2 className="mb-2 text-lg font-semibold">Tous nos points</h2>
      {rows.length === 0 ? (
        <Empty emoji="🗓️">Aucun point pour l&apos;instant.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.point.id}>
              <Link
                href={r.point.status === "termine" ? `/points/${r.point.id}` : `/point?id=${r.point.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 active:scale-[0.98]"
              >
                <span className="text-2xl">{r.answers.map((a) => a.mood || "🙂").join("")}</span>
                <span className="flex-1">
                  <span className="block font-medium">Dimanche {formatDate(r.point.week_date, { weekday: false, year: true })}</span>
                  <span className="text-xs text-muted">{r.point.status === "termine" ? "✓ Terminé" : "⏳ En cours"}</span>
                </span>
                <span className="font-display text-xl font-semibold text-rose">
                  {r.avg !== null ? r.avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "–"}
                </span>
                <span className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320;
  const H = 180;
  const pad = { l: 26, r: 14, t: 16, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
  const y = (v: number) => pad.t + ih - (v / 10) * ih;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const shown = active ?? data.length - 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Moyenne des notes de la semaine sur 8 semaines">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--rose)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--rose)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(v)} fontSize={10} textAnchor="end" dominantBaseline="central" fill="var(--muted)">
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#fill)" />
        <path d={path} fill="none" stroke="var(--rose)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={pad.t} y2={y(0)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r={i === shown ? 5.5 : 4} fill="var(--rose)" stroke="var(--card)" strokeWidth={2} />
            {/* zone tactile plus grande que le point */}
            <rect
              x={x(i) - iw / Math.max(data.length, 1) / 2}
              y={pad.t}
              width={iw / Math.max(data.length, 1)}
              height={ih}
              fill="transparent"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          </g>
        ))}
        {[0, data.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(i)} y={H - 8} fontSize={10} textAnchor={i === 0 && data.length > 1 ? "start" : "end"} fill="var(--muted)">
            {data[i].label}
          </text>
        ))}
      </svg>
      <div className="mt-1 text-center text-sm">
        <span className="text-muted">{data[shown].label} : </span>
        <b className="font-display text-lg text-ink">{data[shown].value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/10</b>
      </div>
    </div>
  );
}
