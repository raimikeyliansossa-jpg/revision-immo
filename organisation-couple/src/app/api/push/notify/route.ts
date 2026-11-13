import { NextResponse } from "next/server";
import { adminClient, sendPush } from "@/lib/server/push";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const admin = adminClient();
  const { data: u } = await admin.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const { kind } = await req.json().catch(() => ({ kind: null }));
  const MESSAGES: Record<string, { body: string; url: string }> = {
    outfit: { body: "vient de poster son outfit, viens voir 😍", url: "/outfits" },
    reaction: { body: "a réagi à ton outfit 😍", url: "/outfits" },
    comment: { body: "t'a écrit sous un outfit 💬", url: "/outfits" },
    song: { body: "te recommande un son 🎵", url: "/musique" },
    song_comment: { body: "t'a écrit sous un son 🎵💬", url: "/musique" },
  };
  const msg = MESSAGES[kind as string];
  if (!msg) return NextResponse.json({ error: "type inconnu" }, { status: 400 });

  const { data: me } = await admin.from("profiles").select("*").eq("id", u.user.id).single();
  if (!me?.couple_id) return NextResponse.json({ sent: 0 });
  const { data: others } = await admin.from("profiles").select("id").eq("couple_id", me.couple_id).neq("id", me.id);
  const ids = (others || []).map((o) => o.id);
  if (!ids.length) return NextResponse.json({ sent: 0 });
  const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", ids);

  const res = await sendPush(subs || [], {
    title: `${msg.url === "/musique" ? "🎵" : "👗"} ${me.display_name} ${me.emoji}`.trim(),
    body: msg.body,
    url: msg.url,
  });
  return NextResponse.json(res);
}
