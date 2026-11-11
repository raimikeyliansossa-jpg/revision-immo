# Révision Immo 📱

Appli web mobile style TikTok pour réviser le BTS Professions Immobilières.
Une carte par écran, on fait défiler pour passer à la suivante.

## Les fichiers

| Fichier      | Rôle                                                        |
|--------------|-------------------------------------------------------------|
| `index.html` | La structure de la page (le « squelette »)                  |
| `style.css`  | L'apparence : couleurs, plein écran, défilement aimanté     |
| `app.js`     | La logique : lit `cards.json` et fabrique les cartes        |
| `video.js`   | Le moteur des vidéos animées (décors, personnages, voix)    |
| `cards.json` | Les cartes de révision (c'est ici qu'on en ajoute)          |
| `manifest.json` + `icone-*.png` | Nom et icône de l'appli pour l'écran d'accueil Android |

## Lancer l'appli sur ton ordinateur

Le navigateur refuse de lire `cards.json` si tu ouvres `index.html` par un double-clic.
Il faut un petit serveur local. Dans un terminal, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000. Pour voir le rendu téléphone dans Chrome :
F12 → icône téléphone → choisir un modèle « Samsung Galaxy ».

## Ajouter une carte

Copie un bloc dans `cards.json`, change l'`id` et le texte. N'oublie pas la virgule entre deux blocs.

```json
{
  "id": 11,
  "type": "quiz",
  "matiere": "copropriete",
  "chapitre": "Assemblée générale",
  "titre": "Titre court",
  "contenu": "La question ou le cas",
  "reponse": "La réponse"
}
```

- `type` : `video`, `notion`, `quiz`, `situation` ou `piege`
- `matiere` : `eco`, `juridique`, `transaction`, `copropriete` ou `gestion-locative`

## Créer une vidéo animée 🎬

Une vidéo est une carte de type `video`, plein écran, façon TikTok « explainer » :
**accroche** (`contenu`) → une suite de **plans courts** (`scenes`) → **À retenir** (`reponse`, un point par ligne, séparés par `\n`).

La voix off lit la `narration` de chaque plan, affichée en sous-titres de 2-3 mots.
Les mots entre `*astérisques*` s'affichent **en jaune** (et sont surlignés dans les documents).

### Les personnages

```json
"personnages": {
  "lea": { "nom": "Léa", "style": "femme", "couleur": "#f97316", "peau": "#f1c27d", "cheveux": "#92400e" }
}
```
`style` : `homme` ou `femme` · `accessoire` (facultatif) : `cravate`, `lunettes`, `badge`, `moustache`

### Les 7 types de plans

| Type | Ce qu'on voit | Champs |
|---|---|---|
| `scene` (par défaut) | Des personnages dans un décor | `decor`, `persos`, `gros_plan`, `objet`, `parle` + `bulle` |
| `document` | Une feuille avec une ligne surlignée et un tampon | `titre`, `lignes`, `tampon` |
| `loi` | Un extrait de texte officiel surligné | `source`, `texte` |
| `etapes` | Une liste numérotée, l'étape en cours en jaune | `titre`, `items`, `actif` (0 = 1re) |
| `chiffre` | Un chiffre clé énorme | `texte`, `sous` |
| `calcul` | Des lignes puis un TOTAL | `titre`, `lignes` : `[["Libellé","Valeur"]]`, `total` |
| `versus` | Deux colonnes face à face (« ne pas confondre ») | `gauche` et `droite` : `{ "titre", "lignes" }` |

Exemples :
```json
{ "decor": "banque",
  "persos": { "lea": { "x": 30, "emotion": "triste" }, "bernard": 70 },
  "gros_plan": "lea",
  "objet": { "emoji": "💶", "texte": "Prêt refusé" },
  "narration": "Si la banque refuse, la vente *tombe*." }

{ "type": "chiffre", "texte": "10 JOURS", "sous": "pour se rétracter",
  "narration": "Léa a *10 jours* pour changer d'avis." }
```

- `decor` : `rue`, `agence`, `banque`, `notaire`, `appartement`, `cci`
- `persos` : position de 0 (gauche) à 100 (droite), ou `{ "x": 40, "emotion": "…" }`
- `emotion` : `neutre`, `content`, `rougit`, `triste`, `pleure`, `surpris`, `fache`
- `gros_plan` : l'identifiant du personnage sur lequel la caméra zoome (le fond devient flou)

**Conseils de rythme :** une seule idée par plan, des narrations de 5 à 12 mots,
alterner personnages et infographies. 12 à 16 plans ≈ 45 à 60 secondes.

**Pendant la vidéo :** tap = pause / reprise · 🔊 = couper / remettre la voix.
Au tout premier lancement, taper ▶ (le téléphone bloque le son tant qu'on n'a pas touché l'écran).

## Quiz, examens et suivi

- **Quiz après chaque vidéo** : sur l'écran « À retenir », bouton 🧠 Quiz. Les questions sont dans le champ `quiz` de la vidéo :
  ```json
  "quiz": [ { "question": "…", "choix": ["A", "B", "C"], "bonne": 1, "explication": "…" } ]
  ```
  (`bonne` = numéro de la bonne réponse, en commençant à 0)
- **Examen de fin de chapitre** : une carte de type `examen` avec des `questions` (mêmes champs + `situation`). Note sur 20.
- **Suivi** (`suivi.js`) : vidéos déjà vues, dernier score au quiz, dernière et meilleure note aux examens.
  C'est enregistré dans la mémoire du navigateur du téléphone : si tu vides les données du navigateur, ça repart de zéro.

## Avancer / reculer dans une vidéo

Tap à **gauche** = plan précédent · tap à **droite** = plan suivant · tap au **milieu** = pause ·
tap sur un **trait** de la barre du bas = aller directement à ce moment.

## Voix naturelle (fichiers audio)

Si le dossier `audio/` contient des fichiers MP3 pour une vidéo (listés dans `audio/voix.json`),
ils remplacent la voix du téléphone. Sinon, c'est la voix du téléphone qui lit.

## Filtrer par matière

Les boutons en haut de l'écran affichent seulement les cartes d'une matière (le chiffre = nombre de cartes).
Le dernier filtre choisi est retenu à la prochaine ouverture.

## Mélanger les cartes

Le bouton 🔀 **Mélanger** (sous les filtres) met les cartes dans un ordre aléatoire.
Il devient jaune quand il est activé. Un nouveau tirage est fait à chaque changement de filtre.
Pour re-mélanger : désactiver puis réactiver. Le choix est retenu à la prochaine ouverture.

## Mettre l'appli en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche `claude/tiktok-bts-revision-app-833uf4`, dossier `/ (root)` → **Save**.
3. Après 1 à 2 minutes, l'appli est sur : https://raimikeyliansossa-jpg.github.io/revision-immo/

⚠️ Avec un compte GitHub gratuit, Pages ne marche que si le dépôt est **public**
(Settings → General → Danger Zone → Change visibility).

Chaque `git push` sur la branche met le site à jour automatiquement.

### Installer sur Samsung

Ouvre l'adresse dans **Samsung Internet** ou **Chrome**, puis :
- Samsung Internet : menu ☰ → **Ajouter la page à** → **Écran d'accueil**
- Chrome : menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'application**)
