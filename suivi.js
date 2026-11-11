// =============================================================
// Révision Immo — Suivi de ta progression
// Retient, dans la mémoire du téléphone (localStorage) :
//   - les vidéos déjà vues et ton dernier score au quiz ;
//   - tes notes aux examens de fin de chapitre.
// Attention : si tu vides les données de ton navigateur, le suivi
// repart de zéro.
// =============================================================

const CLE_SUIVI = "revision-immo-suivi";

function lireSuivi() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_SUIVI));
    if (brut && typeof brut === "object") {
      return { videos: brut.videos || {}, examens: brut.examens || {} };
    }
  } catch (e) {}
  return { videos: {}, examens: {} };
}

function ecrireSuivi(suivi) {
  try {
    localStorage.setItem(CLE_SUIVI, JSON.stringify(suivi));
  } catch (e) {}
}

// Date du jour au format "11/11"
function dateCourte(iso) {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

// Une vidéo a été regardée jusqu'au bout
function marquerVue(id) {
  const s = lireSuivi();
  s.videos[id] = { ...(s.videos[id] || {}), vue: new Date().toISOString() };
  ecrireSuivi(s);
}

// Score au quiz d'une vidéo
function noterQuiz(id, score, total) {
  const s = lireSuivi();
  s.videos[id] = { ...(s.videos[id] || {}), quiz: { score, total, date: new Date().toISOString() } };
  ecrireSuivi(s);
}

// Note à un examen de chapitre (on garde aussi les 10 dernières)
function noterExamen(id, note) {
  const s = lireSuivi();
  const ancien = s.examens[id] || { historique: [] };
  const essai = { note, date: new Date().toISOString() };
  s.examens[id] = {
    derniere: essai,
    meilleure: !ancien.meilleure || note >= ancien.meilleure.note ? essai : ancien.meilleure,
    historique: [essai, ...(ancien.historique || [])].slice(0, 10),
  };
  ecrireSuivi(s);
}

// Petit texte résumant où tu en es sur une vidéo
function resumeVideo(id) {
  const v = lireSuivi().videos[id];
  if (!v) return "";
  const morceaux = [];
  if (v.vue) morceaux.push("✓ Déjà vue");
  if (v.quiz) morceaux.push("Quiz " + v.quiz.score + "/" + v.quiz.total + " (le " + dateCourte(v.quiz.date) + ")");
  return morceaux.join(" · ");
}
