"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/Providers";
import { Button, Card, OnlineDot, Page, PhotoImg, fullName, nameOf } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import type { Outing, Point, PointKind } from "@/lib/types";
import { KIND_META, STEP_META, capitalize, formatDate, todayIso } from "@/lib/constants";
import { periodOf, suggestedKind } from "@/lib/bilan";

const TILES = [
  { href: "/outfits", emoji: "👗", title: "Outfit", sub: "Poster ma tenue" },
  { href: "/musique", emoji: "🎵", title: "Musique", sub: "Le son du jour" },
  { href: "/souvenirs", emoji: "🖼️", title: "Nos souvenirs", sub: "Nos photos à deux" },
  { href: "/activites", emoji: "🎡", title: "Nos activités", sub: "La liste de la roulette" },
  { href: "/sorties", emoji: "🗺️", title: "Nos sorties", sub: "Historique et classement" },
  { href: "/evolution", emoji: "📈", title: "Notre évolution", sub: "Graphique et anciens points" },
  { href: "/reglages", emoji: "⚙️", title: "Réglages", sub: "Prénoms, notifications…" },
];

export default function Home() {
  const { me, partner, couple, pointsDone, on, toast, hint } = useApp();
  const router = useRouter();
  const [points, setPoints] = useState<Point[] | null>(null);
  const [nextOuting, setNextOuting] = useState<Outing | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: p }, { data: o }] = await Promise.all([
      sb.from("points").select("*").order("week_date", { ascending: false }),
      sb
        .from("outings")
        .select("*")
        .eq("status", "prevue")
        .not("activity_id", "is", null)
        .gte("date", todayIso())
        .order("date")
        .limit(1)
        .maybeSingle(),
    ]);
    setPoints(p || []);
    setNextOuting(o);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:points", load), on("db:outings", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  async function startPoint(kind: PointKind) {
    setBusy(true);
    const { data, error } = await supabase().rpc("start_point", { p_kind: kind });
    setBusy(false);
    if (error) return toast(errMsg(error));
    hint("points");
    router.push(`/point?id=${data.id}`);
  }

  const kind = suggestedKind(points || []);
  const meta = KIND_META[kind];
  const inProgress = (points || []).filter((p) => p.status === "en_cours");
  const current = (points || []).find((p) => (p.kind || "semaine") === kind && p.week_date === periodOf(kind));
  const doneNow = current?.status === "termine";

  return (
    <Page>
      {/* En-tête : couverture + prénoms */}
      <div className="relative -mx-4 mb-5 overflow-hidden rounded-b-[2.5rem]">
        {couple?.cover_path ? (
          <PhotoImg path={couple.cover_path} className="h-64 w-full" />
        ) : (
          <div className="h-64 w-full bg-gradient-to-br from-rose-soft via-peach-soft to-cream">
            <span className="absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))] text-5xl">💞</span>
          </div>
        )}
        {couple?.cover_path && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />}
        <div className="safe-top absolute inset-x-0 top-0 flex justify-end px-4">
          <Link href="/reglages" aria-label="Réglages" className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-lg backdrop-blur">
            ⚙️
          </Link>
        </div>
        <div className={`absolute inset-x-0 bottom-0 p-5 ${couple?.cover_path ? "text-white" : "text-ink"}`}>
          <h1 className={`text-2xl font-semibold leading-tight ${couple?.cover_path ? "drop-shadow" : ""}`}>
            {fullName(me)} <span className="font-normal">&</span> {partner ? fullName(partner) : "…"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/40 px-3 py-1 font-semibold backdrop-blur">
              🔥 {pointsDone} point{pointsDone > 1 ? "s" : ""} fait{pointsDone > 1 ? "s" : ""} ensemble
            </span>
            {partner && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 backdrop-blur">
                <OnlineDot userId={partner.id} /> {nameOf(partner)}
              </span>
            )}
          </div>
        </div>
      </div>

      {!partner && couple && <InviteCard code={couple.invite_code} />}

      {/* Nos points */}
      {inProgress.map((p) => {
        const m = KIND_META[p.kind || "semaine"];
        return (
          <Card key={p.id} className="mb-3 border-2 border-rose/40 p-4">
            <p className="text-sm font-medium text-rose">⏳ En cours</p>
            <h2 className="text-xl font-semibold">
              {m.emoji} {m.label}
            </h2>
            <p className="text-sm text-muted">
              {STEP_META[p.steps[p.current_step]]?.emoji} étape {p.current_step + 1}/{p.steps.length}
            </p>
            <Button className="mt-3 w-full" onClick={() => router.push(`/point?id=${p.id}`)} data-testid={`resume-${p.kind || "semaine"}`}>
              Reprendre ▶︎
            </Button>
          </Card>
        );
      })}
      {points && !inProgress.some((p) => (p.kind || "semaine") === kind) && (
        <Card className="mb-3 bg-gradient-to-br from-rose-soft to-peach-soft p-5" data-testid="main-point">
          <p className="text-sm font-medium text-rose">{meta.when} 🌙</p>
          <h2 className="mt-1 text-2xl font-semibold">
            {meta.emoji} {meta.label}
          </h2>
          {doneNow && current ? (
            <>
              <p className="mt-1 text-sm text-muted">C&apos;est fait ✓ Bravo à vous deux 🥰</p>
              <Button variant="soft" className="mt-4 w-full" onClick={() => router.push(`/points/${current.id}`)}>
                Revoir le récap 📝
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">{meta.desc}</p>
              <Button className="mt-4 w-full" onClick={() => startPoint(kind)} disabled={busy || !partner} data-testid="start-point">
                {busy ? "On prépare…" : "Commencer ✨"}
              </Button>
            </>
          )}
        </Card>
      )}
      <div className="mb-4">
        <p className="mb-1.5 text-xs text-muted">Décalé ? Lancer un autre point :</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(KIND_META) as PointKind[]).map((k) => (
            <button
              key={k}
              onClick={() => {
                const running = inProgress.find((p) => (p.kind || "semaine") === k);
                if (running) router.push(`/point?id=${running.id}`);
                else startPoint(k);
              }}
              disabled={busy || !partner}
              data-testid={`start-${k}`}
              className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2 text-left text-sm font-medium active:scale-95 disabled:opacity-50"
            >
              <span className="text-lg">{KIND_META[k].emoji}</span>
              {KIND_META[k].short}
            </button>
          ))}
        </div>
      </div>

      {nextOuting && (
        <Card className="mb-4 flex items-center gap-3">
          <span className="text-4xl">{nextOuting.activity_emoji}</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Prochain rendez-vous</p>
            <p className="font-semibold">{nextOuting.activity_name}</p>
            <p className="text-sm text-muted">{capitalize(formatDate(nextOuting.date))}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-3xl border border-line bg-card p-4 shadow-[0_2px_12px_-6px_rgba(74,44,42,0.15)] transition active:scale-[0.97]">
            <div className="text-3xl">{t.emoji}</div>
            <div className="mt-2 font-display text-lg font-semibold leading-tight">{t.title}</div>
            <div className="text-xs text-muted">{t.sub}</div>
          </Link>
        ))}
      </div>
    </Page>
  );
}

function InviteCard({ code }: { code: string }) {
  const { toast } = useApp();
  const text = `Rejoins notre espace « KS & EK » 💞\n${typeof window !== "undefined" ? window.location.origin : ""}\nCode : ${code}`;
  async function share() {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Copié 📋");
      }
    } catch {}
  }
  return (
    <Card className="mb-4 border-dashed border-rose p-5 text-center">
      <p className="font-medium">💌 Invite ta moitié avec ce code :</p>
      <p className="my-3 font-display text-4xl font-semibold tracking-[0.3em] text-rose" data-testid="invite-code">
        {code}
      </p>
      <Button variant="soft" onClick={share} className="w-full">
        Partager l&apos;invitation
      </Button>
    </Card>
  );
}
