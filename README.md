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

Une vidéo est une carte de type `video`, avec 2 champs en plus : `personnages` et `scenes`.
Déroulé : **question** (`contenu`) → **scènes** → **À retenir** (`reponse`, une ligne par point, séparées par `\n`).

```json
{
  "id": 13,
  "type": "video",
  "matiere": "copropriete",
  "chapitre": "Assemblée générale",
  "titre": "Titre de la vidéo",
  "contenu": "La question de départ ?",
  "reponse": "Premier point à retenir\nDeuxième point",
  "personnages": {
    "paul": { "nom": "Paul", "role": "copropriétaire", "style": "homme",
              "couleur": "#2563eb", "peau": "#f1c27d", "cheveux": "#3f2a14", "accessoire": "lunettes" }
  },
  "scenes": [
    {
      "decor": "appartement",
      "persos": { "paul": 40 },
      "parle": "paul",
      "bulle": "Ce que dit le personnage",
      "objet": { "emoji": "📄", "texte": "Convocation" },
      "narration": "Ce que dit la voix off (une ou deux phrases courtes)."
    }
  ]
}
```

- `decor` : `rue`, `agence`, `banque`, `notaire` ou `appartement`
- `persos` : qui est sur scène, et où (0 = tout à gauche, 100 = tout à droite). Un personnage qui change de place **marche** jusqu'à sa nouvelle position.
- `style` : `homme` ou `femme` · `accessoire` : `cravate`, `lunettes`, `badge`, `moustache` (facultatif)
- `parle`, `bulle`, `objet` : facultatifs
- Viser 4 à 6 scènes et des narrations de 60 à 80 caractères → une vidéo de 30 à 40 secondes.

**Pendant la vidéo :** tap sur la scène = pause / reprise. 🔊 en haut = couper / remettre la voix.
Au tout premier lancement, il faut taper ▶ (le téléphone bloque le son tant qu'on n'a pas touché l'écran), ensuite les vidéos démarrent toutes seules.

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
