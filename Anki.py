import os
import re # Pour extraire le numéro facilement
import csv # Pour générer le fichier d'import Anki (format TSV)

# --- Configuration ---
dossier_base = "cartes_decoupees"
dossier_recto = os.path.join(dossier_base, "Recto")
dossier_verso = os.path.join(dossier_base, "Verso")
fichier_sortie_anki = "anki_import.txt" # Fichier qui sera généré pour l'import
# --------------------

def trouver_paires_images(dir_recto, dir_verso):
    """
    Trouve les paires d'images Recto/Verso correspondantes dans les dossiers.
    Retourne un dictionnaire où la clé est l'index (str) et la valeur est
    un autre dictionnaire {'recto': nom_fichier, 'verso': nom_fichier}.
    """
    paires = {}
    pattern_recto = re.compile(r"Carte_(\d+)_Recto\.png", re.IGNORECASE) # Ignore la casse (png/PNG)
    pattern_verso = re.compile(r"Carte_(\d+)_Verso\.png", re.IGNORECASE)

    fichiers_recto = {}
    fichiers_verso = {}

    print(f"Recherche des fichiers dans '{dir_recto}'...")
    if not os.path.isdir(dir_recto):
        print(f"ERREUR: Le dossier Recto '{dir_recto}' n'existe pas.")
        return None
    for nom_fichier in os.listdir(dir_recto):
        match = pattern_recto.match(nom_fichier)
        if match:
            index = match.group(1) # Extrait le numéro (ex: "001")
            fichiers_recto[index] = nom_fichier
            # print(f"  Trouvé Recto: {nom_fichier} (Index: {index})") # Debug

    print(f"Recherche des fichiers dans '{dir_verso}'...")
    if not os.path.isdir(dir_verso):
        print(f"ERREUR: Le dossier Verso '{dir_verso}' n'existe pas.")
        return None
    for nom_fichier in os.listdir(dir_verso):
        match = pattern_verso.match(nom_fichier)
        if match:
            index = match.group(1) # Extrait le numéro
            fichiers_verso[index] = nom_fichier
            # print(f"  Trouvé Verso: {nom_fichier} (Index: {index})") # Debug

    print("\nCorrespondance des paires...")
    indices_communs = set(fichiers_recto.keys()) & set(fichiers_verso.keys())

    if not indices_communs:
        print("Aucune paire correspondante trouvée.")
        return {}

    for index in sorted(indices_communs): # Tri par index pour l'ordre
        paires[index] = {
            'recto': fichiers_recto[index],
            'verso': fichiers_verso[index]
        }
        print(f"  Paire trouvée pour index {index}: {paires[index]['recto']} <-> {paires[index]['verso']}")

    # Avertir si des fichiers n'ont pas de correspondance
    indices_recto_seuls = set(fichiers_recto.keys()) - indices_communs
    indices_verso_seuls = set(fichiers_verso.keys()) - indices_communs
    if indices_recto_seuls:
        print("\nAvertissement: Fichiers Recto sans Verso correspondant:")
        for index in sorted(indices_recto_seuls):
            print(f"  - {fichiers_recto[index]}")
    if indices_verso_seuls:
        print("\nAvertissement: Fichiers Verso sans Recto correspondant:")
        for index in sorted(indices_verso_seuls):
            print(f"  - {fichiers_verso[index]}")


    return paires

def creer_fichier_import_anki(paires, nom_fichier_sortie):
    """
    Crée un fichier texte (TSV) pour l'import Anki.
    Chaque ligne contient le champ Recto et le champ Verso séparés par une tabulation.
    Les images sont incluses via des balises HTML <img>.
    """
    if not paires:
        print("Aucune paire à exporter.")
        return False

    lignes_anki = []
    for index in sorted(paires.keys()):
        nom_recto = paires[index]['recto']
        nom_verso = paires[index]['verso']

        # Format HTML pour Anki. Important: utiliser SEULEMENT le nom du fichier.
        # Anki cherchera ces fichiers dans son dossier 'collection.media'.
        champ_recto_html = f'<img src="{nom_recto}">'
        champ_verso_html = f'<img src="{nom_verso}">'

        lignes_anki.append([champ_recto_html, champ_verso_html])

    print(f"\nÉcriture du fichier d'import Anki : '{nom_fichier_sortie}'...")
    try:
        with open(nom_fichier_sortie, 'w', newline='', encoding='utf-8') as f_output:
            # Utiliser csv.writer avec une tabulation comme délimiteur (TSV)
            # C'est souvent plus sûr pour Anki que le CSV standard (virgules)
            writer = csv.writer(f_output, delimiter='\t', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            writer.writerows(lignes_anki)
        print(f"Fichier '{nom_fichier_sortie}' créé avec succès ({len(lignes_anki)} cartes).")
        return True
    except IOError as e:
        print(f"ERREUR lors de l'écriture du fichier '{nom_fichier_sortie}': {e}")
        return False

# --- Exécution principale ---
if __name__ == "__main__":
    print("--- Création de cartes Anki à partir d'images Recto/Verso ---")

    paires_trouvees = trouver_paires_images(dossier_recto, dossier_verso)

    if paires_trouvees is not None: # Vérifie si les dossiers existent
        creer_fichier_import_anki(paires_trouvees, fichier_sortie_anki)

    print("\n--- Terminé ---")