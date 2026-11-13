import { NextResponse } from "next/server";
import { adminClient, sendPush } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Appelé par Vercel Cron le dimanche (18 h et 19 h UTC).
// On n'envoie que s'il est bien 20 h à Paris (gère l'heure d'été / d'hiver).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "interdit" }, { status: 401 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const paris = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", hour: "numeric", hour12: false })
    .formatToParts(new Date());
  const hour = Number(paris.find((p) => p.type === "hour")?.value);
  const weekday = paris.find((p) => p.type === "weekday")?.value;
  if (!force && (weekday !== "dimanche" || hour !== 20)) return NextResponse.json({ skipped: true, weekday, hour });

  const { data: subs } = await adminClient().from("push_subscriptions").select("*");
  const res = await sendPush(subs || [], { title: "Notre point du dimanche", body: "C'est l'heure de notre point 💞", url: "/" });
  return NextResponse.json(res);
}
