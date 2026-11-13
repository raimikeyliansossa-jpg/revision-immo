"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { Button, Page, PageHeader, Segmented, Sheet, cx } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import type { Activity, Outing } from "@/lib/types";
import { MONTHS_SHORT, seasonLabel } from "@/lib/constants";
import { ActivityRoulette } from "@/components/ActivityRoulette";

type Draft = Omit<Activity, "id" | "couple_id" | "created_at"> & { id?: string };
const EMPTY: Draft = { name: "", emoji: "✨", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], location: "interieur", budget: "petit" };

export default function ActivitesPage() {
  const { couple, on, toast } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [roulette, setRoulette] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: a }, { data: o }] = await Promise.all([
      sb.from("activities").select("*").order("name"),
      sb.from("outings").select("*").not("activity_id", "is", null),
    ]);
    setActivities(a || []);
    setOutings(o || []);
  }, []);

  useEffect(() => {
    load();
    const offs = [on("db:activities", load), on("db:outings", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  async function save() {
    if (!draft || !draft.name.trim()) return;
    const sb = supabase();
    const row = { name: draft.name.trim(), emoji: draft.emoji || "✨", months: draft.months, location: draft.location, budget: draft.budget };
    const { error } = draft.id
      ? await sb.from("activities").update(row).eq("id", draft.id)
      : await sb.from("activities").insert({ ...row, couple_id: couple!.id });
    if (error) return toast(errMsg(error));
    setDraft(null);
    load();
  }

  async function remove() {
    if (!draft?.id || !confirm(`Supprimer « ${draft.name} » ?`)) return;
    const { error } = await supabase().from("activities").delete().eq("id", draft.id);
    if (error) return toast(errMsg(error));
    setDraft(null);
    load();
  }

  const status = (a: Activity) => {
    const o = outings.filter((x) => x.activity_id === a.id);
    if (o.some((x) => x.status === "faite")) return "✓ faite";
    if (o.some((x) => x.status === "prevue")) return "📅 prévue";
    return null;
  };

  const shown = activities.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Page>
      <PageHeader
        title="Nos activités"
        emoji="🎡"
        right={
          <Button className="!min-h-10 !px-3 !py-2" onClick={() => setDraft({ ...EMPTY })} aria-label="Ajouter">
            ＋
          </Button>
        }
      />
      <Button className="mb-3 w-full" onClick={() => setRoulette(true)}>
        🎡 Lancer la roulette
      </Button>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Rechercher"
        className="mb-3 w-full rounded-2xl border border-line bg-card px-4 py-2.5 outline-none focus:border-rose"
      />
      <p className="mb-3 text-sm text-muted">
        {activities.length} activités · celles déjà faites ne sortent plus à la roulette.
      </p>
      <ul className="flex flex-col gap-2">
        {shown.map((a) => {
          const st = status(a);
          return (
            <li key={a.id}>
              <button
                onClick={() => setDraft({ ...a })}
                className={cx("flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left active:scale-[0.98]", st === "✓ faite" && "opacity-60")}
              >
                <span className="text-3xl">{a.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name}</span>
                  <span className="text-xs text-muted">
                    {seasonLabel(a.months)} · {a.location === "interieur" ? "🏠 intérieur" : "🌳 extérieur"} · {a.budget === "petit" ? "💸 petit" : "💎 gros"}
                  </span>
                </span>
                {st && <span className="shrink-0 rounded-full bg-rose-soft px-2 py-0.5 text-xs text-rose">{st}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={roulette} onClose={() => setRoulette(false)} title="🎡 La roulette">
        {roulette && (
          <ActivityRoulette
            activities={activities}
            outings={outings}
            onPlanned={() => {
              setRoulette(false);
              load();
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Modifier l'activité" : "Nouvelle activité"}>
        {draft && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={draft.emoji}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                className="w-16 shrink-0 rounded-2xl border border-line bg-card px-2 py-3 text-center text-2xl outline-none focus:border-rose"
                aria-label="Emoji"
              />
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nom de l'activité"
                className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-rose"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-medium">
                Saison
                <button
                  className="text-xs text-rose underline"
                  onClick={() => setDraft({ ...draft, months: draft.months.length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })}
                >
                  {draft.months.length === 12 ? "Tout décocher" : "Toute l'année"}
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {MONTHS_SHORT.map((m, i) => {
                  const on = draft.months.includes(i + 1);
                  return (
                    <button
                      key={m}
                      onClick={() =>
                        setDraft({ ...draft, months: on ? draft.months.filter((x) => x !== i + 1) : [...draft.months, i + 1].sort((a, b) => a - b) })
                      }
                      className={cx("rounded-xl py-2 text-xs font-medium", on ? "bg-rose text-white" : "bg-card text-muted")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <Segmented
              value={draft.location}
              onChange={(v) => setDraft({ ...draft, location: v })}
              options={[
                { value: "interieur", label: "🏠 Intérieur" },
                { value: "exterieur", label: "🌳 Extérieur" },
              ]}
            />
            <Segmented
              value={draft.budget}
              onChange={(v) => setDraft({ ...draft, budget: v })}
              options={[
                { value: "petit", label: "💸 Petit budget" },
                { value: "gros", label: "💎 Gros budget" },
              ]}
            />
            <Button onClick={save} disabled={!draft.name.trim() || draft.months.length === 0}>
              Enregistrer
            </Button>
            {draft.id && (
              <Button variant="danger" onClick={remove}>
                Supprimer
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </Page>
  );
}
