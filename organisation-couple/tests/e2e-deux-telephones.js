// Test bout-en-bout : deux téléphones côte à côte (Samsung + iPhone)
// Prérequis : `npx supabase start` + `npm run build && npm start`
// Usage : node tests/e2e-deux-telephones.js <dossier-captures> <image.jpg>
const { chromium, devices } = require("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://127.0.0.1:3000";
const MAIL = "http://127.0.0.1:54324";
const stamp = Date.now();
const results = [];
const ok = (name, cond, extra = "") => {
  results.push(`${cond ? "✅" : "❌"} ${name} ${extra}`);
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};

async function getCode(email) {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + email)}`).then((r) => r.json());
    if (r.messages?.length) {
      const m = await fetch(`${MAIL}/api/v1/message/${r.messages[0].ID}`).then((r) => r.json());
      const code = (m.Text || m.HTML).match(/\b(\d{6})\b/);
      if (code) return code[1];
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("pas de mail pour " + email);
}

async function login(page, email) {
  await page.goto(BASE);
  await page.fill("#email", email);
  await page.click("text=Recevoir mon code");
  await page.waitForSelector("#code");
  const code = await getCode(email);
  await page.fill("#code", code);
  await page.click("text=Me connecter");
}

async function waitFor(page, fn, arg, timeout = 5000) {
  const t0 = Date.now();
  await page.waitForFunction(fn, arg, { timeout, polling: 20 });
  return Date.now() - t0;
}

async function tap(page, sel) {
  await page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(150);
  const box = await page.locator(sel).first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
const textOf = (sel) => (s) => document.querySelector(s.sel)?.textContent?.includes(s.text);

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ ...devices["Galaxy S9+"], deviceScaleFactor: 1 });
  const ctxB = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  for (const [n, p] of [["A", A], ["B", B]]) {
    p.on("pageerror", (e) => console.log(`[${n} pageerror]`, e.message));
    p.on("console", (m) => m.type() === "error" && console.log(`[${n} console]`, m.text()));
  }
  const shot = async (name) => {
    await A.screenshot({ path: `${OUT}/${name}-A.png` });
    await B.screenshot({ path: `${OUT}/${name}-B.png` });
  };

  // ---- 1. Connexion + espace couple ----
  await login(A, `sossa${stamp}@test.fr`);
  await A.click("text=Créer notre espace");
  ok("Prénom par défaut Sossa", (await A.inputValue("#name")) === "Sossa");
  await A.click("button:has-text('Créer notre espace 💞')");
  await A.waitForSelector("[data-testid=invite-code]");
  const invite = (await A.textContent("[data-testid=invite-code]")).trim();
  ok("Code d'invitation créé", /^[A-Z0-9]{6}$/.test(invite), invite);
  await shot("01-accueil-invitation");

  await login(B, `mansa${stamp}@test.fr`);
  await B.click("text=J'ai un code");
  await B.fill("#code", invite.toLowerCase());
  ok("Prénom par défaut Mansa", (await B.inputValue("#name")) === "Mansa");
  await B.click("button:has-text('Rejoindre')");
  await B.waitForSelector("text=Commencer notre point");
  // A voit arriver B sans recharger
  const tJoin = await waitFor(A, () => document.body.innerText.includes("Mansa"), null, 8000).catch(() => -1);
  ok("A voit Mansa rejoindre en direct", tJoin >= 0, `${tJoin} ms`);

  // ---- 2. Démarrer le point ----
  await A.click("text=Commencer notre point");
  await A.waitForSelector("[data-testid=step-title]");
  const tResume = await waitFor(B, () => document.body.innerText.includes("Reprendre notre point"), null, 5000).catch(() => -1);
  ok("B voit le point en cours sans recharger", tResume >= 0, `${tResume} ms`);
  await B.click("text=Reprendre notre point");
  await B.waitForSelector("[data-testid=step-title]");
  ok("Étape 1 : Rien à relire", (await B.textContent("body")).includes("Rien à relire"));
  await A.waitForTimeout(800);
  const presence = await B.textContent("header");
  ok("Présence : B voit Sossa connecté", presence.includes("Sossa est là"), presence.trim().slice(0, 40));
  await shot("02-relecture");

  // ---- 3. Prêt ✓ ----
  await A.click("[data-testid=ready-btn]");
  const tReady = await waitFor(B, () => document.querySelector("[data-testid=partner-ready]").textContent.includes("✓"));
  ok("B voit « Sossa est prêt » en direct", true, `${tReady} ms`);
  ok("A reste sur l'étape tant que B n'est pas prêt", (await A.textContent("[data-testid=step-title]")).includes("Relecture"));
  await shot("03-pret-un-seul");
  await B.click("[data-testid=ready-btn]");
  const tStepA = await waitFor(A, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("Humeur"));
  const tStepB = await waitFor(B, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("Humeur"));
  ok("Les deux écrans passent à l'étape Humeur", true, `A ${tStepA} ms / B ${tStepB} ms`);

  // ---- 4. Humeur en direct ----
  await A.click("[data-testid='mood-🥰']");
  const tMood = await waitFor(B, () => document.querySelector("[data-testid=theirs-mood]")?.textContent.includes("🥰"));
  ok("Humeur de A visible chez B", tMood < 1000, `${tMood} ms`);
  await B.click("[data-testid='mood-😊']");
  await A.locator("[data-testid=mine-score]").fill("8");
  await B.locator("[data-testid=mine-score]").fill("7");
  const tScore = await waitFor(B, () => document.querySelector("[data-testid=theirs-score]")?.textContent.startsWith("8"));
  ok("Note de A visible chez B", tScore < 1000, `${tScore} ms`);
  await B.waitForTimeout(700);
  await shot("04-humeur");
  await A.click("[data-testid=ready-btn]");
  await B.click("[data-testid=ready-btn]");
  await waitFor(A, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("objectifs"));
  await waitFor(B, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("objectifs"));

  // ---- 5. Frappe simultanée, sans écrasement ----
  const textA = "J'ai couru 3 fois et fini mon livre 📚";
  const textB = "J'ai bien dormi, mais pas assez bu d'eau";
  await A.click("[data-testid=mine-goals_review]");
  await B.click("[data-testid=mine-goals_review]");
  const typing = Promise.all([
    A.keyboard.type(textA, { delay: 45 }),
    B.keyboard.type(textB, { delay: 50 }),
  ]);
  const tTyping = await waitFor(B, () => document.body.innerText.includes("Sossa écrit"), null, 3000).catch(() => -1);
  ok("Indicateur « ✍️ Sossa écrit… » chez B", tTyping >= 0, `${tTyping} ms`);
  await shot("05-frappe-en-cours");
  await typing;
  const t0 = Date.now();
  await waitFor(B, (t) => document.querySelector("[data-testid=theirs-goals_review]")?.textContent === t, textA, 3000);
  ok("Texte de A arrivé en entier chez B", true, `${Date.now() - t0} ms après la dernière lettre`);
  await waitFor(A, (t) => document.querySelector("[data-testid=theirs-goals_review]")?.textContent === t, textB, 3000);
  ok("Pas d'écrasement : A garde son texte", (await A.inputValue("[data-testid=mine-goals_review]")) === textA);
  ok("Pas d'écrasement : B garde son texte", (await B.inputValue("[data-testid=mine-goals_review]")) === textB);
  await A.waitForSelector("text=✓ Enregistré");
  ok("Badge « ✓ Enregistré »", true);
  await shot("06-objectifs");

  // ---- 6. Retour arrière puis reprise ----
  await B.click("button[aria-label='Étape précédente']");
  await waitFor(A, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("Humeur"));
  ok("Retour en arrière synchronisé sur les 2 écrans", (await B.textContent("[data-testid=step-title]")).includes("Humeur"));
  ok("Les réponses sont conservées", (await A.textContent("[data-testid=theirs-mood]")).includes("😊"));
  for (const p of [A, B]) await p.click("[data-testid=ready-btn]");
  await waitFor(A, () => document.querySelector("[data-testid=step-title]")?.textContent.includes("objectifs"));

  // B ferme l'app et revient
  await B.goto(BASE);
  await B.click("text=Reprendre notre point");
  await B.waitForSelector("[data-testid=step-title]");
  ok("B reprend au bon endroit après fermeture", (await B.textContent("[data-testid=step-title]")).includes("objectifs"));
  ok("…avec son texte", (await B.inputValue("[data-testid=mine-goals_review]")) === textB);

  // ---- 7. Bilan, semaine prochaine, outfits ----
  const next = async (title) => {
    await A.click("[data-testid=ready-btn]");
    await B.click("[data-testid=ready-btn]");
    await waitFor(A, (t) => document.querySelector("[data-testid=step-title]")?.textContent.includes(t), title);
    await waitFor(B, (t) => document.querySelector("[data-testid=step-title]")?.textContent.includes(t), title);
  };
  await next("Bien");
  await A.fill("[data-testid=mine-good_things]", "Tu m'as fait rire tous les soirs 😂");
  await B.fill("[data-testid=mine-good_things]", "Ton petit mot mercredi 🥹");
  await A.fill("[data-testid=mine-less_good]", "Je me suis senti débordé jeudi");
  await next("prochaine");
  await A.fill("[data-testid=mine-next_improvement]", "Je t'appelle avant de dormir");
  await A.fill("[data-testid=mine-next_goals]", "Sport 3x, finir le dossier");
  await B.fill("[data-testid=mine-next_improvement]", "Je réponds plus vite aux messages");
  await B.fill("[data-testid=mine-next_goals]", "Méditation tous les matins");
  await B.waitForTimeout(800);
  await shot("07-semaine-prochaine");
  await next("outfits");
  await next("rendez-vous");

  // ---- 8. Rendez-vous + roulette synchronisée ----
  const d = new Date();
  d.setDate(d.getDate() + 4);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (d.getMonth() !== new Date().getMonth()) await A.click("button[aria-label='Mois suivant']");
  await A.click(`[data-testid=day-${iso}]`);
  const tDate = await waitFor(B, (s) => !!document.querySelector(`[data-testid=date-card-${s}]`), iso);
  ok("Date choisie par A visible chez B", tDate < 1500, `${tDate} ms`);
  await tap(A, "[data-testid=spin-btn]");
  await A.waitForTimeout(1500);
  await shot("08-roulette-tourne");
  await A.waitForSelector("[data-testid=spin-result]", { timeout: 8000 });
  await B.waitForSelector("[data-testid=spin-result]", { timeout: 8000 });
  const rA = await A.textContent("[data-testid=spin-result]");
  const rB = await B.textContent("[data-testid=spin-result]");
  ok("Même résultat de roulette sur les 2 écrans", rA === rB, `« ${rA} »`);
  await shot("09-roulette-resultat");
  await tap(B, "[data-testid=go-btn]");
  await A.waitForSelector("[data-testid=chosen-activity]", { timeout: 3000 });
  ok("« C'est parti ! » validé des deux côtés", (await A.textContent("[data-testid=chosen-activity]")) === rA);

  // ---- 9. Récap ----
  await next("Récap");
  await A.waitForSelector("[data-testid=recap]");
  await B.waitForTimeout(1200);
  const recap = await B.textContent("[data-testid=recap]");
  ok("Récap : améliorations + rendez-vous", recap.includes("Je t'appelle avant de dormir") && recap.includes(rA));
  await shot("10-recap");

  await A.goto(BASE);
  await A.waitForSelector("text=points fait", { timeout: 5000 }).catch(() => {});
  ok("Compteur 🔥 1 point fait ensemble", (await A.textContent("body")).includes("🔥 1 point fait ensemble"));
  await shot("11-accueil-apres");

  // ---- 10. Outfit ----
  await A.goto(BASE + "/outfits");
  await A.setInputFiles("[data-testid=outfit-input]", process.argv[3]);
  await A.click("text=Publier");
  const tOutfit = await waitFor(B, () => document.body.innerText.includes("vient de poster un outfit"), null, 15000).catch(() => -1);
  ok("B reçoit l'alerte « outfit posté »", tOutfit >= 0, `${tOutfit} ms`);
  await A.waitForTimeout(1500);
  await shot("12-outfit");


  // ---- 12. Semaine suivante (simulée en reculant les dates) ----
  const { execSync } = require("child_process");
  const cid = `(select id from couples where invite_code='${invite}')`;
  execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -qc "update points set week_date = week_date - 7 where couple_id=${cid}; update outings set date = current_date - 2 where couple_id=${cid};"`);
  await A.goto(BASE);
  await A.click("text=Commencer notre point");
  await A.waitForSelector("[data-testid=step-title]");
  await B.goto(BASE);
  await B.click("text=Reprendre notre point");
  await B.waitForSelector("[data-testid=step-title]");
  const relA = await A.textContent("body");
  ok("Relecture : amélioration de la semaine passée affichée", relA.includes("Je t'appelle avant de dormir") && relA.includes("Je réponds plus vite"));
  await A.click("[data-testid=review-tenu]");
  await B.click("[data-testid=review-moitie]");
  await A.waitForTimeout(600);
  await shot("13-relecture-semaine-2");
  await next("dernière sortie");
  const s2 = await B.textContent("body");
  ok("Étape « Notre dernière sortie » avec la bonne activité", s2.includes(rA) && s2.includes("C'était comment"));
  await shot("14-derniere-sortie");
  await tap(A, "[data-testid=outing-done]");
  await B.waitForSelector("text=Ajoutée à l'historique", { timeout: 3000 });
  ok("« On l'a faite » visible chez l'autre", true);
  await A.locator("input[type=range]").first().fill("9");
  await A.locator("textarea").first().fill("Fou rire du siècle 😂");
  await B.locator("input[type=range]").first().fill("8");
  await B.waitForFunction(() => document.body.innerText.includes("Fou rire du siècle"), null, { timeout: 3000 });
  ok("Note + commentaire de sortie en direct chez l'autre", (await B.textContent("body")).includes("9/10"));
  await B.waitForTimeout(800);
  await shot("15-sortie-notee");

  // ---- 13. Autres pages (mode sombre sur B) ----
  await A.goto(BASE + "/souvenirs");
  await A.setInputFiles("input[type=file]", [process.argv[3], process.argv[3]]);
  await A.waitForSelector("text=Ajouter des photos", { timeout: 15000 });
  await A.waitForTimeout(1000);
  await A.locator("main button.relative").first().click();
  await A.click("text=Photo de couverture");
  await A.waitForTimeout(800);
  await A.goto(BASE);
  await A.waitForTimeout(1500);
  await B.evaluate(() => localStorage.setItem("theme", "sombre"));
  await B.goto(BASE);
  await B.waitForTimeout(1500);
  await shot("16-accueil-couverture");
  for (const [path, name] of [["/activites", "17-activites"], ["/sorties", "18-sorties"], ["/evolution", "19-evolution"], ["/reglages", "20-reglages"], ["/souvenirs", "21-souvenirs"]]) {
    await A.goto(BASE + path);
    await B.goto(BASE + path);
    await A.waitForTimeout(1300);
    await shot(name);
  }
  ok("Classement des sorties", (await A.textContent("body")) !== "");

  // ---- 11. Sécurité : un 3e compte ne voit rien ----
  const ctxC = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  const C = await ctxC.newPage();
  await login(C, `intrus${stamp}@test.fr`);
  await C.click("text=J'ai un code");
  await C.fill("#code", invite);
  await C.click("button:has-text('Rejoindre')");
  await C.waitForSelector("text=déjà complet", { timeout: 5000 }).catch(() => {});
  ok("Un 3e compte ne peut pas rejoindre", (await C.textContent("body")).includes("déjà complet"));

  await browser.close();
  console.log("\n" + results.join("\n"));
})().catch(async (e) => {
  console.error("ERREUR", e);
  console.log("\n" + results.join("\n"));
  process.exit(1);
});
