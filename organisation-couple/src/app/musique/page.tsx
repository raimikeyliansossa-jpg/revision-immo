"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Card, Empty, Page, PageHeader, Sheet, cx, nameOf } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { notifyPartner } from "@/lib/push";
import type { Song, SongComment } from "@/lib/types";
import { capitalize, formatDate, todayIso, toIso } from "@/lib/constants";
import type { SongHit } from "@/app/api/music/search/route";

const REACTIONS = ["🔥", "😍", "🥹", "💃", "🤯", "😴", "👎"];

/** Un seul extrait joue à la fois dans toute la page. */
let player: HTMLAudioElement | null = null;
let playingKey: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function deezerId(link: string | null | undefined) {
  return link?.match(/deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/)?.[1] ?? null;
}

async function togglePreview(key: string, url: string | null, link: string | null) {
  if (!player) {
    player = new Audio();
    player.onended = player.onpause = () => {
      playingKey = null;
      notify();
    };
  }
  if (playingKey === key) {
    player.pause();
    return;
  }
  playingKey = key;
  notify();
  // Lien frais si possible (ceux de Deezer expirent au bout de quelques heures)
  const id = deezerId(link);
  let src = url;
  if (id) {
    const fresh = await fetch(`/api/music/preview?id=${id}`)
      .then((r) => r.json())
      .catch(() => null);
    if (fresh?.preview) src = fresh.preview;
  }
  if (!src || playingKey !== key) return;
  player.src = src;
  player.play().catch(() => {
    playingKey = null;
    notify();
  });
}

function usePlaying(key: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const l = () => setOn(playingKey === key);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, [key]);
  return on;
}

function PlayButton({
  id,
  url,
  link,
  className,
}: {
  id: string;
  url: string | null;
  link: string | null;
  className?: string;
}) {
  const on = usePlaying(id);
  if (!url && !deezerId(link)) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        togglePreview(id, url, link);
      }}
      className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose text-white shadow", className)}
      aria-label={on ? "Pause" : "Écouter l'extrait"}
    >
      {on ? "⏸" : "▶"}
    </button>
  );
}

function Cover({ url, className }: { url: string | null; className?: string }) {
  if (!url) return <div className={cx("grid place-items-center bg-rose-soft text-2xl", className)}>🎵</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={cx("object-cover", className)} loading="lazy" />;
}

function listenLinks(s: Pick<Song, "title" | "artist" | "link">) {
  const q = encodeURIComponent(`${s.title} ${s.artist}`.trim());
  const links = [
    { label: "Spotify", href: `https://open.spotify.com/search/${q}` },
    { label: "YouTube Music", href: `https://music.youtube.com/search?q=${q}` },
    { label: "Apple Music", href: `https://music.apple.com/fr/search?term=${q}` },
    { label: "Deezer", href: s.link && s.link.includes("deezer.com") ? s.link : `https://www.deezer.com/search/${q}` },
  ];
  if (s.link && !s.link.includes("deezer.com")) links.unshift({ label: "Son lien", href: s.link });
  return links;
}

export default function MusiquePage() {
  const { me, partner, on } = useApp();
  const [songs, setSongs] = useState<Song[]>([]);
  const [comments, setComments] = useState<SongComment[]>([]);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: s }, { data: c }] = await Promise.all([
      sb.from("songs").select("*").order("created_at", { ascending: false }),
      sb.from("song_comments").select("*").order("created_at"),
    ]);
    setSongs(s || []);
    setComments(c || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:songs", load), on("db:song_comments", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  const days: { iso: string; list: Song[] }[] = [];
  for (const s of songs) {
    const iso = toIso(new Date(s.created_at));
    const last = days[days.length - 1];
    if (last?.iso === iso) last.list.push(s);
    else days.push({ iso, list: [s] });
  }
  const open = songs.find((s) => s.id === openId) || null;
  const toListen = songs.filter((s) => s.user_id !== me?.id && !s.listened_at).length;

  return (
    <Page>
      <PageHeader title="Musique" emoji="🎵" />
      <Card className="mb-5 bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="font-display text-xl font-semibold">Un son à lui faire écouter ? 🎧</p>
        <p className="mb-3 text-sm text-muted">
          {toListen > 0
            ? `${nameOf(partner)} t'a recommandé ${toListen} son${toListen > 1 ? "s" : ""} pas encore écouté${toListen > 1 ? "s" : ""}.`
            : `Recommande ton son du jour à ${nameOf(partner)}.`}
        </p>
        <Button className="w-full" onClick={() => setAdding(true)}>
          ➕ Recommander un son
        </Button>
      </Card>

      {days.length === 0 ? (
        <Empty emoji="🎶">Aucun son pour l&apos;instant. Lance-toi !</Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(({ iso, list }) => (
            <section key={iso}>
              <h2 className="mb-2 font-display text-lg font-semibold">
                {iso === todayIso() ? "Aujourd'hui" : capitalize(formatDate(iso))}
              </h2>
              <div className="flex flex-col gap-2">
                {list.map((s) => {
                  const mine = s.user_id === me?.id;
                  const n = comments.filter((c) => c.song_id === s.id).length;
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenId(s.id)}
                      onKeyDown={(e) => e.key === "Enter" && setOpenId(s.id)}
                      className="flex cursor-pointer items-center gap-3 rounded-3xl border border-line bg-card p-2.5 text-left shadow-sm active:scale-[0.98]"
                    >
                      <Cover url={s.cover_url} className="h-16 w-16 shrink-0 rounded-2xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.title}</span>
                        <span className="block truncate text-sm text-muted">{s.artist}</span>
                        <span className="mt-0.5 block truncate text-xs">
                          {mine ? `Pour ${nameOf(partner)}` : `De ${nameOf(partner)}`}
                          {s.reaction && ` · ${s.reaction}`}
                          {s.listened_at && " · 🎧 écouté"}
                          {!mine && !s.listened_at && <span className="font-semibold text-rose"> · nouveau</span>}
                          {n > 0 && ` · 💬 ${n}`}
                        </span>
                      </span>
                      <PlayButton id={s.id} url={s.preview_url} link={s.link} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="🎵 Recommander un son">
        {adding && (
          <AddSong
            onDone={() => {
              setAdding(false);
              load();
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!open} onClose={() => setOpenId(null)}>
        {open && (
          <SongDetail
            song={open}
            mine={open.user_id === me?.id}
            partnerName={nameOf(partner)}
            comments={comments.filter((c) => c.song_id === open.id)}
            meId={me?.id}
            onChanged={load}
            onDeleted={() => {
              setOpenId(null);
              load();
            }}
          />
        )}
      </Sheet>
    </Page>
  );
}

// ---------------------------------------------------------------------
// Ajouter un son : recherche Deezer ou saisie à la main
// ---------------------------------------------------------------------

function AddSong({ onDone }: { onDone: () => void }) {
  const { couple, partner, toast, hint } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SongHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SongHit | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const id = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`).then((x) => x.json());
        if (id === seq.current) setResults(r.results || []);
      } catch {
        if (id === seq.current) setResults([]);
      } finally {
        if (id === seq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function send() {
    if (!couple) return;
    const row = picked
      ? {
          title: picked.title,
          artist: picked.artist,
          cover_url: picked.cover_url,
          artist_picture: picked.artist_picture,
          preview_url: picked.preview_url,
          link: picked.link,
        }
      : { title: title.trim(), artist: artist.trim(), link: link.trim() || null };
    if (!row.title) return;
    setBusy(true);
    const { error } = await supabase()
      .from("songs")
      .insert({ ...row, couple_id: couple.id, note: note.trim() });
    setBusy(false);
    if (error) return toast(errMsg(error));
    hint("songs");
    notifyPartner("song");
    toast(`🎵 Envoyé à ${nameOf(partner)} !`);
    onDone();
  }

  const noteField = (
    <textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      maxLength={300}
      rows={2}
      placeholder="Un petit mot ? (pourquoi ce son, à écouter quand…)"
      className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
    />
  );

  if (picked) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-3xl bg-card p-3">
          <Cover url={picked.cover_url} className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{picked.title}</p>
            <p className="truncate text-sm text-muted">{picked.artist}</p>
          </div>
          <PlayButton id={`hit-${picked.id}`} url={picked.preview_url} link={picked.link} />
        </div>
        {noteField}
        <Button onClick={send} disabled={busy}>
          {busy ? "Envoi…" : `Envoyer à ${nameOf(partner)} 💌`}
        </Button>
        <button className="text-sm text-muted underline" onClick={() => setPicked(null)}>
          Choisir un autre son
        </button>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du son"
          className="rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artiste"
          className="rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          type="url"
          placeholder="Lien Spotify, YouTube… (facultatif)"
          className="rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
        />
        {noteField}
        <Button onClick={send} disabled={busy || !title.trim()}>
          {busy ? "Envoi…" : `Envoyer à ${nameOf(partner)} 💌`}
        </Button>
        <button className="text-sm text-muted underline" onClick={() => setManual(false)}>
          Revenir à la recherche
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Titre ou artiste"
        className="rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
      />
      {searching && !results && <p className="text-center text-sm text-muted">Recherche…</p>}
      {results && results.length === 0 && !searching && (
        <p className="text-center text-sm text-muted">Rien trouvé 🤷 Essaie avec l&apos;artiste, ou écris-le à la main.</p>
      )}
      <ul className="flex max-h-[50dvh] flex-col gap-1.5 overflow-y-auto">
        {results?.map((r) => (
          <li key={r.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPicked(r)}
              onKeyDown={(e) => e.key === "Enter" && setPicked(r)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-card p-2 text-left active:scale-[0.98]"
            >
              <Cover url={r.cover_url} className="h-12 w-12 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">{r.artist}</span>
              </span>
              <PlayButton id={`hit-${r.id}`} url={r.preview_url} link={r.link} className="!h-9 !w-9" />
            </div>
          </li>
        ))}
      </ul>
      <button className="text-sm text-muted underline" onClick={() => setManual(true)}>
        Pas trouvé ? L&apos;écrire à la main
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Détail d'un son : écouter, réagir, en discuter
// ---------------------------------------------------------------------

function SongDetail({
  song,
  mine,
  partnerName,
  comments,
  meId,
  onChanged,
  onDeleted,
}: {
  song: Song;
  mine: boolean;
  partnerName: string;
  comments: SongComment[];
  meId?: string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { toast, hint } = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(patch: Partial<Pick<Song, "reaction" | "listened_at">>) {
    const { error } = await supabase().from("songs").update(patch).eq("id", song.id);
    if (error) return toast(errMsg(error));
    hint("songs");
    onChanged();
  }

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase()
      .from("song_comments")
      .insert({ song_id: song.id, user_id: meId, couple_id: song.couple_id, body });
    setBusy(false);
    if (error) return toast(errMsg(error));
    setText("");
    hint("song_comments");
    notifyPartner("song_comment");
    onChanged();
  }

  async function remove() {
    if (!confirm(`Supprimer « ${song.title} » ?`)) return;
    const { error } = await supabase().from("songs").delete().eq("id", song.id);
    if (error) return toast(errMsg(error));
    hint("songs");
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Cover url={song.cover_url} className="h-44 w-44 rounded-3xl shadow-lg" />
          {song.artist_picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.artist_picture}
              alt={song.artist}
              className="absolute -bottom-3 -right-3 h-14 w-14 rounded-full border-4 border-cream object-cover"
            />
          )}
        </div>
        <p className="mt-4 font-display text-2xl font-semibold leading-tight">{song.title}</p>
        <p className="text-muted">{song.artist}</p>
        <p className="mt-1 text-xs text-muted">
          {mine ? `Pour ${partnerName}` : `De ${partnerName}`} · {formatDate(song.created_at)}
        </p>
      </div>

      {song.note && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-center italic">« {song.note} »</p>}

      {(song.preview_url || deezerId(song.link)) && (
        <div className="flex items-center justify-center gap-3">
          <PlayButton id={song.id} url={song.preview_url} link={song.link} className="!h-14 !w-14 text-xl" />
          <span className="text-sm text-muted">Écouter l&apos;extrait (30 s)</span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {listenLinks(song).map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium"
          >
            {l.label} ↗
          </a>
        ))}
      </div>

      {mine ? (
        <p className="text-center text-sm">
          {song.listened_at ? `🎧 ${partnerName} l'a écouté` : `${partnerName} ne l'a pas encore écouté`}
          {song.reaction && <span className="ml-2 text-2xl align-middle">{song.reaction}</span>}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant={song.listened_at ? "soft" : "primary"}
            onClick={() => update({ listened_at: song.listened_at ? null : new Date().toISOString() })}
          >
            {song.listened_at ? "🎧 Écouté ✓" : "🎧 Je l'ai écouté"}
          </Button>
          <div className="flex justify-center gap-1">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => update({ reaction: song.reaction === r ? null : r })}
                className={cx("rounded-full p-1.5 text-2xl transition", song.reaction === r ? "scale-110 bg-rose-soft" : "opacity-70")}
                aria-label={`Réagir ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {comments.map((c) => {
          const own = c.user_id === meId;
          return (
            <div
              key={c.id}
              className={cx(
                "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm",
                own ? "self-end bg-rose text-white" : "self-start bg-card",
              )}
            >
              {!own && <p className="text-[11px] font-semibold text-muted">{partnerName}</p>}
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </div>
          );
        })}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={comments.length ? "Répondre…" : "T'en as pensé quoi ?"}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-2.5 outline-none focus:border-rose"
          />
          <Button className="!px-4" disabled={busy || !text.trim()}>
            Envoyer
          </Button>
        </form>
      </div>

      {mine && (
        <button className="text-sm text-muted underline" onClick={remove}>
          Supprimer ce son
        </button>
      )}
    </div>
  );
}
