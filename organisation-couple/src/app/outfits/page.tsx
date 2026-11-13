"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Card, Empty, Page, PageHeader, PhotoImg, Sheet, nameOf } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { deletePhoto, uploadPhoto } from "@/lib/photos";
import { notifyPartner } from "@/lib/push";
import type { Photo } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/constants";

export default function OutfitsPage() {
  const { couple, me, partner, on, toast, hint } = useApp();
  const [outfits, setOutfits] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase()
      .from("outfits")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    setOutfits(data || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:outfits", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function post() {
    if (!file || !couple) return;
    setBusy(true);
    try {
      const path = await uploadPhoto(couple.id, "outfits", file);
      const { data: row, error } = await supabase()
        .from("outfits")
        .insert({ couple_id: couple.id, path, caption: caption.trim() })
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

  async function remove(o: Photo) {
    if (!confirm("Supprimer cet outfit ?")) return;
    await supabase().from("outfits").delete().eq("id", o.id);
    await deletePhoto(o.path);
    setZoom(null);
    load();
  }

  return (
    <Page>
      <PageHeader title="Outfit" emoji="👗" />
      <Card className="mb-5 bg-gradient-to-br from-rose-soft to-peach-soft text-center">
        <p className="font-display text-xl font-semibold">Tu sors ? Montre ta tenue ✨</p>
        <p className="mb-3 text-sm text-muted">{nameOf(partner)} la verra tout de suite.</p>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="outfit-input" />
        <Button className="w-full" onClick={() => input.current?.click()}>
          📸 Poster mon outfit
        </Button>
      </Card>

      {outfits.length === 0 ? (
        <Empty emoji="👀">Aucun outfit ces 30 derniers jours.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {outfits.map((o) => (
            <button key={o.id} onClick={() => setZoom(o)} className="overflow-hidden rounded-3xl bg-card text-left shadow-sm">
              <PhotoImg path={o.path} className="aspect-[3/4] w-full" />
              <div className="p-2.5">
                <p className="text-sm font-semibold">{o.user_id === me?.id ? "Moi" : nameOf(partner)}</p>
                <p className="text-xs text-muted">{capitalize(formatDate(o.created_at))}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!file} onClose={() => !busy && setFile(null)} title="Mon outfit du jour">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mb-3 max-h-[50dvh] w-full rounded-2xl object-contain" />
        )}
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
          <PhotoImg path={zoom.path} className="max-h-[75dvh] w-auto rounded-2xl !object-contain" />
          {zoom.caption && <p className="mt-3 text-white">{zoom.caption}</p>}
          <p className="mt-1 text-sm text-white/70">{capitalize(formatDate(zoom.created_at))}</p>
          {zoom.user_id === me?.id && (
            <button className="mt-4 text-sm text-white/80 underline" onClick={(e) => { e.stopPropagation(); remove(zoom); }}>
              Supprimer
            </button>
          )}
        </div>
      )}
    </Page>
  );
}
