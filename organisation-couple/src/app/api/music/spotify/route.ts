import { NextResponse } from "next/server";
import type { SongHit } from "../search/route";

const SPOTIFY_RE = /^https?:\/\/(open\.spotify\.com|spotify\.link|spotify\.app\.link)\//i;

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Lien Spotify collé (Partager → Copier le lien) → titre, artiste, pochette.
 * Sans clé : oEmbed de Spotify + titre de la page. On complète avec Deezer
 * (photo de l'artiste, extrait) quand le morceau y est trouvé.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!SPOTIFY_RE.test(raw)) return NextResponse.json({ error: "lien Spotify invalide" }, { status: 400 });
  try {
    // Les liens courts (spotify.link) redirigent vers open.spotify.com
    let url = raw;
    if (!/open\.spotify\.com/i.test(url)) {
      const r = await fetch(url, { redirect: "follow" });
      url = r.url;
    }
    const id = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/)?.[1];
    if (!id) return NextResponse.json({ error: "ce lien n'est pas un morceau Spotify" }, { status: 400 });
    const clean = `https://open.spotify.com/track/${id}`;

    const [oembed, page] = await Promise.all([
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(clean)}`)
        .then((r) => r.json() as Promise<{ title?: string; thumbnail_url?: string }>)
        .catch(() => null),
      fetch(clean, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" } })
        .then((r) => r.text())
        .catch(() => ""),
    ]);

    // <title>Titre - song and lyrics by Artiste | Spotify</title>
    const pageTitle = decode(page.match(/<title>([^<]*)<\/title>/i)?.[1] || "");
    const m = pageTitle.match(/^(.*?) - song(?: and lyrics)? by (.*?) \| Spotify/i);
    const ogDesc = decode(page.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1] || "");
    const title = oembed?.title || m?.[1] || "";
    // og:description ressemble à « Artiste · Album · Song · 2024 »
    const artist = m?.[2] || ogDesc.split(" · ")[0] || "";

    const hit: SongHit = {
      id: `spotify-${id}`,
      title,
      artist,
      cover_url: oembed?.thumbnail_url || null,
      artist_picture: null,
      preview_url: null,
      link: clean,
    };

    // Bonus Deezer : photo de l'artiste + extrait
    if (title) {
      const d = await fetch(`https://api.deezer.com/search?limit=1&q=${encodeURIComponent(`${title} ${artist}`)}`)
        .then((r) => r.json() as Promise<{ data?: { preview?: string; artist?: { name?: string; picture_medium?: string }; album?: { cover_medium?: string } }[] }>)
        .catch(() => null);
      const t = d?.data?.[0];
      if (t && (!artist || t.artist?.name?.toLowerCase().includes(artist.toLowerCase().split(",")[0].trim()))) {
        hit.artist ||= t.artist?.name || "";
        hit.artist_picture = t.artist?.picture_medium || null;
        hit.preview_url = t.preview || null;
        hit.cover_url ||= t.album?.cover_medium || null;
      }
    }

    if (!hit.title) return NextResponse.json({ error: "morceau introuvable" }, { status: 404 });
    return NextResponse.json({ result: hit });
  } catch {
    return NextResponse.json({ error: "Spotify ne répond pas" }, { status: 502 });
  }
}
