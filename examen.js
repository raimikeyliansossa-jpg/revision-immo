// =============================================================
// Révision Immo — Examen de fin de chapitre
// Une suite de mises en situation, une note sur 20 à la fin,
// enregistrée dans le suivi (suivi.js) pour la retrouver plus tard.
// =============================================================

function mention(note) {
  if (note >= 16) return "Excellent 🔥";
  if (note >= 12) return "Bien joué 💪";
  if (note >= 10) return "C'est juste, à consolider";
  return "À retravailler 📚";
}

function ajouterExamen(section, carte, etiquettes) {
  const questions = carte.questions || [];
  const contenu = creer("div", "examen");
  section.append(contenu);

  // --- Écran d'accueil : ta dernière note ---
  function accueil() {
    contenu.textContent = "";
    const resultat = lireSuivi().examens[carte.id];

    const bloc = creer("div", "examen-accueil");
    bloc.append(
      etiquettes,
      creer("p", "chapitre", carte.chapitre),
      creer("h2", "titre", carte.titre),
      creer("p", "contenu", carte.contenu)
    );

    const etat = creer("div", "examen-etat");
    if (resultat) {
      etat.append(
        creer("p", "examen-etiquette", "Ta dernière note"),
        creer("p", "examen-note", resultat.derniere.note + "/20"),
        creer(
          "p",
          "examen-detail",
          "le " + dateCourte(resultat.derniere.date) + " · meilleure : " + resultat.meilleure.note + "/20 · " +
            resultat.historique.length + " essai" + (resultat.historique.length > 1 ? "s" : "")
        )
      );
    } else {
      etat.append(creer("p", "examen-etiquette", "Pas encore passé"), creer("p", "examen-detail", questions.length + " mises en situation · note sur 20"));
    }

    const go = creer("button", "bouton-quiz", resultat ? "↻ Repasser l'examen" : "📝 Commencer l'examen");
    go.addEventListener("click", () => question(0, 0, []));
    bloc.append(etat, go);
    contenu.append(bloc);
  }

  // --- Une mise en situation ---
  function question(numero, score, erreurs) {
    const q = questions[numero];
    contenu.textContent = "";
    const boite = creer("div", "quiz examen-question");

    // Barre d'avancement
    const barre = creer("div", "examen-barre");
    const plein = creer("i");
    plein.style.width = (numero / questions.length) * 100 + "%";
    barre.append(plein);

    boite.append(barre, creer("p", "quiz-numero", "Situation " + (numero + 1) + " / " + questions.length));
    if (q.situation) boite.append(creer("p", "examen-situation", q.situation));
    boite.append(creer("h3", "quiz-question", q.question));

    const explication = creer("p", "quiz-explication");
    const suivant = creer("button", "bouton-quiz", numero + 1 < questions.length ? "Situation suivante →" : "Voir ma note");
    suivant.hidden = true;
    let nouveauScore = score;

    const choix = q.choix.map((texte, i) => {
      const b = creer("button", "quiz-choix", texte);
      b.addEventListener("click", () => {
        if (!suivant.hidden) return;
        const bon = i === q.bonne;
        if (bon) nouveauScore++;
        else erreurs.push(q);
        b.classList.add(bon ? "bon" : "faux");
        choix[q.bonne].classList.add("bon");
        explication.textContent = (bon ? "✅ " : "❌ ") + (q.explication || "");
        suivant.hidden = false;
      });
      return b;
    });

    suivant.addEventListener("click", () => {
      if (numero + 1 < questions.length) question(numero + 1, nouveauScore, erreurs);
      else resultat(nouveauScore, erreurs);
    });

    boite.append(...choix, explication, suivant);
    contenu.append(boite);
  }

  // --- La note finale ---
  function resultat(score, erreurs) {
    const note = Math.round((score / questions.length) * 20 * 2) / 2; // arrondi au demi-point
    noterExamen(carte.id, note);

    contenu.textContent = "";
    const boite = creer("div", "quiz quiz-score examen-resultat");
    boite.append(
      creer("p", "quiz-numero", carte.titre),
      creer("p", "examen-note", note + "/20"),
      creer("p", "quiz-explication", mention(note) + " · " + score + " bonne" + (score > 1 ? "s" : "") + " réponse" + (score > 1 ? "s" : "") + " sur " + questions.length)
    );

    // Les corrections des erreurs, pour réviser
    if (erreurs.length) {
      const liste = creer("ul", "examen-erreurs");
      erreurs.forEach((q) => {
        const li = creer("li");
        li.append(creer("b", "", q.question), creer("span", "", " → " + q.choix[q.bonne]));
        liste.append(li);
      });
      boite.append(creer("p", "examen-etiquette", "À revoir"), liste);
    }

    const retour = creer("button", "bouton-quiz", "OK");
    retour.addEventListener("click", accueil);
    boite.append(retour);
    contenu.append(boite);
  }

  accueil();
}
