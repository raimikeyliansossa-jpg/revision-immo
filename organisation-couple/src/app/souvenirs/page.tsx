"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Empty, Page, PageHeader, PhotoImg, VideoClip } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { deletePhoto, isVideoFile, isVideoPath, uploadPhoto, uploadVideo } from "@/lib/photos";
import type { Photo } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/constants";

export default function SouvenirsPage() {
  const { couple, on, toast, reload } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase().from("memories").select("*").order("created_at", { ascending: false });
    setPhotos(data || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:memories", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  async function add(files: FileList | null) {
    if (!files || !couple) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    for (const [i, f] of list.entries()) {
      try {
        const path = isVideoFile(f) ? await uploadVideo(couple.id, f) : await uploadPhoto(couple.id, "souvenirs", f);
        const { error } = await supabase().from("memories").insert({ couple_id: couple.id, path });
        if (error) throw error;
      } catch (e) {
        toast(`${isVideoFile(f) ? "Une vidéo" : "Une photo"} n'a pas pu être envoyée : ` + errMsg(e));
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (input.current) input.current.value = "";
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

  return (
    <Page>
      <PageHeader title="Nos souvenirs" emoji="🖼️" />
      <input ref={input} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      <Button className="mb-4 w-full" onClick={() => input.current?.click()} disabled={!!progress}>
        {progress ? `Envoi ${progress.done}/${progress.total}…` : "➕ Ajouter photos et vidéos"}
      </Button>

      {photos.length === 0 ? (
        <Empty emoji="📷">Ajoutez vos plus belles photos et vidéos à deux depuis la galerie de votre téléphone.</Empty>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setZoom(p)} className="relative overflow-hidden rounded-xl">
              {isVideoPath(p.path) ? (
                <>
                  <VideoClip path={p.path} className="aspect-square w-full" />
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 text-xs text-white">▶</span>
                </>
              ) : (
                <PhotoImg path={p.path} className="aspect-square w-full" />
              )}
              {couple?.cover_path === p.path && (
                <span className="absolute left-1 top-1 rounded-full bg-white/85 px-1.5 text-xs">📌</span>
              )}
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4" onClick={() => setZoom(null)}>
          {isVideoPath(zoom.path) ? (
            <div onClick={(e) => e.stopPropagation()}>
              <VideoClip path={zoom.path} full className="max-h-[70dvh] w-auto max-w-full rounded-2xl" />
            </div>
          ) : (
            <PhotoImg path={zoom.path} className="max-h-[70dvh] w-auto rounded-2xl !object-contain" />
          )}
          <p className="mt-2 text-sm text-white/70">{capitalize(formatDate(zoom.created_at))}</p>
          <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {!isVideoPath(zoom.path) && <Button onClick={() => setCover(zoom)}>📌 Photo de couverture</Button>}
            <Button variant="ghost" className="!text-white/80" onClick={() => remove(zoom)}>
              🗑️
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
