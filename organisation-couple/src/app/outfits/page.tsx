"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Card, Empty, Page, PageHeader, PhotoImg, Sheet, nameOf } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { deletePhoto, uploadPhoto } from "@/lib/photos";
import { notifyPartner } from "@/lib/push";
import type { Photo } from "@/lib/types";
import { capitalize, formatDate, todayIso } from "@/lib/constants";

const dayOf = (o: Photo) => o.worn_on || o.created_at.slice(0, 10);

export default function OutfitsPage() {
  const { couple, me, partner, on, toast, hint } = useApp();
  const [outfits, setOutfits] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [wornOn, setWornOn] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase()
      .from("outfits")
      .select("*")
      .order("worn_on", { ascending: false })
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
          <PhotoImg path={zoom.path} className="max-h-[70dvh] w-auto rounded-2xl !object-contain" />
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
        </div>
      )}
    </Page>
  );
}
