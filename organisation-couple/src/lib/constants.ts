import type { Activity, StepKey } from "./types";

export const STEP_META: Record<StepKey, { emoji: string; title: string; hint: string }> = {
  relecture: { emoji: "🔁", title: "Relecture de la semaine dernière", hint: "On regarde ce qu'on s'était promis" },
  sortie: { emoji: "🎟️", title: "Notre dernière sortie", hint: "C'était comment ?" },
  humeur: { emoji: "😊", title: "Humeur et note de la semaine", hint: "Comment tu te sens ?" },
  objectifs: { emoji: "🎯", title: "Mes objectifs de la semaine", hint: "Atteints ou pas, et pourquoi" },
  bilan: { emoji: "🌟", title: "Bien / moins bien", hint: "Avec douceur et sincérité" },
  prochaine: { emoji: "🛠️", title: "La semaine prochaine", hint: "Une amélioration, des objectifs" },
  outfits: { emoji: "👗", title: "Nos outfits de la semaine", hint: "Le défilé de la semaine" },
  rdv: { emoji: "📅", title: "Notre prochain rendez-vous", hint: "À deux 💞" },
  recap: { emoji: "📝", title: "Récap", hint: "Notre point en un coup d'œil" },
};

export const MOODS = ["🥰", "😊", "🙂", "😐", "😕", "😢", "😤", "😴"];

export const REVIEW_OPTIONS = [
  { value: "tenu", label: "Tenu", emoji: "✅" },
  { value: "moitie", label: "À moitié", emoji: "➖" },
  { value: "pas_tenu", label: "Pas tenu", emoji: "❌" },
] as const;

export const MONTHS_SHORT = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
export const MONTHS_LONG = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
export const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

export function seasonLabel(months: number[]): string {
  if (months.length >= 12) return "Toute l'année";
  if (months.length === 0) return "Jamais";
  const set = new Set(months);
  const ranges: [number, number][] = [];
  for (let m = 1; m <= 12; m++) {
    if (set.has(m) && !set.has(m === 1 ? 12 : m - 1)) {
      let end = m;
      while (set.has((end % 12) + 1)) end = (end % 12) + 1;
      ranges.push([m, end]);
    }
  }
  return ranges
    .map(([a, b]) => (a === b ? MONTHS_SHORT[a - 1] : `${MONTHS_SHORT[a - 1]}–${MONTHS_SHORT[b - 1]}`))
    .join(", ");
}

export function isWalk(name: string | null | undefined) {
  return !!name && name.toLowerCase().startsWith("marche à pied");
}

export type Filters = { location: "tous" | "interieur" | "exterieur"; budget: "tous" | "petit" | "gros" };

export function eligibleActivities(
  activities: Activity[],
  dateIso: string,
  filters: Filters,
  excludedIds: Set<string>,
): Activity[] {
  const month = Number(dateIso.slice(5, 7));
  return activities.filter(
    (a) =>
      a.months.includes(month) &&
      !excludedIds.has(a.id) &&
      (filters.location === "tous" || a.location === filters.location) &&
      (filters.budget === "tous" || a.budget === filters.budget),
  );
}

/** "2026-11-18" -> "mercredi 18 novembre" */
export function formatDate(iso: string, opts: { weekday?: boolean; year?: boolean } = { weekday: true }) {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: opts.weekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: opts.year ? "numeric" : undefined,
  });
}

export function todayIso() {
  const d = new Date();
  return toIso(d);
}

export function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
