import { NextResponse } from "next/server";
import { adminClient, sendPush } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Appelé par Vercel Cron chaque matin (5 h et 6 h UTC).
// On n'envoie que s'il est bien 7 h à Paris (gère l'heure d'été / d'hiver),
// et seulement à ceux qui n'ont pas encore posté leur outfit du jour.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "interdit" }, { status: 401 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }).format(now),
  );
  if (!force && hour !== 7) return NextResponse.json({ skipped: true, hour });

  // Date du jour à Paris (AAAA-MM-JJ)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const admin = adminClient();
  const { data: posted } = await admin.from("outfits").select("user_id").eq("worn_on", today);
  const done = new Set((posted || []).map((o) => o.user_id));
  const { data: subs } = await admin.from("push_subscriptions").select("*");
  const todo = (subs || []).filter((s) => !done.has(s.user_id));

  const res = await sendPush(todo, {
    title: "KS & EK 👗",
    body: "Bonjour ☀️ Prends ton outfit du jour en photo !",
    url: "/outfits",
  });
  return NextResponse.json(res);
}
