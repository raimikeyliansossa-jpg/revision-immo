// Calculs des bilans (mois / trimestre) et des notes de la semaine.
// Tout est calculé ici, à partir de l'historique du couple : rien n'est envoyé ailleurs.
import type { Answer, Outing, Point, PointItem, PointKind } from "./types";

export type History = {
  points: Point[];
  answers: Answer[];
  items: PointItem[];
  outings: Outing[];
};

// ---------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthStart(monthEnd: string) {
  return monthEnd.slice(0, 8) + "01";
}

/** Dernier jour du mois précédent */
export function prevMonthEnd(monthEnd: string) {
  return addDays(monthStart(monthEnd), -1);
}

/** Les 3 fins de mois du trimestre, dans l'ordre */
export function quarterMonths(quarterEnd: string) {
  const m3 = quarterEnd;
  const m2 = prevMonthEnd(m3);
  const m1 = prevMonthEnd(m2);
  return [m1, m2, m3];
}

export function prevQuarterEnd(quarterEnd: string) {
  return prevMonthEnd(quarterMonths(quarterEnd)[0]);
}

export function monthLabel(monthEnd: string) {
  return new Date(monthEnd + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------
// Objectifs : un objectif par ligne
// ---------------------------------------------------------------------

export function lines(text: string | null | undefined): string[] {
  return (text || "")
    .split(/\n|;/)
    .map((l) => l.replace(/^\s*(?:[-•*·✅❌✔️]+|\d+\s*[.)/-])\s*/u, "").trim())
    .filter((l) => l.length > 1);
}

/** Pour reconnaître le même objectif écrit deux fois un peu différemment */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 4)
    .join(" ");
}
const STOP = new Set(["les", "des", "une", "pour", "par", "avec", "mes", "mon", "plus", "pas", "que", "qui", "sur", "dans", "fois", "faire"]);

// ---------------------------------------------------------------------
// Notes de la semaine : 1re partie (mercredi) + 2e partie (dimanche)
// ---------------------------------------------------------------------

export type HalfNotes = { h1: number | null; h2: number | null; avg: number | null };
export type Week = { sunday: string; byUser: Record<string, HalfNotes>; avg: number | null };

const mean = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};

export function weeks(h: History): Week[] {
  const map = new Map<string, Record<string, { h1: number | null; h2: number | null }>>();
  const get = (sunday: string, uid: string) => {
    const w = map.get(sunday) || {};
    map.set(sunday, w);
    return (w[uid] ||= { h1: null, h2: null });
  };
  const byPoint = new Map<string, Answer[]>();
  for (const a of h.answers) byPoint.set(a.point_id, [...(byPoint.get(a.point_id) || []), a]);

  // 1) mercredis
  for (const p of h.points.filter((p) => p.kind === "mercredi"))
    for (const a of byPoint.get(p.id) || []) if (a.half1_score !== null) get(addDays(p.week_date, 4), a.user_id).h1 = a.half1_score;
  // 2) dimanches (et bilans faits à la place d'un dimanche)
  for (const p of h.points) {
    const sunday = p.kind === "semaine" ? p.week_date : p.covers_week;
    if (!sunday) continue;
    for (const a of byPoint.get(p.id) || []) {
      const n = get(sunday, a.user_id);
      if (a.week_score !== null) n.h2 = a.week_score;
      if (n.h1 === null && a.half1_score !== null) n.h1 = a.half1_score;
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sunday, users]) => {
      const byUser = Object.fromEntries(Object.entries(users).map(([u, n]) => [u, { ...n, avg: mean([n.h1, n.h2]) }]));
      return { sunday, byUser, avg: mean(Object.values(byUser).map((n) => n.avg)) };
    });
}

export function weekOf(h: History, sunday: string) {
  return weeks(h).find((w) => w.sunday === sunday) || null;
}

// ---------------------------------------------------------------------
// Synthèse d'une période (un mois, ou les 3 mois d'un trimestre)
// ---------------------------------------------------------------------

export type GoalLine = { text: string; sunday: string };
export type PersonPeriod = {
  avg: number | null;
  /** moyenne (2e partie − 1re partie) sur les semaines où les deux notes existent */
  progress: number | null;
  better: number;
  worse: number;
  done: GoalLine[];
  missed: GoalLine[];
  improvements: { text: string; sunday: string; status: Answer["review_status"] }[];
};
export type Period = {
  from: string;
  to: string;
  weeks: Week[];
  avg: number | null;
  byUser: Record<string, PersonPeriod>;
  outings: Outing[];
  sundays: Point[];
};

export function period(h: History, from: string, to: string, userIds: string[]): Period {
  const ws = weeks(h).filter((w) => w.sunday >= from && w.sunday <= to);
  const sundays = h.points
    .filter((p) => p.kind === "semaine" && p.week_date >= from && p.week_date <= to)
    .sort((a, b) => a.week_date.localeCompare(b.week_date));
  const allSundays = h.points.filter((p) => p.kind === "semaine").sort((a, b) => a.week_date.localeCompare(b.week_date));
  const ans = (pid: string, uid: string) => h.answers.find((a) => a.point_id === pid && a.user_id === uid);

  const byUser: Record<string, PersonPeriod> = {};
  for (const uid of userIds) {
    const notes = ws.map((w) => w.byUser[uid]).filter(Boolean);
    const both = notes.filter((n) => n.h1 !== null && n.h2 !== null);
    const done: GoalLine[] = [];
    const missed: GoalLine[] = [];
    const improvements: PersonPeriod["improvements"] = [];
    for (const p of sundays) {
      const a = ans(p.id, uid);
      if (!a) continue;
      lines(a.goals_done).forEach((text) => done.push({ text, sunday: p.week_date }));
      lines(a.goals_missed).forEach((text) => missed.push({ text, sunday: p.week_date }));
      // l'amélioration promise ce dimanche est jugée au dimanche suivant
      if (a.next_improvement.trim()) {
        const next = allSundays.find((x) => x.week_date > p.week_date);
        improvements.push({
          text: a.next_improvement.trim(),
          sunday: p.week_date,
          status: next ? ans(next.id, uid)?.review_status ?? null : null,
        });
      }
    }
    byUser[uid] = {
      avg: mean(notes.map((n) => n.avg)),
      progress: mean(both.map((n) => n.h2! - n.h1!)),
      better: both.filter((n) => n.h2! > n.h1!).length,
      worse: both.filter((n) => n.h2! < n.h1!).length,
      done,
      missed,
      improvements,
    };
  }
  return {
    from,
    to,
    weeks: ws,
    avg: mean(ws.map((w) => w.avg)),
    byUser,
    outings: h.outings.filter((o) => o.status === "faite" && o.date >= from && o.date <= to).sort((a, b) => a.date.localeCompare(b.date)),
    sundays,
  };
}

export function monthPeriod(h: History, monthEnd: string, userIds: string[]) {
  return period(h, monthStart(monthEnd), monthEnd, userIds);
}

// ---------------------------------------------------------------------
// Points noirs : ceux du dernier bilan, à relire au point suivant
// ---------------------------------------------------------------------

/** Le bilan (mois) dont on relit les points noirs, ou null s'ils ont déjà été relus */
export function pointNoirSource(h: History, current: Point): Point | null {
  const prevMois = h.points
    .filter((p) => p.kind === "mois" && p.week_date < current.week_date && p.id !== current.id)
    .sort((a, b) => b.week_date.localeCompare(a.week_date))[0];
  if (!prevMois) return null;
  if (current.kind === "mois") {
    // déjà relus au point du trimestre entre les deux ?
    const tri = h.points.some((p) => p.kind === "trimestre" && p.week_date > prevMois.week_date && p.week_date < current.week_date);
    if (tri) return null;
  }
  return prevMois;
}

// ---------------------------------------------------------------------
// Score perso du trimestre
// ---------------------------------------------------------------------

export const SCORE_RULES = {
  done: 3,
  missed: 0,
  better: 2,
  worse: -1,
  regle: 5,
  revient: -2,
};

export type Score = {
  total: number;
  done: number;
  missed: number;
  better: number;
  worse: number;
  regle: number;
  revient: number;
};

/** Points noirs relus (réglés ou qui reviennent) pendant le trimestre */
function noirsOfQuarter(h: History, quarterEnd: string) {
  const from = monthStart(quarterMonths(quarterEnd)[0]);
  const ids = new Set(h.points.filter((p) => p.kind === "mois" && p.week_date >= addDays(from, -1) && p.week_date < quarterEnd).map((p) => p.id));
  return h.items.filter((i) => i.kind === "point_noir" && ids.has(i.point_id));
}

export function quarterScore(h: History, quarterEnd: string, uid: string): Score {
  const months = quarterMonths(quarterEnd);
  const per = period(h, monthStart(months[0]), quarterEnd, [uid]).byUser[uid];
  const noirs = noirsOfQuarter(h, quarterEnd);
  const s = {
    done: per.done.length,
    missed: per.missed.length,
    better: per.better,
    worse: per.worse,
    regle: noirs.filter((i) => i.status === "regle").length,
    revient: noirs.filter((i) => i.status === "revient").length,
  };
  const total =
    s.done * SCORE_RULES.done +
    s.missed * SCORE_RULES.missed +
    s.better * SCORE_RULES.better +
    s.worse * SCORE_RULES.worse +
    s.regle * SCORE_RULES.regle +
    s.revient * SCORE_RULES.revient;
  return { total, ...s };
}

// ---------------------------------------------------------------------
// Analyse automatique du trimestre
// ---------------------------------------------------------------------

export type Counted = { text: string; count: number };

function countLines(list: GoalLine[]): Counted[] {
  const m = new Map<string, Counted>();
  for (const g of list) {
    const k = normalize(g.text) || g.text.toLowerCase();
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { text: g.text, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

export type Analysis = {
  weeksCount: number;
  done: Counted[];
  missed: Counted[];
  /** objectifs ratés au moins 2 fois */
  wake: Counted[];
  habits: string[];
  impTenu: number;
  impMoitie: number;
  impPasTenu: number;
};

export function quarterAnalysis(h: History, quarterEnd: string, uid: string): Analysis {
  const months = quarterMonths(quarterEnd);
  const per = period(h, monthStart(months[0]), quarterEnd, [uid]);
  const p = per.byUser[uid];
  const missed = countLines(p.missed);
  const monthIds = new Set(h.points.filter((x) => x.kind === "mois" && x.week_date >= monthStart(months[0]) && x.week_date <= quarterEnd).map((x) => x.id));
  return {
    weeksCount: per.sundays.length,
    done: countLines(p.done),
    missed,
    wake: missed.filter((m) => m.count >= 2),
    habits: h.answers.filter((a) => monthIds.has(a.point_id) && a.user_id === uid && a.month_improved.trim()).map((a) => a.month_improved.trim()),
    impTenu: p.improvements.filter((i) => i.status === "tenu").length,
    impMoitie: p.improvements.filter((i) => i.status === "moitie").length,
    impPasTenu: p.improvements.filter((i) => i.status === "pas_tenu").length,
  };
}

export function quarterNoirs(h: History, quarterEnd: string) {
  const noirs = noirsOfQuarter(h, quarterEnd);
  return { regle: noirs.filter((i) => i.status === "regle"), revient: noirs.filter((i) => i.status === "revient") };
}

// ---------------------------------------------------------------------
// Rappels : objectifs du mois et du trimestre en cours
// ---------------------------------------------------------------------

/** Dernier bilan du mois (ou du trimestre) avant `before`, pour rappeler ses objectifs */
export function lastPlan(h: History, before: string) {
  const prev = h.points
    .filter((p) => (p.kind === "mois" || p.kind === "trimestre") && p.week_date < before)
    .sort((a, b) => b.week_date.localeCompare(a.week_date));
  const mois = prev.find((p) => p.kind === "mois") || null;
  const tri = prev.find((p) => p.kind === "trimestre") || null;
  return { mois, tri };
}

// ---------------------------------------------------------------------
// Quel point proposer aujourd'hui ? (même logique que point_period en SQL)
// ---------------------------------------------------------------------

export function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function isoDow(iso: string) {
  const d = new Date(iso + "T12:00:00").getDay();
  return d === 0 ? 7 : d;
}

export function endOfMonth(iso: string) {
  const d = new Date(iso.slice(0, 7) + "-01T12:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function periodOf(kind: PointKind, today = parisToday()): string {
  const sunday = addDays(today, (7 - isoDow(today)) % 7);
  if (kind === "mercredi") return addDays(sunday, -4);
  if (kind === "mois") {
    const day = Number(today.slice(8, 10));
    return endOfMonth(day <= 7 ? addDays(today, -8) : today);
  }
  if (kind === "trimestre") {
    const m = Number(today.slice(5, 7));
    const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
    const qStart = `${today.slice(0, 4)}-${String(qStartMonth).padStart(2, "0")}-01`;
    const daysIn = (new Date(today + "T12:00:00").getTime() - new Date(qStart + "T12:00:00").getTime()) / 86400000;
    if (daysIn < 14) return addDays(qStart, -1);
    return endOfMonth(`${today.slice(0, 4)}-${String(qStartMonth + 2).padStart(2, "0")}-01`);
  }
  return sunday;
}

/** Le point à mettre en avant aujourd'hui */
export function suggestedKind(points: Point[], today = parisToday()): PointKind {
  const done = (kind: PointKind) => points.some((p) => p.kind === kind && p.week_date === periodOf(kind, today) && p.status === "termine");
  const tri = periodOf("trimestre", today);
  if (today >= tri && today <= addDays(tri, 13) && !done("trimestre")) return "trimestre";
  const mois = periodOf("mois", today);
  const isQuarterEnd = [3, 6, 9, 12].includes(Number(mois.slice(5, 7)));
  if (!isQuarterEnd && today >= mois && today <= addDays(mois, 7) && !done("mois")) return "mois";
  const dow = isoDow(today);
  if (dow >= 3 && dow <= 6 && !done("mercredi") && !done("semaine")) return "mercredi";
  return "semaine";
}
