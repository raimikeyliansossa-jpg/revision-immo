import { NextResponse } from "next/server";

export type SongHit = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  artist_picture: string | null;
  preview_url: string | null;
  link: string | null;
};

type DeezerTrack = {
  id: number;
  title: string;
  link?: string;
  preview?: string;
  artist?: { name?: string; picture_medium?: string };
  album?: { cover_medium?: string };
};

/** Recherche de morceaux via l'API publique de Deezer (gratuite, sans clé). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  try {
    const r = await fetch(`https://api.deezer.com/search?limit=12&q=${encodeURIComponent(q)}`, {
      headers: { "Accept-Language": "fr" },
      next: { revalidate: 3600 },
    });
    const json = (await r.json()) as { data?: DeezerTrack[] };
    const results: SongHit[] = (json.data || []).map((t) => ({
      id: String(t.id),
      title: t.title,
      artist: t.artist?.name || "",
      cover_url: t.album?.cover_medium || null,
      artist_picture: t.artist?.picture_medium || null,
      preview_url: t.preview || null,
      link: t.link || null,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "recherche indisponible" }, { status: 502 });
  }
}
