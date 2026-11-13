"use client";
import { useEffect, useState } from "react";
import { useApp, type ThemePref } from "@/components/Providers";
import { Button, Card, Page, PageHeader, SaveBadge, Segmented } from "@/components/ui";
import { supabase, errMsg } from "@/lib/supabase";
import { currentPushState, disablePush, enablePush, isStandalone } from "@/lib/push";

export default function ReglagesPage() {
  const { me, partner, couple, reload, track, toast, themePref, setThemePref, session } = useApp();
  const [name, setName] = useState(me?.display_name || "");
  const [emoji, setEmoji] = useState(me?.emoji || "");
  const [push, setPush] = useState<"unsupported" | "denied" | "on" | "off" | "…">("…");
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    currentPushState().then(setPush);
    setStandalone(isStandalone());
  }, []);

  async function saveProfile() {
    const { error } = await track(
      Promise.resolve(supabase().from("profiles").update({ display_name: name.trim(), emoji: emoji.trim() }).eq("id", me!.id)),
    );
    if (error) return toast(errMsg(error));
    reload();
  }

  async function togglePush() {
    try {
      if (push === "on") await disablePush();
      else await enablePush();
      setPush(await currentPushState());
      toast(push === "on" ? "Notifications coupées" : "🔔 Notifications activées !");
    } catch (e) {
      toast(errMsg(e));
    }
  }

  return (
    <Page>
      <PageHeader title="Réglages" emoji="⚙️" right={<SaveBadge />} />

      <Card className="mb-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Moi</h2>
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            onBlur={saveProfile}
            aria-label="Mon emoji"
            className="w-24 rounded-2xl border border-line bg-cream px-2 py-3 text-center text-xl outline-none focus:border-rose"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveProfile}
            aria-label="Mon prénom"
            className="flex-1 rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
          />
        </div>
        <p className="text-xs text-muted">
          Chacun règle son propre prénom et emoji. {partner ? `${partner.display_name} ${partner.emoji}` : "Ta moitié"} règle le sien sur son téléphone.
        </p>
      </Card>

      <Card className="mb-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">🌙 Thème</h2>
        <Segmented<ThemePref>
          value={themePref}
          onChange={setThemePref}
          options={[
            { value: "auto", label: "Auto" },
            { value: "clair", label: "☀️ Clair" },
            { value: "sombre", label: "🌙 Sombre" },
          ]}
        />
        <p className="text-xs text-muted">Auto = sombre le dimanche à partir de 18 h (et quand ton téléphone est en mode sombre).</p>
      </Card>

      <Card className="mb-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">🔔 Notifications</h2>
        <p className="text-sm text-muted">Le dimanche à 20 h « C&apos;est l&apos;heure de notre point 💞 », et quand l&apos;autre poste un outfit.</p>
        {push === "unsupported" ? (
          <p className="rounded-2xl bg-peach-soft p-3 text-sm">
            {standalone
              ? "Ce téléphone ne gère pas les notifications web."
              : "📲 Installe d'abord l'app sur l'écran d'accueil (Partager → « Sur l'écran d'accueil »), puis reviens ici."}
          </p>
        ) : push === "denied" ? (
          <p className="rounded-2xl bg-peach-soft p-3 text-sm">Notifications bloquées : autorise-les dans les réglages du téléphone.</p>
        ) : (
          <Button variant={push === "on" ? "soft" : "primary"} onClick={togglePush} disabled={push === "…"}>
            {push === "on" ? "🔕 Couper les notifications" : "🔔 Activer les notifications"}
          </Button>
        )}
      </Card>

      {couple && (
        <Card className="mb-4">
          <h2 className="text-lg font-semibold">💌 Code d&apos;invitation</h2>
          <p className="mt-1 font-display text-3xl font-semibold tracking-[0.3em] text-rose">{couple.invite_code}</p>
          <p className="text-xs text-muted">{partner ? "Votre espace est complet (2/2) 💞" : "À donner à ta moitié pour qu'elle rejoigne l'espace."}</p>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <p className="text-sm text-muted">Connecté·e avec {session?.user.email}</p>
        <Button variant="danger" onClick={() => supabase().auth.signOut()}>
          Se déconnecter
        </Button>
      </Card>
    </Page>
  );
}
