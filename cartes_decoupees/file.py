import cv2
import numpy as np
import os
from pathlib import Path

# --- Constantes ---
TARGET_WIDTH = 777
TARGET_HEIGHT = 1405
MIN_CONTOUR_AREA = 1000 # Ignorer les contours très petits (bruit, marques de coupe)

def rogner_et_redimensionner(chemin_image_entree, chemin_image_sortie):
    """
    Charge une image, détecte le plus grand rectangle/contour principal,
    rogne l'image à ce contour, puis la redimensionne à TARGET_WIDTH x TARGET_HEIGHT
    et la sauvegarde.
    """
    try:
        # Charger l'image avec le canal alpha (transparence) s'il existe
        img = cv2.imread(str(chemin_image_entree), cv2.IMREAD_UNCHANGED)

        if img is None:
            print(f"ERREUR: Impossible de charger l'image {chemin_image_entree}")
            return False

        original_height, original_width = img.shape[:2]
        print(f"Image {chemin_image_entree.name}: Dimensions originales = {original_width}x{original_height}")

        # --- Détection du rectangle principal ---
        mask = None
        if img.shape[2] == 4: # Si l'image a un canal alpha
            alpha_channel = img[:, :, 3]
            # On considère que le contenu principal est là où l'alpha n'est pas nul (ou presque)
            _, mask = cv2.threshold(alpha_channel, 5, 255, cv2.THRESH_BINARY)
            print(f"Image {chemin_image_entree.name}: Utilisation du canal alpha pour la détection.")
        else: # Si l'image n'a pas de canal alpha (ex: 3 canaux BGR)
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Essayer de séparer le contenu du fond (supposé blanc ici, comme dans l'exemple)
            # On cherche les pixels qui ne sont PAS blancs (valeur < 250 par ex.)
            _, mask = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV) # Inversé pour avoir le contenu en blanc
            print(f"Image {chemin_image_entree.name}: Pas de canal alpha, seuillage inversé sur niveaux de gris (fond blanc supposé).")

        # Trouver les contours dans le masque binaire
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            print(f"ERREUR: Aucun contour trouvé dans l'image {chemin_image_entree}")
            # Tentative : si aucun contour, peut-être l'image est déjà juste le contenu?
            # On va quand même essayer de la redimensionner directement.
            print(f"AVERTISSEMENT: Aucun contour trouvé, tentative de redimensionnement direct.")
            img_contenu_rogne = img # Utiliser l'image entière
        else:
            # Filtrer les petits contours (potentiellement les marques de coupe ou du bruit)
            grands_contours = [c for c in contours if cv2.contourArea(c) > MIN_CONTOUR_AREA]

            if not grands_contours:
                 print(f"ERREUR: Aucun contour suffisamment grand trouvé (seuil aire = {MIN_CONTOUR_AREA}). Vérifier les contours détectés.")
                 # Sauvegarder le masque pour débogage si besoin
                 # debug_mask_path = chemin_image_sortie.parent / (chemin_image_sortie.stem + "_mask_debug.png")
                 # cv2.imwrite(str(debug_mask_path), mask)
                 # print(f"Masque de débogage sauvegardé : {debug_mask_path}")
                 return False

            # Trouver le contour avec la plus grande aire parmi les grands contours
            plus_grand_contour = max(grands_contours, key=cv2.contourArea)

            # Obtenir le rectangle englobant (bounding box) de ce contour
            x, y, w, h = cv2.boundingRect(plus_grand_contour)

            # Vérifier si le rectangle trouvé a une taille valide
            if w <= 0 or h <= 0:
                 print(f"ERREUR: Rectangle invalide trouvé (largeur={w}, hauteur={h}) dans {chemin_image_entree}")
                 return False

            print(f"Image {chemin_image_entree.name}: Contour principal détecté à x={x}, y={y}, w={w}, h={h}")

            # --- Rognage selon le contour détecté ---
            # Rogner l'image originale (avec toutes ses couleurs et transparence)
            img_contenu_rogne = img[y:y+h, x:x+w]

        # --- Redimensionnement à la taille cible ---
        print(f"Image {chemin_image_entree.name}: Redimensionnement de {img_contenu_rogne.shape[1]}x{img_contenu_rogne.shape[0]} vers {TARGET_WIDTH}x{TARGET_HEIGHT}")

        # Choisir une méthode d'interpolation de qualité (LANCZOS4 est souvent bon)
        img_finale_rognee = cv2.resize(img_contenu_rogne, (TARGET_WIDTH, TARGET_HEIGHT), interpolation=cv2.INTER_LANCZOS4)

        # --- Sauvegarde ---
        chemin_image_sortie.parent.mkdir(parents=True, exist_ok=True)
        # Sauvegarder l'image finale rognée et redimensionnée
        # Spécifier des paramètres de compression PNG (facultatif, mais peut réduire la taille)
        # PNG_COMPRESSION=3 (défaut), va de 0 (pas de compression) à 9 (max compression)
        cv2.imwrite(str(chemin_image_sortie), img_finale_rognee, [cv2.IMWRITE_PNG_COMPRESSION, 3])
        print(f"Image rognée et redimensionnée sauvegardée : {chemin_image_sortie}")
        return True

    except Exception as e:
        print(f"ERREUR critique lors du traitement de {chemin_image_entree}: {e}")
        import traceback
        traceback.print_exc() # Imprime la trace complète de l'erreur
        return False

# --- Configuration ---
# Mettez ici le chemin vers votre dossier contenant les images .png originales
dossier_entree_str = "Recto"  # <--- MODIFIEZ CECI
# Mettez ici le chemin vers le dossier où les images rognées et redimensionnées seront sauvegardées
dossier_sortie_str = "Recto2" # <--- MODIFIEZ CECI

# Convertir les chaînes en objets Path
dossier_entree = Path(dossier_entree_str)
dossier_sortie = Path(dossier_sortie_str)

# Vérifier si le dossier d'entrée existe
if not dossier_entree.is_dir():
    print(f"Erreur : Le dossier d'entrée '{dossier_entree_str}' n'existe pas ou n'est pas un dossier.")
else:
    # Créer le dossier de sortie s'il n'existe pas
    dossier_sortie.mkdir(parents=True, exist_ok=True)

    print(f"Recherche des images .png dans : {dossier_entree}")
    print(f"Les images traitées (rognées et redimensionnées à {TARGET_WIDTH}x{TARGET_HEIGHT}) seront sauvegardées dans : {dossier_sortie}")
    print("-" * 30)

    images_traitees = 0
    images_echouees = 0

    # Parcourir tous les fichiers dans le dossier d'entrée
    for element in dossier_entree.iterdir():
        # Vérifier si c'est un fichier et s'il se termine par .png (insensible à la casse)
        if element.is_file() and element.suffix.lower() == '.png':
            print(f"Traitement de : {element.name}")
            # Construire le chemin complet pour l'image de sortie
            # On garde le même nom de fichier
            chemin_sortie = dossier_sortie / element.name

            # Appeler la fonction de rognage et redimensionnement
            if rogner_et_redimensionner(element, chemin_sortie):
                images_traitees += 1
            else:
                images_echouees += 1
            print("-" * 10) # Séparateur visuel

    print("-" * 30)
    print("Traitement terminé.")
    print(f"Images traitées avec succès : {images_traitees}")
    print(f"Images échouées : {images_echouees}")