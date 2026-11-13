import { NextResponse } from "next/server";

/** Les liens d'extrait Deezer expirent : on en redemande un frais au moment de l'écoute. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ preview: null }, { status: 400 });
  try {
    const r = await fetch(`https://api.deezer.com/track/${id}`, { cache: "no-store" });
    const t = (await r.json()) as { preview?: string };
    return NextResponse.json({ preview: t.preview || null });
  } catch {
    return NextResponse.json({ preview: null }, { status: 502 });
  }
}
