"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Card, Empty, Page, PageHeader, PhotoImg, Sheet, nameOf } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { deletePhoto, uploadPhoto } from "@/lib/photos";
import { notifyPartner } from "@/lib/push";
import type { OutfitComment, OutfitReaction, Photo } from "@/lib/types";
import { capitalize, formatDate, todayIso } from "@/lib/constants";

const dayOf = (o: Photo) => o.worn_on || o.created_at.slice(0, 10);
const REACTIONS = ["😍", "🔥", "🥰", "👏", "💅", "😂", "👀", "🤔"];

export default function OutfitsPage() {
  const { couple, me, partner, on, toast, hint } = useApp();
  const [outfits, setOutfits] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [wornOn, setWornOn] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const [reactions, setReactions] = useState<OutfitReaction[]>([]);
  const [comments, setComments] = useState<OutfitComment[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data }, { data: r }, { data: c }] = await Promise.all([
      sb.from("outfits").select("*").order("worn_on", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("outfit_reactions").select("*"),
      sb.from("outfit_comments").select("*").order("created_at"),
    ]);
    setOutfits(data || []);
    setReactions(r || []);
    setComments(c || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:outfits", load), on("db:outfit_reactions", load), on("db:outfit_comments", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setWornOn(todayIso());
    if (input.current) input.current.value = "";
  }

  async function post() {
    if (!file || !couple) return;
    setBusy(true);
    try {
      const path = await uploadPhoto(couple.id, "outfits", file);
      const { data: row, error } = await supabase()
        .from("outfits")
        .insert({ couple_id: couple.id, path, caption: caption.trim(), worn_on: wornOn })
        .select()
        .single();
      if (error) throw error;
      hint("outfits", { eventType: "INSERT", new: row });
      notifyPartner("outfit");
      toast(`👗 Outfit posté ! ${nameOf(partner)} va adorer`);
      setFile(null);
      setPreview(null);
      setCaption("");
      load();
    } catch (e) {
      toast("Oups : " + errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeDay(o: Photo, iso: string) {
    if (!iso) return;
    const { error } = await supabase().from("outfits").update({ worn_on: iso }).eq("id", o.id);
    if (error) return toast(errMsg(error));
    setZoom({ ...o, worn_on: iso });
    hint("outfits");
    load();
  }

  async function remove(o: Photo) {
    if (!confirm("Supprimer cet outfit ?")) return;
    await supabase().from("outfits").delete().eq("id", o.id);
    await deletePhoto(o.path);
    setZoom(null);
    load();
  }

  // Regroupe par jour porté, du plus récent au plus ancien
  const days: { iso: string; list: Photo[] }[] = [];
  for (const o of outfits) {
    const iso = dayOf(o);
    const last = days[days.length - 1];
    if (last?.iso === iso) last.list.push(o);
    else days.push({ iso, list: [o] });
  }
  const thisYear = todayIso().slice(0, 4);

  return (
    <Page>
      <PageHeader title="Outfit" emoji="👗" />
      <Card className="mb-5 bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="font-display text-xl font-semibold">Tu sors ? Montre ta tenue ✨</p>
        <p className="mb-3 text-sm text-muted">{nameOf(partner)} la verra tout de suite.</p>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="outfit-input" />
        <Button className="w-full" onClick={() => input.current?.click()}>
          📸 Poster un outfit
        </Button>
      </Card>

      {days.length === 0 ? (
        <Empty emoji="👀">Aucun outfit pour l&apos;instant.</Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(({ iso, list }) => (
            <section key={iso}>
              <h2 className="mb-2 font-display text-lg font-semibold">
                {iso === todayIso() ? "Aujourd'hui" : capitalize(formatDate(iso, { weekday: true, year: iso.slice(0, 4) !== thisYear }))}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {list.map((o) => (
                  <button key={o.id} onClick={() => setZoom(o)} className="overflow-hidden rounded-3xl bg-card text-left shadow-sm">
                    <PhotoImg path={o.path} className="aspect-[3/4] w-full" />
                    <div className="p-2.5">
                      <p className="text-sm font-semibold">{o.user_id === me?.id ? "Moi" : nameOf(partner)}</p>
                      {o.caption && <p className="truncate text-xs text-muted">{o.caption}</p>}
                      <Badges
                        emojis={reactions.filter((x) => x.outfit_id === o.id && x.emoji).map((x) => x.emoji!)}
                        last={comments.filter((x) => x.outfit_id === o.id).at(-1)}
                        count={comments.filter((x) => x.outfit_id === o.id).length}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={!!file} onClose={() => !busy && setFile(null)} title="Mon outfit">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mb-3 max-h-[45dvh] w-full rounded-2xl object-contain" />
        )}
        <label className="mb-3 flex items-center justify-between gap-3 text-sm font-medium">
          Porté le
          <input
            type="date"
            value={wornOn}
            max={todayIso()}
            onChange={(e) => e.target.value && setWornOn(e.target.value)}
            className="rounded-2xl border border-line bg-card px-3 py-2 outline-none focus:border-rose"
          />
        </label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Une petite légende ? (facultatif)"
          className="mb-3 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
        />
        <Button className="w-full" onClick={post} disabled={busy}>
          {busy ? "Envoi…" : "Publier 💃"}
        </Button>
      </Sheet>

      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black/85 p-4" onClick={() => setZoom(null)}>
          <PhotoImg path={zoom.path} className="max-h-[50dvh] w-auto rounded-2xl !object-contain" />
          {zoom.caption && <p className="mt-3 text-white">{zoom.caption}</p>}
          {zoom.user_id === me?.id ? (
            <div className="mt-3 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <label className="flex items-center gap-2 text-sm text-white/80">
                Porté le
                <input
                  type="date"
                  value={dayOf(zoom)}
                  max={todayIso()}
                  onChange={(e) => changeDay(zoom, e.target.value)}
                  className="rounded-xl bg-white/15 px-2 py-1 text-white outline-none"
                />
              </label>
              <button className="text-sm text-white/80 underline" onClick={() => remove(zoom)}>
                Supprimer
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/70">Porté le {formatDate(dayOf(zoom))}</p>
          )}
          <Reactions
            outfit={zoom}
            mine={zoom.user_id === me?.id}
            list={reactions.filter((x) => x.outfit_id === zoom.id)}
            meId={me?.id}
            partnerName={nameOf(partner)}
            onSaved={load}
          />
          <Thread
            outfit={zoom}
            list={comments.filter((x) => x.outfit_id === zoom.id)}
            meId={me?.id}
            partnerName={nameOf(partner)}
            onSaved={load}
          />
        </div>
      )}
    </Page>
  );
}

function Badges({ emojis, last, count }: { emojis: string[]; last?: OutfitComment; count: number }) {
  if (!emojis.length && !count) return null;
  return (
    <p className="mt-1 truncate rounded-xl bg-rose-soft px-2 py-1 text-xs">
      {emojis.join(" ")}
      {count > 0 && (
        <>
          {emojis.length > 0 && " · "}💬 {count > 1 ? `${count} · ` : ""}
          {last?.body}
        </>
      )}
    </p>
  );
}

/** Emoji de réaction : seulement sur l'outfit de l'autre. Sur le mien, je vois le sien. */
function Reactions({
  outfit,
  mine,
  list,
  meId,
  onSaved,
}: {
  outfit: Photo;
  mine: boolean;
  list: OutfitReaction[];
  meId?: string;
  partnerName: string;
  onSaved: () => void;
}) {
  const { toast, hint } = useApp();
  const existing = list.find((x) => x.user_id === meId);
  const [emoji, setEmoji] = useState<string | null>(existing?.emoji ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmoji(existing?.emoji ?? null);
  }, [outfit.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(next: string | null) {
    setBusy(true);
    setEmoji(next);
    const { error } = await supabase().from("outfit_reactions").upsert({
      outfit_id: outfit.id,
      user_id: meId,
      couple_id: outfit.couple_id,
      emoji: next,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast(errMsg(error));
    hint("outfit_reactions");
    if (next) notifyPartner("reaction");
    onSaved();
  }

  if (mine) {
    const theirs = list.filter((x) => x.user_id !== meId && x.emoji);
    if (!theirs.length) return null;
    return (
      <p className="mt-2 text-4xl" onClick={(e) => e.stopPropagation()}>
        {theirs.map((x) => x.emoji).join(" ")}
      </p>
    );
  }

  return (
    <div className="mt-3 flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
      {REACTIONS.map((r) => (
        <button
          key={r}
          disabled={busy}
          onClick={() => save(emoji === r ? null : r)}
          className={`rounded-full p-1.5 text-2xl transition ${emoji === r ? "scale-110 bg-white/30" : "opacity-80"}`}
          aria-label={`Réagir ${r}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** Petite conversation sous l'outfit : chacun peut écrire et répondre. */
function Thread({
  outfit,
  list,
  meId,
  partnerName,
  onSaved,
}: {
  outfit: Photo;
  list: OutfitComment[];
  meId?: string;
  partnerName: string;
  onSaved: () => void;
}) {
  const { toast, hint } = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [list.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase()
      .from("outfit_comments")
      .insert({ outfit_id: outfit.id, user_id: meId, couple_id: outfit.couple_id, body });
    setBusy(false);
    if (error) return toast(errMsg(error));
    setText("");
    hint("outfit_comments");
    notifyPartner("comment");
    onSaved();
  }

  async function remove(c: OutfitComment) {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase().from("outfit_comments").delete().eq("id", c.id);
    if (error) return toast(errMsg(error));
    hint("outfit_comments");
    onSaved();
  }

  return (
    <div className="mt-3 flex w-full max-w-sm flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {list.length > 0 && (
        <div className="flex max-h-[22dvh] flex-col gap-1.5 overflow-y-auto">
          {list.map((c) => {
            const mine = c.user_id === meId;
            return (
              <div
                key={c.id}
                onContextMenu={(e) => {
                  if (!mine) return;
                  e.preventDefault();
                  remove(c);
                }}
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "self-end bg-rose text-white" : "self-start bg-white/15 text-white"}`}
              >
                {!mine && <p className="text-[11px] font-semibold text-white/60">{partnerName}</p>}
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            );
          })}
          <div ref={end} />
        </div>
      )}
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
          placeholder={list.length ? "Répondre…" : "Un petit mot ?"}
          maxLength={500}
          className="min-w-0 flex-1 rounded-2xl bg-white/15 px-4 py-2 text-white placeholder:text-white/50 outline-none"
        />
        <button disabled={busy || !text.trim()} className="rounded-2xl bg-rose px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Envoyer
        </button>
      </form>
    </div>
  );
}
