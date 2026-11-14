"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/components/Providers";
import {
  Button,
  Card,
  Empty,
  Media,
  Page,
  PageHeader,
  Segmented,
  Sheet,
  nameOf,
} from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import {
  deletePhoto,
  isVideoFile,
  isVideoPath,
  uploadPhoto,
  uploadVideo,
} from "@/lib/photos";
import type { Activity, Outing, OutingRating, Photo } from "@/lib/types";
import { capitalize, formatDate, todayIso } from "@/lib/constants";

export default function SortiesPage() {
  const { me, partner, on } = useApp();
  const [outings, setOutings] = useState<Outing[]>([]);
  const [ratings, setRatings] = useState<OutingRating[]>([]);
  const [tab, setTab] = useState<"historique" | "classement">("historique");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: o }, { data: r }, { data: m }] = await Promise.all([
      sb
        .from("outings")
        .select("*")
        .not("activity_id", "is", null)
        .order("date", { ascending: false }),
      sb.from("outing_ratings").select("*"),
      sb
        .from("memories")
        .select("*")
        .not("outing_id", "is", null)
        .order("created_at"),
    ]);
    setOutings(o || []);
    setRatings(r || []);
    setPhotos(m || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [
      on("db:outings", load),
      on("db:outing_ratings", load),
      on("db:memories", load),
      on("resync", load),
    ];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  // Prévues pour aujourd'hui ou avant : à valider tout de suite, sans attendre le dimanche
  const toReview = outings
    .filter((o) => o.status === "prevue" && o.date <= todayIso())
    .reverse();
  const upcoming = outings
    .filter((o) => o.status === "prevue" && o.date > todayIso())
    .reverse();
  const done = outings.filter((o) => o.status === "faite");
  const shown = filter ? done.filter((o) => o.activity_name === filter) : done;
  const photosOf = (o: Outing) => photos.filter((p) => p.outing_id === o.id);
  const open = outings.find((o) => o.id === openId) || null;
  const r = (o: Outing, uid?: string) =>
    ratings.find((x) => x.outing_id === o.id && x.user_id === uid);

  const ranking = Object.values(
    done.reduce<
      Record<
        string,
        { name: string; emoji: string; scores: number[]; count: number }
      >
    >((acc, o) => {
      const k = o.activity_name || "?";
      acc[k] ||= {
        name: k,
        emoji: o.activity_emoji || "✨",
        scores: [],
        count: 0,
      };
      acc[k].count++;
      ratings
        .filter((x) => x.outing_id === o.id && x.score !== null)
        .forEach((x) => acc[k].scores.push(x.score!));
      return acc;
    }, {}),
  )
    .map((x) => ({
      ...x,
      avg: x.scores.length
        ? x.scores.reduce((a, b) => a + b, 0) / x.scores.length
        : null,
    }))
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <Page>
      <PageHeader title="Nos sorties" emoji="🗺️" />

      <Button className="mb-4 w-full" onClick={() => setAdding(true)}>
        ➕ On fait une sortie
      </Button>

      {toReview.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold">
            Alors, c&apos;était comment ?
          </h2>
          <div className="flex flex-col gap-2">
            {toReview.map((o) => (
              <ToReviewCard
                key={o.id}
                outing={o}
                onOpen={() => setOpenId(o.id)}
                onChanged={load}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-lg font-semibold">À venir</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((o) => (
              <Card
                key={o.id}
                className="flex cursor-pointer items-center gap-3 !p-3"
                onClick={() => setOpenId(o.id)}
              >
                <span className="text-3xl">{o.activity_emoji}</span>
                <div>
                  <p className="font-semibold">{o.activity_name}</p>
                  <p className="text-sm text-muted">
                    {capitalize(formatDate(o.date))}
                    {o.steps_goal
                      ? ` · 🎯 ${o.steps_goal.toLocaleString("fr-FR")} pas`
                      : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "historique", label: "📜 Historique" },
          { value: "classement", label: "🏆 Classement" },
        ]}
      />

      <div className="mt-4">
        {done.length === 0 ? (
          <Empty emoji="🗺️">
            Vos sorties apparaîtront ici dès que vous les marquez « faites », le
            jour même ou au point du dimanche.
          </Empty>
        ) : tab === "historique" ? (
          <div className="flex flex-col gap-3">
            {filter && (
              <button
                onClick={() => setFilter(null)}
                className="self-start rounded-full bg-rose-soft px-3 py-1 text-sm font-medium"
              >
                {filter} ✕
              </button>
            )}
            {shown.map((o) => (
              <Card
                key={o.id}
                className="cursor-pointer active:scale-[0.99]"
                onClick={() => setOpenId(o.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{o.activity_emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold">
                      {o.activity_name}
                    </p>
                    {o.place && (
                      <p className="truncate text-sm">📍 {o.place}</p>
                    )}
                    <p className="text-sm text-muted">
                      {capitalize(
                        formatDate(o.date, { weekday: true, year: true }),
                      )}
                    </p>
                  </div>
                  <span className="text-sm text-muted">
                    {photosOf(o).length ? `📸 ${photosOf(o).length}` : "📸 +"}
                  </span>
                </div>
                {photosOf(o).length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {photosOf(o)
                      .slice(0, 4)
                      .map((p) => (
                        <Media
                          key={p.id}
                          path={p.path}
                          className="aspect-square w-full rounded-xl"
                        />
                      ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[me, partner].map((p) => {
                    const x = r(o, p?.id);
                    return (
                      <div
                        key={p?.id || "x"}
                        className="rounded-2xl bg-cream p-3"
                      >
                        <p className="text-xs font-semibold">{nameOf(p)}</p>
                        <p className="font-display text-2xl font-semibold text-rose">
                          {x?.score ?? "–"}
                          <span className="text-sm text-muted">/10</span>
                        </p>
                        {x?.comment && (
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {x.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranking.map((x, i) => (
              <li
                key={x.name}
                onClick={() => {
                  setFilter(x.name);
                  setTab("historique");
                }}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card p-3 active:scale-[0.99]"
              >
                <span className="w-8 text-center font-display text-xl font-semibold text-muted">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </span>
                <span className="text-3xl">{x.emoji}</span>
                <span className="flex-1">
                  <span className="block font-medium">{x.name}</span>
                  <span className="text-xs text-muted">{x.count} fois</span>
                </span>
                <span className="font-display text-xl font-semibold text-rose">
                  {x.avg !== null
                    ? x.avg.toLocaleString("fr-FR", {
                        maximumFractionDigits: 1,
                      })
                    : "–"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Sheet open={!!open} onClose={() => setOpenId(null)}>
        {open && (
          <OutingDetail
            outing={open}
            photos={photosOf(open)}
            ratings={ratings.filter((x) => x.outing_id === open.id)}
            onChanged={load}
            onDeleted={() => {
              setOpenId(null);
              load();
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="➕ On fait une sortie"
      >
        {adding && (
          <AddOuting
            onCreated={(id) => {
              setAdding(false);
              load();
              if (id) setOpenId(id);
            }}
          />
        )}
      </Sheet>
    </Page>
  );
}

/** Une sortie faite : le lieu, et les photos / vidéos qu'on y a prises. */
function OutingDetail({
  outing,
  photos,
  ratings,
  onChanged,
  onDeleted,
}: {
  outing: Outing;
  photos: Photo[];
  ratings: OutingRating[];
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { couple, toast, hint, userId, partner } = useApp();
  const isDone = outing.status === "faite";
  const canReview = outing.status === "prevue" && outing.date <= todayIso();

  async function setStatus(status: Outing["status"]) {
    const { error } = await supabase()
      .from("outings")
      .update({ status })
      .eq("id", outing.id);
    if (error) return toast(errMsg(error));
    hint("outings");
    if (status === "pas_faite")
      toast("🎡 Pas faite : l'activité retourne dans la roulette.");
    onChanged();
  }

  async function cancel() {
    if (!confirm(`Annuler la sortie « ${outing.activity_name} » ?`)) return;
    const { error } = await supabase()
      .from("outings")
      .delete()
      .eq("id", outing.id);
    if (error) return toast(errMsg(error));
    hint("outings");
    onDeleted();
  }
  const [place, setPlace] = useState(outing.place || "");
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setPlace(outing.place || ""), [outing.id, outing.place]);

  async function savePlace() {
    if (place.trim() === (outing.place || "")) return;
    const { error } = await supabase()
      .from("outings")
      .update({ place: place.trim() })
      .eq("id", outing.id);
    if (error) return toast(errMsg(error));
    hint("outings");
    onChanged();
  }

  async function add(files: FileList | null) {
    if (!files || !couple) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    for (const [i, f] of list.entries()) {
      try {
        const path = isVideoFile(f)
          ? await uploadVideo(couple.id, f)
          : await uploadPhoto(couple.id, "souvenirs", f);
        const { error } = await supabase()
          .from("memories")
          .insert({
            couple_id: couple.id,
            path,
            taken_on: outing.date,
            outing_id: outing.id,
            caption:
              `${outing.activity_emoji || ""} ${outing.activity_name || ""}`.trim(),
          });
        if (error) throw error;
      } catch (e) {
        toast(
          `${isVideoFile(f) ? "Une vidéo" : "Une photo"} n'a pas pu être envoyée : ` +
            errMsg(e),
        );
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    hint("memories");
    onChanged();
  }

  async function remove(p: Photo) {
    if (!confirm("Supprimer cette photo de la sortie ?")) return;
    await supabase().from("memories").delete().eq("id", p.id);
    await deletePhoto(p.path);
    setZoom(null);
    hint("memories");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-5xl">{outing.activity_emoji}</div>
        <p className="font-display text-2xl font-semibold">
          {outing.activity_name}
        </p>
        <p className="text-sm text-muted">
          {capitalize(formatDate(outing.date, { weekday: true, year: true }))}
        </p>
      </div>

      {canReview && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setStatus("faite")}>
            On l&apos;a faite ✅
          </Button>
          <Button
            variant="soft"
            className="flex-1"
            onClick={() => setStatus("pas_faite")}
          >
            Pas faite
          </Button>
        </div>
      )}

      {outing.status === "prevue" && !canReview && (
        <p className="rounded-2xl bg-card p-3 text-center text-sm text-muted">
          📅 Prévue pour ce jour-là. Le jour J, vous pourrez la noter et ajouter
          vos photos ici.
        </p>
      )}

      {outing.status === "pas_faite" && (
        <p className="rounded-2xl bg-card p-3 text-center text-sm">
          🎡 Pas faite : l&apos;activité est retournée dans la roulette.{" "}
          <button
            className="text-rose underline"
            onClick={() => setStatus("faite")}
          >
            En fait si, on l&apos;a faite
          </button>
        </p>
      )}

      {isDone && (
        <RatingBlock
          outing={outing}
          ratings={ratings}
          meId={userId}
          partnerId={partner?.id}
          partnerName={nameOf(partner)}
          onSaved={onChanged}
        />
      )}

      {outing.date <= todayIso() && outing.status !== "pas_faite" && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            📍 Où ? Qu&apos;est-ce qu&apos;on a vu ?
            <textarea
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onBlur={savePlace}
              rows={2}
              maxLength={300}
              placeholder="Ex. Musée d'Orsay — expo Monet"
              className="resize-none rounded-2xl border border-line bg-card px-4 py-3 font-normal outline-none focus:border-rose"
            />
          </label>

          <div>
            <h3 className="mb-2 font-semibold">📸 Nos photos de la sortie</h3>
            {photos.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setZoom(p)}
                    className="overflow-hidden rounded-xl"
                  >
                    <Media path={p.path} className="aspect-square w-full" />
                  </button>
                ))}
              </div>
            )}
            <input
              ref={input}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => add(e.target.files)}
            />
            <Button
              variant="soft"
              className="w-full"
              onClick={() => input.current?.click()}
              disabled={!!progress}
            >
              {progress
                ? `Envoi ${progress.done}/${progress.total}…`
                : "➕ Ajouter photos et vidéos"}
            </Button>
          </div>
        </>
      )}

      {outing.status === "prevue" && (
        <button className="text-sm text-muted underline" onClick={cancel}>
          Annuler cette sortie
        </button>
      )}

      {zoom &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4"
            onClick={() => setZoom(null)}
          >
            {isVideoPath(zoom.path) ? (
              <div onClick={(e) => e.stopPropagation()}>
                <Media
                  path={zoom.path}
                  full
                  className="max-h-[75dvh] w-auto max-w-full rounded-2xl"
                />
              </div>
            ) : (
              <Media
                path={zoom.path}
                className="max-h-[75dvh] w-auto rounded-2xl !object-contain"
              />
            )}
            <button
              className="mt-4 text-sm text-white/80 underline"
              onClick={(e) => (e.stopPropagation(), remove(zoom))}
            >
              Supprimer
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Notes sur 10 + petit mot, comme au point du dimanche, mais à tout moment. */
function RatingBlock({
  outing,
  ratings,
  meId,
  partnerId,
  partnerName,
  onSaved,
}: {
  outing: Outing;
  ratings: OutingRating[];
  meId?: string | null;
  partnerId?: string;
  partnerName: string;
  onSaved: () => void;
}) {
  const { toast, hint } = useApp();
  const mine = ratings.find((x) => x.user_id === meId);
  const theirs = ratings.find((x) => x.user_id === partnerId);
  const [score, setScore] = useState<number | null>(mine?.score ?? null);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ score, comment });
  latest.current = { score, comment };

  useEffect(() => {
    setScore(mine?.score ?? null);
    setComment(mine?.comment ?? "");
  }, [outing.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const { error } = await supabase().from("outing_ratings").upsert({
      outing_id: outing.id,
      user_id: meId,
      couple_id: outing.couple_id,
      score: latest.current.score,
      comment: latest.current.comment,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast(errMsg(error));
    hint("outing_ratings");
    onSaved();
  }

  // Enregistre tout seul, un instant après la dernière modification
  function later() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
  }
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        save();
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
        <p className="text-xs font-semibold">Ma note</p>
        <p className="text-center font-display text-3xl font-semibold text-rose">
          {score ?? "–"}
          <span className="text-base text-muted">/10</span>
        </p>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={score ?? 5}
          onChange={(e) => {
            setScore(Number(e.target.value));
            later();
          }}
          className="w-full"
        />
        <textarea
          rows={3}
          placeholder="Mon avis…"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            later();
          }}
          className="w-full resize-none rounded-xl bg-cream px-3 py-2 text-sm outline-none ring-rose/40 focus:ring-2"
        />
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
        <p className="text-xs font-semibold">{partnerName}</p>
        <p className="text-center font-display text-3xl font-semibold text-rose">
          {theirs?.score ?? "–"}
          <span className="text-base text-muted">/10</span>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm">
          {theirs?.comment || <i className="text-muted">Pas encore noté…</i>}
        </p>
      </div>
    </div>
  );
}

/** Carte « c'était comment ? » pour une sortie prévue aujourd'hui ou avant. */
function ToReviewCard({
  outing,
  onOpen,
  onChanged,
}: {
  outing: Outing;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const { toast, hint } = useApp();
  async function setStatus(status: Outing["status"]) {
    const { error } = await supabase()
      .from("outings")
      .update({ status })
      .eq("id", outing.id);
    if (error) return toast(errMsg(error));
    hint("outings");
    onChanged();
    if (status === "faite") onOpen();
  }
  return (
    <Card className="!p-3">
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="text-3xl">{outing.activity_emoji}</span>
        <span className="flex-1">
          <span className="block font-semibold">{outing.activity_name}</span>
          <span className="text-sm text-muted">
            {outing.date === todayIso()
              ? "Aujourd'hui"
              : capitalize(formatDate(outing.date))}
          </span>
        </span>
      </button>
      <div className="mt-2 flex gap-2">
        <Button className="flex-1 !py-2" onClick={() => setStatus("faite")}>
          On l&apos;a faite ✅
        </Button>
        <Button
          variant="soft"
          className="flex-1 !py-2"
          onClick={() => setStatus("pas_faite")}
        >
          Pas faite
        </Button>
      </div>
    </Card>
  );
}

/** Ajouter une sortie à la main : aujourd'hui (on la note tout de suite) ou un autre jour. */
function AddOuting({ onCreated }: { onCreated: (id: string | null) => void }) {
  const { couple, toast, hint } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [q, setQ] = useState("");
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase()
      .from("activities")
      .select("*")
      .order("name")
      .then(({ data }) => setActivities(data || []));
  }, []);

  const list = activities.filter((a) =>
    a.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  async function create(a: Activity) {
    if (!couple || busy) return;
    setBusy(true);
    const past = date <= todayIso();
    const { data, error } = await supabase()
      .from("outings")
      .insert({
        couple_id: couple.id,
        date,
        activity_id: a.id,
        activity_name: a.name,
        activity_emoji: a.emoji,
        status: past ? "faite" : "prevue",
      })
      .select()
      .single();
    setBusy(false);
    if (error) return toast(errMsg(error));
    hint("outings");
    toast(
      past
        ? `${a.emoji} ${a.name} ajoutée : notez-la et mettez vos photos !`
        : `📅 ${a.name} prévue le ${formatDate(date)}`,
    );
    onCreated(past ? data.id : null);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        C&apos;est quand ?
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-2xl border border-line bg-card px-3 py-2 outline-none focus:border-rose"
        />
      </label>
      <p className="text-xs text-muted">
        {date <= todayIso()
          ? "Aujourd'hui ou avant : elle va direct dans l'historique, vous pourrez la noter et mettre vos photos."
          : "Plus tard : elle sera dans « À venir », et le jour J vous pourrez la noter."}
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Quelle activité ? (pique-nique, resto…)"
        className="rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
      />
      <ul className="flex max-h-[45dvh] flex-col gap-1.5 overflow-y-auto">
        {list.map((a) => (
          <li key={a.id}>
            <button
              disabled={busy}
              onClick={() => create(a)}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left active:scale-[0.98]"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="font-medium">{a.name}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <p className="text-center text-sm text-muted">
            Pas dans la liste ? Ajoute-la d&apos;abord dans 🎡 Nos activités.
          </p>
        )}
      </ul>
    </div>
  );
}
