import { NextResponse } from "next/server";
import { adminClient, sendPush } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Appelé par Vercel Cron chaque soir (18 h, 19 h et 20 h UTC).
// On regarde l'heure de Paris (heure d'été / d'hiver) et on envoie le bon rappel :
//   dimanche 20 h            → point du dimanche
//   mercredi 21 h            → point du mercredi « Mi-temps »
//   dernier jour du mois 21 h → bilan du mois (ou point du trimestre en mars, juin, sept., déc.)
// Le bilan remplace le point du dimanche / du mercredi quand ils tombent le même jour.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "interdit" }, { status: 401 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force"); // ex. ?force=semaine | mercredi | mois | trimestre
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "numeric",
    hour12: false,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const hour = Number(get("hour"));
  const weekday = get("weekday"); // Sun, Wed…
  const day = Number(get("day"));
  const month = Number(get("month"));
  const year = Number(get("year"));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isLastDay = day === lastDay;
  const isQuarter = [3, 6, 9, 12].includes(month);

  let kind: string | null = force === "1" ? "semaine" : force;
  if (!kind) {
    if (isLastDay && hour === 21) kind = isQuarter ? "trimestre" : "mois";
    else if (!isLastDay && weekday === "Wed" && hour === 21) kind = "mercredi";
    else if (!isLastDay && weekday === "Sun" && hour === 20) kind = "semaine";
  }
  const MESSAGES: Record<string, string> = {
    semaine: "C'est l'heure de notre point du dimanche 💞",
    mercredi: "🔔 Mi-temps ! Notre point du mercredi, pour finir la semaine plus fort 💪",
    mois: "📅 C'est le dernier jour du mois : place à notre bilan du mois 💞",
    trimestre: "🌱 Fin du trimestre : notre grand point des 3 mois 💞",
  };
  if (!kind || !MESSAGES[kind]) return NextResponse.json({ skipped: true, weekday, hour, day });

  const { data: subs } = await adminClient().from("push_subscriptions").select("*");
  const res = await sendPush(subs || [], { title: "KS & EK", body: MESSAGES[kind], url: "/" });
  return NextResponse.json({ kind, ...res });
}
