"use client";
import type { Answer, Point, PointItem, Profile } from "@/lib/types";
import { KIND_META, formatDate } from "@/lib/constants";
import { monthLabel, quarterMonths } from "@/lib/bilan";
import { Card, fullName } from "../ui";

type Field = { key: keyof Answer; label: string };
type Section = { title: string; fields: Field[] };

const SECTIONS: Record<"mercredi" | "mois" | "trimestre", Section[]> = {
  mercredi: [
    {
      title: "🙋 Ma 1re partie de semaine",
      fields: [
        { key: "mid_review", label: "📝 Mon constat" },
        { key: "mid_plan", label: "💪 Ce que je fais pour la 2e partie" },
      ],
    },
  ],
  mois: [
    {
      title: "🙋 Perso",
      fields: [
        { key: "month_pride", label: "🏅 Ma plus grande fierté" },
        { key: "month_stuck", label: "🚧 Ce qui a coincé" },
        { key: "month_goals", label: "🎯 Mon objectif du mois prochain" },
      ],
    },
    {
      title: "💑 Couple",
      fields: [
        { key: "month_best", label: "💖 Notre plus beau moment" },
        { key: "month_recurring", label: "🔁 Le sujet qui revient" },
        { key: "month_improved", label: "🏆 Ce qu'on a amélioré / nos habitudes" },
      ],
    },
  ],
  trimestre: [
    {
      title: "💑 Mon avis sur l'autre",
      fields: [
        { key: "avis_good", label: "💖 Ce que l'autre a fait de bien" },
        { key: "avis_evolve", label: "🌱 Ce que j'aimerais voir évoluer" },
      ],
    },
    {
      title: "🔭 Les 3 prochains mois",
      fields: [
        { key: "q_live", label: "🌍 Ce que je veux vivre" },
        { key: "q_become", label: "🦋 Qui je veux devenir" },
        { key: "q_goals", label: "🎯 Mes grands objectifs" },
      ],
    },
  ],
};

const ITEM_TITLES: Record<PointItem["kind"], string> = {
  point_noir: "⚫ Nos points noirs et nos solutions",
  objectif_couple: "💑 Notre objectif de couple du mois prochain",
  vision_couple: "💑 Ce qu'on veut vivre et construire ensemble",
};

export function periodTitle(point: Point) {
  if (point.kind === "mercredi") return `Mercredi ${formatDate(point.week_date, { weekday: false, year: true })}`;
  if (point.kind === "mois") return `Bilan de ${monthLabel(point.week_date)}`;
  if (point.kind === "trimestre") {
    const m = quarterMonths(point.week_date).map((x) => monthLabel(x).split(" ")[0]);
    return `Trimestre ${m[0]} → ${m[2]} ${point.week_date.slice(0, 4)}`;
  }
  return `Dimanche ${formatDate(point.week_date, { weekday: false, year: true })}`;
}

export function BilanRecap({
  point,
  people,
  answers,
  items,
}: {
  point: Point;
  people: Profile[];
  answers: Answer[];
  items: PointItem[];
}) {
  const kind = point.kind as "mercredi" | "mois" | "trimestre";
  const meta = KIND_META[kind];
  const ans = (uid: string) => answers.find((a) => a.user_id === uid);
  const itemKinds = (["point_noir", "objectif_couple", "vision_couple"] as const).filter((k) => items.some((i) => i.kind === k && i.body.trim()));

  return (
    <div className="flex flex-col gap-4" data-testid="recap">
      <Card className="bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="text-4xl">{meta.emoji}</p>
        <p className="font-display text-xl font-semibold">{meta.label}</p>
        <p className="text-sm text-muted">{periodTitle(point)}</p>
        {kind === "mercredi" && (
          <div className="mt-3 flex justify-center gap-6">
            {people.map((p) => (
              <div key={p.id}>
                <p className="font-display text-3xl font-semibold text-rose">
                  {ans(p.id)?.half1_score ?? "–"}
                  <span className="text-sm text-muted">/10</span>
                </p>
                <p className="text-xs">{p.display_name} · 1re partie</p>
              </div>
            ))}
          </div>
        )}
        {point.covers_week && (
          <div className="mt-3 flex justify-center gap-6">
            {people.map((p) => (
              <div key={p.id}>
                <p className="font-display text-3xl font-semibold text-rose">
                  {ans(p.id)?.week_score ?? "–"}
                  <span className="text-sm text-muted">/10</span>
                </p>
                <p className="text-xs">{p.display_name} · 2e partie</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {SECTIONS[kind].map((sec) => (
        <div key={sec.title} className="flex flex-col gap-3">
          <h2 className="mt-2 text-xl font-semibold">{sec.title}</h2>
          {people.map((p) => (
            <Card key={p.id}>
              <h3 className="text-lg font-semibold">{fullName(p)}</h3>
              <dl className="mt-2 flex flex-col gap-2 text-[15px]">
                {sec.fields.map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
                    <dd className="whitespace-pre-wrap break-words">{(ans(p.id)?.[f.key] as string) || "—"}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      ))}

      {itemKinds.map((k) => (
        <Card key={k}>
          <h3 className="text-lg font-semibold">{ITEM_TITLES[k]}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-[15px]">
            {items
              .filter((i) => i.kind === k && i.body.trim())
              .map((i) => (
                <li key={i.id}>
                  <p>• {i.body}</p>
                  {i.solution.trim() && <p className="ml-3 text-sm text-good">💡 {i.solution}</p>}
                </li>
              ))}
          </ul>
        </Card>
      ))}
      <p className="text-center text-sm text-muted">✓ Enregistré dans votre historique 💞</p>
    </div>
  );
}
