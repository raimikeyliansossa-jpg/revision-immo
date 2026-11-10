// =============================================================
// Révision Immo — V1
// Rôle de ce fichier : lire cards.json et fabriquer une carte
// plein écran pour chaque élément.
// =============================================================

// Noms lisibles pour l'affichage (la clé = ce qui est écrit dans cards.json)
const NOMS_TYPES = {
  notion: "📘 Notion",
  quiz: "❓ Quiz",
  situation: "💼 Situation",
  piege: "⚠️ Piège",
};

const NOMS_MATIERES = {
  eco: "Économie",
  juridique: "Juridique",
  transaction: "Transaction",
  copropriete: "Copropriété",
  "gestion-locative": "Gestion locative",
};

// Texte du bouton selon le type de carte
const TEXTE_BOUTON = {
  quiz: "👆 Tap pour voir la réponse",
  situation: "👆 Tap pour voir la solution",
  piege: "👆 Tap pour voir le piège",
};

// On récupère les éléments HTML dont on a besoin
const fil = document.getElementById("fil");
const compteur = document.getElementById("compteur");

// -------------------------------------------------------------
// Petite fonction utilitaire : crée un élément HTML avec une
// classe et un texte. On utilise textContent (et pas innerHTML)
// pour que le texte des cartes soit toujours affiché tel quel.
// -------------------------------------------------------------
function creer(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte) el.textContent = texte;
  return el;
}

// -------------------------------------------------------------
// Fabrique UNE carte (une <section>) à partir d'un objet du JSON
// -------------------------------------------------------------
function creerCarte(carte) {
  // La classe du type (ex: "quiz") sert à choisir la couleur dans le CSS
  const section = creer("section", "carte " + carte.type);

  // Étiquettes : type + matière
  const etiquettes = creer("div", "etiquettes");
  etiquettes.append(
    creer("span", "etiquette type", NOMS_TYPES[carte.type] || carte.type),
    creer("span", "etiquette", NOMS_MATIERES[carte.matiere] || carte.matiere)
  );

  section.append(
    etiquettes,
    creer("p", "chapitre", carte.chapitre),
    creer("h2", "titre", carte.titre),
    creer("p", "contenu", carte.contenu)
  );

  if (carte.type === "notion") {
    // Une notion se lit directement : la réponse est visible tout de suite
    section.append(creer("p", "reponse", "💡 " + carte.reponse));
  } else {
    // Les autres types : bouton + réponse cachée
    const bouton = creer("button", "bouton-reveler", TEXTE_BOUTON[carte.type]);
    const reponse = creer("p", "reponse cachee", carte.reponse);

    // Au tap, on ajoute la classe "revelee" : le CSS fait le reste
    bouton.addEventListener("click", () => {
      section.classList.add("revelee");
    });

    section.append(bouton, reponse);
  }

  return section;
}

// -------------------------------------------------------------
// Met à jour le compteur "3 / 10" selon la carte visible.
// IntersectionObserver = le navigateur nous prévient quand
// une carte occupe la majorité de l'écran.
// -------------------------------------------------------------
function suivreCarteVisible(sections) {
  const total = sections.length;

  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          const numero = sections.indexOf(entree.target) + 1;
          compteur.textContent = numero + " / " + total;
        }
      });
    },
    { root: fil, threshold: 0.6 } // "visible" = au moins 60 % à l'écran
  );

  sections.forEach((s) => observateur.observe(s));
}

// -------------------------------------------------------------
// Point de départ : on charge cards.json puis on affiche tout
// -------------------------------------------------------------
async function demarrer() {
  try {
    const reponse = await fetch("cards.json");
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    const cartes = await reponse.json();

    fil.innerHTML = ""; // on enlève "Chargement…"

    const sections = cartes.map(creerCarte);
    sections.forEach((s) => fil.append(s));

    // Indice "swipe" uniquement sur la première carte
    if (sections[0]) {
      sections[0].append(creer("div", "indice-swipe", "⬆️ Swipe vers le haut pour continuer"));
    }

    suivreCarteVisible(sections);
  } catch (erreur) {
    console.error(erreur);
    fil.innerHTML = "";
    fil.append(
      creer(
        "p",
        "chargement",
        "Impossible de charger cards.json. Ouvre l'appli via un petit serveur local (voir README), pas en double-cliquant sur le fichier."
      )
    );
  }
}

demarrer();
