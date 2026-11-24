import type { Activity, PointKind, StepKey } from "./types";

export type StepPart = "synthese" | "perso" | "couple" | "fin";

export const PART_META: Record<StepPart, { emoji: string; label: string }> = {
  synthese: { emoji: "📖", label: "Synthèse" },
  perso: { emoji: "🙋", label: "Partie perso" },
  couple: { emoji: "💑", label: "Partie couple" },
  fin: { emoji: "📝", label: "Pour finir" },
};

export const STEP_META: Record<StepKey, { emoji: string; title: string; hint: string; part: StepPart }> = {
  humeur: { emoji: "😊", title: "Humeur et note de la semaine", hint: "Comment tu te sens ?", part: "perso" },
  objectifs: { emoji: "🎯", title: "Mes objectifs perso", hint: "Ce qui est atteint, ce qui ne l'est pas, et pourquoi", part: "perso" },
  objectifs_suivants: { emoji: "🚀", title: "Mes objectifs perso de la semaine prochaine", hint: "Ce que je veux accomplir pour moi", part: "perso" },
  relecture: { emoji: "🔁", title: "Notre amélioration de la semaine dernière", hint: "Ce qu'on s'était promis pour le couple", part: "couple" },
  sortie: { emoji: "🎟️", title: "Notre dernière sortie", hint: "C'était comment ?", part: "couple" },
  bilan: { emoji: "🌟", title: "Bien / moins bien entre nous", hint: "Avec douceur et sincérité", part: "couple" },
  amelioration: { emoji: "🛠️", title: "Mon amélioration pour le couple", hint: "Une seule, concrète, relue au prochain point", part: "couple" },
  outfits: { emoji: "👗", title: "Nos outfits de la semaine", hint: "Le défilé de la semaine", part: "couple" },
  rdv: { emoji: "📅", title: "Notre prochain rendez-vous", hint: "À deux 💞", part: "couple" },
  recap: { emoji: "📝", title: "Récap", hint: "Notre point en un coup d'œil", part: "fin" },
  // Point du mercredi « Mi-temps »
  mi_constat: { emoji: "📝", title: "Ma 1re partie de semaine", hint: "Mes objectifs du dimanche, et mon constat", part: "perso" },
  mi_note: { emoji: "🔢", title: "Ma note de la 1re partie", hint: "Du lundi au mercredi", part: "perso" },
  mi_plan: { emoji: "💪", title: "Ma 2e partie de semaine", hint: "Ce que je fais pour finir plus fort", part: "perso" },
  // Bilan du mois
  mois_rappel: { emoji: "🔁", title: "Nos points noirs du mois dernier", hint: "Les solutions ont-elles marché ?", part: "synthese" },
  mois_chiffres: { emoji: "📊", title: "Le mois en chiffres", hint: "Vert = mieux que le mois d'avant, rouge = moins bien", part: "synthese" },
  mois_recit: { emoji: "📜", title: "Ce qui s'est passé ce mois-ci", hint: "Objectifs, améliorations, sorties", part: "synthese" },
  mois_perso: { emoji: "🏅", title: "Mon mois", hint: "Ma fierté, et ce qui a coincé", part: "perso" },
  mois_couple: { emoji: "💖", title: "Notre mois à deux", hint: "Le plus beau moment, le sujet qui revient", part: "couple" },
  mois_ameliorations: { emoji: "🏆", title: "Nos améliorations du mois", hint: "Ce qui est devenu une habitude", part: "couple" },
  mois_points_noirs: { emoji: "⚫", title: "Points noirs et solutions", hint: "À écrire à deux, ils reviendront le mois prochain", part: "couple" },
  mois_objectifs: { emoji: "🎯", title: "Objectifs du mois prochain", hint: "Rappelés chaque dimanche et chaque mercredi", part: "couple" },
  // Point du trimestre
  tri_rappel: { emoji: "🔁", title: "Ce qu'on s'était dit", hint: "Le trimestre dernier et nos derniers points noirs", part: "synthese" },
  tri_score: { emoji: "🏅", title: "Notre score perso du trimestre", hint: "Chacun se mesure à lui-même", part: "synthese" },
  tri_analyse: { emoji: "📖", title: "L'analyse des 3 mois", hint: "Atteint, pas atteint, et où se réveiller", part: "synthese" },
  tri_avis: { emoji: "💑", title: "Mon avis sur l'autre", hint: "Avec sincérité et bienveillance", part: "couple" },
  tri_vision: { emoji: "🔭", title: "Les 3 prochains mois", hint: "Ce que je veux vivre, qui je veux devenir", part: "perso" },
  note_semaine: { emoji: "🔢", title: "Ma note de la semaine", hint: "Le bilan remplace le point du dimanche", part: "perso" },
  // Ancienne étape (points commencés avant la mise à jour)
  prochaine: { emoji: "🛠️", title: "La semaine prochaine", hint: "Une amélioration, des objectifs", part: "couple" },
};

export const KIND_META: Record<PointKind, { emoji: string; label: string; short: string; when: string; desc: string }> = {
  semaine: { emoji: "💞", label: "Notre point du dimanche", short: "Dimanche", when: "Dimanche 20 h", desc: "Lancez-le ensemble pendant votre FaceTime 📱💞📱" },
  mercredi: { emoji: "🔔", label: "Point du mercredi « Mi-temps »", short: "Mi-temps", when: "Mercredi 21 h", desc: "La piqûre de rappel : on fait mieux en 2e partie de semaine 💪" },
  mois: { emoji: "📅", label: "Bilan du mois", short: "Bilan du mois", when: "Dernier jour du mois, 21 h", desc: "On regarde le mois en face, puis on trouve nos solutions" },
  trimestre: { emoji: "🌱", label: "Point du trimestre", short: "Trimestre", when: "Fin de trimestre, 21 h", desc: "Notre score, l'analyse des 3 mois et qui on veut devenir" },
};

/** Une couleur par type de point (classes écrites en entier pour Tailwind) */
export const KIND_STYLE: Record<PointKind, { card: string; text: string; border: string; soft: string; bar: string; btn: string }> = {
  semaine: {
    card: "bg-gradient-to-br from-rose-soft to-peach-soft",
    text: "text-rose",
    border: "border-rose/50",
    soft: "bg-rose-soft",
    bar: "bg-rose",
    btn: "",
  },
  mercredi: {
    card: "bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/50 dark:to-yellow-950/30",
    text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-400/60",
    soft: "bg-amber-100 dark:bg-amber-900/40",
    bar: "bg-amber-400",
    btn: "!bg-amber-500 !text-white",
  },
  mois: {
    card: "bg-gradient-to-br from-sky-100 to-indigo-50 dark:from-sky-900/50 dark:to-indigo-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-400/60",
    soft: "bg-sky-100 dark:bg-sky-900/40",
    bar: "bg-sky-500",
    btn: "!bg-sky-600 !text-white",
  },
  trimestre: {
    card: "bg-gradient-to-br from-emerald-100 to-lime-50 dark:from-emerald-900/50 dark:to-lime-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-400/60",
    soft: "bg-emerald-100 dark:bg-emerald-900/40",
    bar: "bg-emerald-500",
    btn: "!bg-emerald-600 !text-white",
  },
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

/** Dernière fois qu'une activité a été faite (pour le signaler sur la roulette, sans l'exclure). */
export function lastDoneLabel(outings: { activity_id: string | null; status: string; date: string }[], activityId: string) {
  const done = outings.filter((o) => o.activity_id === activityId && o.status === "faite").map((o) => o.date).sort();
  if (!done.length) return null;
  const last = done[done.length - 1];
  return `✓ Déjà faite${done.length > 1 ? ` ${done.length} fois` : ""} · la dernière le ${formatDate(last)}`;
}

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
