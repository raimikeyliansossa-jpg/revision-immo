import { NextResponse } from "next/server";
import { adminClient, sendPush } from "@/lib/server/push";

// Envoie une notification de test à MES téléphones, pour vérifier que tout marche.
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const admin = adminClient();
  const { data: u } = await admin.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const vapid = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.user.id);
  const res = await sendPush(subs || [], {
    title: "🔔 Test réussi",
    body: "Les notifications marchent sur ce téléphone 💞",
    url: "/reglages",
  });
  return NextResponse.json({ vapid, subscriptions: (subs || []).length, ...res });
}
