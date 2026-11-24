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

  const [testMsg, setTestMsg] = useState<string | null>(null);
  async function testPush() {
    setTestMsg("Envoi…");
    try {
      const { data } = await supabase().auth.getSession();
      const r = await fetch("/api/push/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      }).then((x) => x.json());
      if (!r.vapid) setTestMsg("⚠️ Les clés de notification manquent dans Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY), puis il faut redéployer.");
      else if (!r.subscriptions) setTestMsg("⚠️ Ce téléphone n'est pas abonné. Appuie sur « Activer les notifications » puis réessaie.");
      else if (r.sent > 0) setTestMsg("✅ Envoyée ! Si rien ne s'affiche, autorise les notifications de l'app (ou de Chrome) dans les réglages du téléphone.");
      else setTestMsg(`⚠️ Échec de l'envoi : ${(r.errors || []).join(" · ") || r.error || "erreur inconnue"}. Coupe puis réactive les notifications.`);
    } catch (e) {
      setTestMsg("⚠️ " + errMsg(e));
    }
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
            className="w-24 shrink-0 rounded-2xl border border-line bg-cream px-2 py-3 text-center text-xl outline-none focus:border-rose"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveProfile}
            aria-label="Mon prénom"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
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
        <p className="text-sm text-muted">
          Chaque matin vers 7 h « Prends ton outfit du jour en photo » (si tu ne l&apos;as pas encore posté), le dimanche à 20 h
          « C&apos;est l&apos;heure de notre point 💞 », et quand l&apos;autre poste, réagit ou te recommande un son.
        </p>
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
        {push === "on" && (
          <Button variant="soft" onClick={testPush}>
            📨 M&apos;envoyer une notification de test
          </Button>
        )}
        {testMsg && <p className="rounded-2xl bg-cream p-3 text-sm" data-testid="push-test-msg">{testMsg}</p>}
        <a
          href="/api/rappel"
          className="rounded-2xl border border-line bg-cream p-3 text-center text-sm font-semibold text-rose"
        >
          📅 Ajouter nos 4 rendez-vous à mon agenda
        </a>
        <p className="text-xs text-muted">
          Dimanche 20 h, mercredi 21 h, dernier jour du mois et fin de trimestre 21 h. Le plus fiable : ils s&apos;ajoutent à l&apos;agenda du téléphone (iPhone ou Samsung) et sonnent même si les notifications de l&apos;app ne marchent pas.
        </p>
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
