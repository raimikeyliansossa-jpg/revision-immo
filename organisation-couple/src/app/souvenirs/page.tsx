"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Empty, Media, Page, PageHeader, Sheet } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { deletePhoto, isVideoFile, isVideoPath, uploadPhoto, uploadVideo } from "@/lib/photos";
import type { Photo } from "@/lib/types";
import { MONTHS_LONG, capitalize, formatDate, toIso, todayIso } from "@/lib/constants";

const dayOf = (p: Photo) => p.taken_on || p.created_at.slice(0, 10);

/** Date proposée par défaut : celle du fichier (souvent le jour de la photo), jamais dans le futur. */
function guessDate(files: File[]) {
  const t = Math.min(...files.map((f) => f.lastModified || Date.now()));
  const iso = toIso(new Date(t));
  return iso > todayIso() ? todayIso() : iso;
}

const inputCls = "rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose";

export default function SouvenirsPage() {
  const { couple, on, toast, reload } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<File[] | null>(null);
  const [newDate, setNewDate] = useState(todayIso());
  const [newCaption, setNewCaption] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase()
      .from("memories")
      .select("*")
      .is("outing_id", null) // les photos des sorties restent dans Nos sorties
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });
    setPhotos(data || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:memories", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setPending(list);
    setNewDate(guessDate(list));
    setNewCaption("");
    if (input.current) input.current.value = "";
  }

  async function upload() {
    if (!pending || !couple) return;
    const list = pending;
    setPending(null);
    setProgress({ done: 0, total: list.length });
    for (const [i, f] of list.entries()) {
      try {
        const path = isVideoFile(f) ? await uploadVideo(couple.id, f) : await uploadPhoto(couple.id, "souvenirs", f);
        const { error } = await supabase()
          .from("memories")
          .insert({ couple_id: couple.id, path, caption: newCaption.trim(), taken_on: newDate });
        if (error) throw error;
      } catch (e) {
        toast(`${isVideoFile(f) ? "Une vidéo" : "Une photo"} n'a pas pu être envoyée : ` + errMsg(e));
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    load();
  }

  function open(p: Photo) {
    setZoom(p);
    setEditing(false);
  }

  function startEdit(p: Photo) {
    setEditDate(dayOf(p));
    setEditCaption(p.caption || "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!zoom || !editDate) return;
    const patch = { taken_on: editDate, caption: editCaption.trim() };
    const { error } = await supabase().from("memories").update(patch).eq("id", zoom.id);
    if (error) return toast(errMsg(error));
    setZoom({ ...zoom, ...patch });
    setEditing(false);
    load();
  }

  async function setCover(p: Photo) {
    const { error } = await supabase().from("couples").update({ cover_path: p.path }).eq("id", couple!.id);
    if (error) return toast(errMsg(error));
    toast("📌 Nouvelle photo de couverture !");
    reload();
    setZoom(null);
  }

  async function remove(p: Photo) {
    if (!confirm("Supprimer ce souvenir ?")) return;
    if (couple?.cover_path === p.path) await supabase().from("couples").update({ cover_path: null }).eq("id", couple.id);
    await supabase().from("memories").delete().eq("id", p.id);
    await deletePhoto(p.path);
    setZoom(null);
    reload();
    load();
  }

  // Regroupe par mois du souvenir, du plus récent au plus ancien
  const months: { key: string; label: string; list: Photo[] }[] = [];
  for (const p of photos) {
    const iso = dayOf(p);
    const key = iso.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.list.push(p);
    else months.push({ key, label: `${capitalize(MONTHS_LONG[Number(iso.slice(5, 7)) - 1])} ${iso.slice(0, 4)}`, list: [p] });
  }

  return (
    <Page>
      <PageHeader title="Nos souvenirs" emoji="🖼️" />
      <input ref={input} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <Button className="mb-4 w-full" onClick={() => input.current?.click()} disabled={!!progress}>
        {progress ? `Envoi ${progress.done}/${progress.total}…` : "➕ Ajouter photos et vidéos"}
      </Button>

      {months.length === 0 ? (
        <Empty emoji="📷">Ajoutez vos plus belles photos et vidéos à deux depuis la galerie de votre téléphone.</Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {months.map((m) => (
            <section key={m.key}>
              <h2 className="mb-2 font-display text-lg font-semibold">{m.label}</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {m.list.map((p) => (
                  <button key={p.id} onClick={() => open(p)} className="relative overflow-hidden rounded-xl">
                    <Media path={p.path} className="aspect-square w-full" />
                    {couple?.cover_path === p.path && (
                      <span className="absolute left-1 top-1 rounded-full bg-white/85 px-1.5 text-xs">📌</span>
                    )}
                    {p.caption && (
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[11px] text-white">
                        {p.caption}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending && pending.length > 1 ? `Ajouter ${pending.length} souvenirs` : "Ajouter un souvenir"}
      >
        {pending && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              C&apos;était le
              <input
                type="date"
                value={newDate}
                max={todayIso()}
                onChange={(e) => e.target.value && setNewDate(e.target.value)}
                className="rounded-2xl border border-line bg-card px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <input
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              maxLength={200}
              placeholder={pending.length > 1 ? "Une légende pour ces souvenirs ? (facultatif)" : "Une petite légende ? (facultatif)"}
              className={inputCls}
            />
            <Button onClick={upload}>Ajouter 💞</Button>
          </div>
        )}
      </Sheet>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black/90 p-4"
          onClick={() => setZoom(null)}
        >
          {isVideoPath(zoom.path) ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Media path={zoom.path} full className="max-h-[60dvh] w-auto max-w-full rounded-2xl" />
            </div>
          ) : (
            <Media path={zoom.path} className="max-h-[60dvh] w-auto rounded-2xl !object-contain" />
          )}

          {editing ? (
            <div className="mt-3 flex w-full max-w-sm flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <label className="flex items-center justify-between gap-2 text-sm text-white/80">
                C&apos;était le
                <input
                  type="date"
                  value={editDate}
                  max={todayIso()}
                  onChange={(e) => e.target.value && setEditDate(e.target.value)}
                  className="rounded-xl bg-white/15 px-2 py-1 text-white outline-none"
                />
              </label>
              <input
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                maxLength={200}
                placeholder="Une petite légende ?"
                className="rounded-2xl bg-white/15 px-4 py-2 text-white placeholder:text-white/50 outline-none"
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveEdit}>
                  Enregistrer
                </Button>
                <Button variant="ghost" className="!text-white/80" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <>
              {zoom.caption && <p className="mt-3 max-w-sm text-center text-white">{zoom.caption}</p>}
              <p className="mt-1 text-sm text-white/70">{capitalize(formatDate(dayOf(zoom), { weekday: true, year: true }))}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="soft" onClick={() => startEdit(zoom)}>
                  ✏️ Légende et date
                </Button>
                {!isVideoPath(zoom.path) && <Button onClick={() => setCover(zoom)}>📌 Couverture</Button>}
                <Button variant="ghost" className="!text-white/80" onClick={() => remove(zoom)}>
                  🗑️
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Page>
  );
}
