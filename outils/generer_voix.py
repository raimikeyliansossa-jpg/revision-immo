#!/usr/bin/env python3
"""
Génère les voix off des vidéos avec ElevenLabs.

Pour chaque vidéo de cards.json, crée un fichier MP3 par étape
(accroche, chaque plan, "À retenir") dans audio/<id>/, et met à jour
audio/voix.json, que l'appli lit pour jouer ces fichiers à la place
de la voix du téléphone.

Utilisation (depuis le dossier du projet) :
    ELEVENLABS_API_KEY=ta_cle python3 outils/generer_voix.py VOICE_ID
    python3 outils/generer_voix.py VOICE_ID --video 101    (une seule vidéo)
    python3 outils/generer_voix.py VOICE_ID --essai "Un texte"   (juste un essai)

Seules les étapes dont le texte a changé sont régénérées : ça économise
les caractères de ton forfait ElevenLabs.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
AUDIO = RACINE / "audio"
MODELE = "eleven_multilingual_v2"

# Prononciation : ce que la voix doit dire à la place de ce qui est écrit
PRONONCIATION = [
    (r"\bBTS PI\b", "B.T.S. P.I."),
    (r"\bCNTGI\b", "C.N.T.G.I."),
    (r"\bDGCCRF\b", "D.G.C.C.R.F."),
    (r"\bRCS\b", "R.C.S."),
    (r"\bRCP\b", "R.C.P."),
    (r"\bCCI\b", "C.C.I."),
    (r"\bTTC\b", "T.T.C."),
    (r"\bHT\b", "hors taxes"),
    (r"\bAG\b", "assemblée générale"),
    (r"\bT3\b", "T trois"),
    (r"\b1er\b", "premier"),
    (r"\bN° ?", "numéro "),
    (r"\bart\. ?", "article "),
    (r"(\d+) ?h\b", r"\1 heures"),
    (r"(\d) ?%", r"\1 pour cent"),
    (r"Bac \+ ?3", "bac plus trois"),
    (r"·", ","),
]


def texte_affiche(narration):
    """Reproduit exactement le texte calculé par video.js (decouper)."""
    mots = [m.replace("*", "") for m in re.split(r"[ \t\n]+", narration or "") if m]
    return " ".join(m for m in mots if m)


def texte_parle(texte):
    for motif, remplacement in PRONONCIATION:
        texte = re.sub(motif, remplacement, texte)
    return texte.replace(" ", " ")


def etapes(carte):
    """Mêmes étapes que video.js : accroche, plans, puis « À retenir »."""
    textes = [carte.get("contenu", "")]
    textes += [p.get("narration", "") for p in carte.get("scenes", [])]
    textes.append("À retenir !")
    return [texte_affiche(t) for t in textes]


def appeler_elevenlabs(texte, voix, cle):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voix}?output_format=mp3_44100_64"
    corps = json.dumps({
        "text": texte,
        "model_id": MODELE,
        "language_code": "fr",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(url, data=corps, method="POST", headers={
        "xi-api-key": cle, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def duree_mp3(chemin):
    sortie = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(chemin)],
        capture_output=True, text=True, check=True).stdout
    return round(float(sortie), 2)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("voix", help="identifiant de la voix ElevenLabs (voice_id)")
    p.add_argument("--video", type=int, help="ne traiter qu'une vidéo (son id)")
    p.add_argument("--essai", help="générer seulement un essai avec ce texte")
    args = p.parse_args()
    cle = os.environ.get("ELEVENLABS_API_KEY", "")
    if not cle:
        sys.exit("Il manque la clé : ELEVENLABS_API_KEY=ta_cle python3 outils/generer_voix.py …")

    if args.essai:
        sortie = Path("essai-voix.mp3")
        sortie.write_bytes(appeler_elevenlabs(texte_parle(args.essai), args.voix, cle))
        print("Essai écrit dans", sortie)
        return

    cartes = json.loads((RACINE / "cards.json").read_text(encoding="utf-8"))
    manifeste_chemin = AUDIO / "voix.json"
    manifeste = json.loads(manifeste_chemin.read_text(encoding="utf-8")) if manifeste_chemin.exists() else {}
    total = 0

    for carte in cartes:
        if carte.get("type") != "video" or (args.video and carte["id"] != args.video):
            continue
        dossier = AUDIO / str(carte["id"])
        dossier.mkdir(parents=True, exist_ok=True)
        anciennes = manifeste.get(str(carte["id"]), [])
        pistes = []
        for i, texte in enumerate(etapes(carte)):
            ancienne = anciennes[i] if i < len(anciennes) else None
            fichier = dossier / f"{i:02d}.mp3"
            if ancienne and ancienne.get("texte") == texte and ancienne.get("voix") == args.voix and fichier.exists():
                pistes.append(ancienne)  # inchangé : on garde
                continue
            parle = texte_parle(texte)
            fichier.write_bytes(appeler_elevenlabs(parle, args.voix, cle))
            total += len(parle)
            pistes.append({"texte": texte, "voix": args.voix,
                           "fichier": f"audio/{carte['id']}/{i:02d}.mp3", "duree": duree_mp3(fichier)})
            print(f"  vidéo {carte['id']} · étape {i:02d} · {pistes[-1]['duree']} s")
        manifeste[str(carte["id"])] = pistes

    manifeste_chemin.write_text(json.dumps(manifeste, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Terminé : {total} caractères envoyés à ElevenLabs.")


if __name__ == "__main__":
    main()
