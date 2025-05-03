document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOM Chargé.");

    // --- Éléments du DOM ---
    const timelineCardsElement = document.getElementById('timeline-cards');
    const playerHandElement = document.getElementById('player-hand');
    const deckCountElement = document.getElementById('deck-count');
    const messageElement = document.getElementById('message');
    const instructionElement = document.getElementById('instruction');
    const restartButton = document.getElementById('restart-button');
    const handSizeInputElement = document.getElementById('hand-size-input');
    const gameAreaElement = document.querySelector('.game-area');

    // Modal Elements
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalCardImage = document.getElementById('modal-card-image');
    const modalImageError = document.getElementById('modal-image-error');
    const modalBtnConfirmOui = document.getElementById('modal-btn-confirm-oui');
    const modalBtnConfirmNon = document.getElementById('modal-btn-confirm-non');
    const modalPrevCardImage = document.getElementById('modal-prev-card-image');
    const modalPrevCardId = document.getElementById('modal-prev-card-id');
    const modalNextCardImage = document.getElementById('modal-next-card-image');
    const modalNextCardId = document.getElementById('modal-next-card-id');

    console.log("[Init] Éléments DOM récupérés.");
    if (!confirmationModal) console.error("ERREUR CRITIQUE: #confirmation-modal non trouvé !");

    // --- Configuration ---
    // !!!!!!!!!! IMPORTANT !!!!!!!!!!
    const TOTAL_UNIQUE_CARDS = 50; // <--- METTEZ VOTRE NOMBRE TOTAL RÉEL ICI
    // !!!!!!!!!! IMPORTANT !!!!!!!!!!
    const ID_PADDING = 3;
    const IMAGE_BASE_PATH_RECTO = "cartes_decoupees/Recto/"; // Utiliser /
    const IMAGE_BASE_PATH_VERSO = "cartes_decoupees/Verso/"; // Utiliser /
    const DEFAULT_STARTING_HAND_SIZE = 5;
    const MIN_HAND_SIZE = 1;
    const MAX_HAND_SIZE = 45;
    console.log(`[Config] TOTAL_UNIQUE_CARDS = ${TOTAL_UNIQUE_CARDS}`);

    // --- État du jeu ---
    let gameState = {}; // Initialisé dans startGame

    // --- Fonctions du jeu ---

    function creerJeuCartes(totalCards, idPadding) { /* ... identique ... */
        const cartes = [];
        if (totalCards <= 0) { console.error("TOTAL_UNIQUE_CARDS invalide."); return []; }
        console.log(`[creerJeuCartes] Création de ${totalCards} objets cartes...`);
        for (let i = 1; i <= totalCards; i++) {
            const cardIdFormatted = String(i).padStart(idPadding, '0');
            cartes.push({ id: `Carte_${cardIdFormatted}`, imageRecto: `${IMAGE_BASE_PATH_RECTO}Carte_${cardIdFormatted}_Recto.png`, imageVerso: `${IMAGE_BASE_PATH_VERSO}Carte_${cardIdFormatted}_Verso.png`, isBroken: false });
        }
        console.log(`[creerJeuCartes] -> ${cartes.length} objets cartes créés.`);
        return cartes;
    }

    function shuffleArray(array) { /* ... identique ... */
        console.log("[shuffleArray] Mélange...");
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
        console.log("[shuffleArray] -> Mélangé.");
    }

    function displayMessage(text, type = 'info') { /* ... identique ... */
        console.log(`[displayMessage] Msg: "${text}", Type: ${type}`);
        messageElement.textContent = text;
        messageElement.className = type;
    }

    function updateDeckCount() { /* ... identique ... */
       const count = gameState.pioche ? gameState.pioche.length : 0;
       deckCountElement.textContent = count;
    }

    // createCardElement (Gestion isBroken robuste)
    function createCardElement(cardData, isVerso = false) { /* ... identique ... */
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.id = cardData.id;
        if (cardData.isBroken) {
            cardDiv.classList.add('broken');
            cardDiv.innerHTML = `<span class="broken-card-text">Image<br>Manquante<br>${cardData.id}</span>`;
            return cardDiv;
        }
        const cardImage = document.createElement('img');
        cardImage.classList.add('card-image');
        const imageUrl = isVerso ? cardData.imageVerso : cardData.imageRecto;
        cardImage.src = imageUrl;
        cardImage.alt = `${isVerso ? 'Verso' : 'Recto'}: ${cardData.id}`;
        cardImage.onerror = () => {
            if (!cardData.isBroken) {
                 console.error(`%c[createCardElement] ERREUR Image: ${imageUrl}`, "color:red; font-weight:bold;");
                 cardData.isBroken = true;
                 const targetDiv = document.querySelector(`.card[data-id="${cardData.id}"]`) || cardDiv;
                 if (targetDiv) {
                     targetDiv.classList.add('broken');
                     targetDiv.innerHTML = `<span class="broken-card-text">Image<br>Manquante<br>${cardData.id}</span>`;
                     targetDiv.removeEventListener('click', handleHandSelection);
                 } else { console.warn(`[createCardElement] Div non trouvée pour ${cardData.id} lors erreur img.`); }
            }
        };
        cardDiv.appendChild(cardImage);
        return cardDiv;
    }

    function createSlotElement(index) { /* ... identique ... */
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('placement-slot');
        slotDiv.dataset.index = index;
        return slotDiv;
    }

    // renderTimeline (Gère listeners slots)
    function renderTimeline() { /* ... identique ... */
        timelineCardsElement.innerHTML = '';
        const manageSlotListener = (slotElement) => {
            slotElement.removeEventListener('click', handleSlotSelection);
            const activateSlot = gameState.gamePhase === 'selectSlot' && !gameState.gameOver && gameState.selectedHandCard && !gameState.selectedHandCard.isBroken;
            if (activateSlot) { slotElement.addEventListener('click', handleSlotSelection); }
        };
        const firstSlot = createSlotElement(0);
        timelineCardsElement.appendChild(firstSlot);
        manageSlotListener(firstSlot);
        if (gameState.selectedSlotIndex === 0) firstSlot.classList.add('selected');
        gameState.timeline.forEach((card, index) => {
            const cardElement = createCardElement(card, true);
            timelineCardsElement.appendChild(cardElement);
            const slotElement = createSlotElement(index + 1);
            timelineCardsElement.appendChild(slotElement);
            manageSlotListener(slotElement);
            if (gameState.selectedSlotIndex === index + 1) slotElement.classList.add('selected');
        });
    }

    // renderPlayerHand (Gère listeners cartes)
    function renderPlayerHand() { /* ... identique ... */
        playerHandElement.innerHTML = '';
        gameState.mainJoueur.forEach((card, index) => {
            const cardElement = createCardElement(card, false);
            cardElement.dataset.index = index;
            cardElement.classList.remove('selected', 'revealed');
            cardElement.removeEventListener('click', handleHandSelection);
            if (!gameState.gameOver) {
                if (!card.isBroken && gameState.gamePhase === 'selectHand') {
                    cardElement.addEventListener('click', handleHandSelection);
                }
                if (index === gameState.selectedHandCardIndex) {
                    cardElement.classList.add('selected');
                    if (gameState.gamePhase === 'confirmPlacement') {
                        cardElement.classList.add('revealed');
                    }
                }
            }
            playerHandElement.appendChild(cardElement);
        });
    }

     // updateUIState (Gère classe de phase)
    function updateUIState() { /* ... identique ... */
        const currentPhase = gameState.gamePhase;
        console.log(`[updateUIState] Phase: ${currentPhase}, Game Over: ${gameState.gameOver}`);
        gameAreaElement.className = 'game-area phase-' + currentPhase;
        if (gameState.gameOver) {
            instructionElement.textContent = "Partie terminée.";
            closeConfirmationModal(); // Assure fermeture si fin de partie
        } else {
            switch (currentPhase) {
                case 'selectHand': instructionElement.textContent = "1. Cliquez sur une carte (non cassée) de votre main..."; break;
                case 'selectSlot': instructionElement.textContent = gameState.selectedHandCard ? `2. Cliquez sur un emplacement (+) où insérer "${gameState.selectedHandCard.id}"...` : "Sélectionnez une carte..."; break;
                case 'confirmPlacement': instructionElement.textContent = `3. Vérifiez et confirmez dans le popup...`; break;
                default: instructionElement.textContent = "État inconnu.";
            }
        }
        renderTimeline();
        renderPlayerHand();
        console.log("[updateUIState] Rendu UI terminé.");
    }

    // --- Fonctions du Modal (Inchangé - Gère l'affichage et voisines) ---
    function openConfirmationModal() { /* ... identique ... */
        if (!gameState.selectedHandCard || gameState.selectedHandCard.isBroken) { console.error("[openConfirmationModal] ERREUR: Carte invalide."); return; }
        console.log(`[openConfirmationModal] Ouverture pour: ${gameState.selectedHandCard.id} au slot ${gameState.selectedSlotIndex}`);
        modalImageError.style.display = 'none'; modalBtnConfirmOui.disabled = false; modalBtnConfirmNon.disabled = false;
        modalCardImage.style.display = 'block'; modalCardImage.src = '';
        modalPrevCardImage.src = ''; modalNextCardImage.src = '';
        modalPrevCardImage.style.display = 'none'; modalNextCardImage.style.display = 'none';
        modalPrevCardId.textContent = ''; modalNextCardId.textContent = '';
        modalPrevCardImage.closest('.modal-adjacent-card').classList.add('hidden');
        modalNextCardImage.closest('.modal-adjacent-card').classList.add('hidden');

        const mainCardVersoUrl = gameState.selectedHandCard.imageVerso;
        modalCardImage.alt = `Verso: ${gameState.selectedHandCard.id}`;
        console.log(`[openConfirmationModal] Chargement img principale: ${mainCardVersoUrl}`);
        modalCardImage.src = mainCardVersoUrl;
        modalCardImage.onerror = () => { console.error(`%c[openConfirmationModal] ERREUR Image Principale Modal: ${mainCardVersoUrl}`, "color:red; font-weight:bold;"); modalCardImage.style.display = 'none'; modalImageError.style.display = 'block'; modalBtnConfirmOui.disabled = true; modalBtnConfirmNon.disabled = true; };

        const slotIndex = gameState.selectedSlotIndex; const prevCardIndex = slotIndex - 1; const nextCardIndex = slotIndex;
        if (prevCardIndex >= 0 && prevCardIndex < gameState.timeline.length) {
            const prevCard = gameState.timeline[prevCardIndex]; console.log(`[openConfirmationModal] Voisine gauche: ${prevCard.id}`);
            if (!prevCard.isBroken) { modalPrevCardImage.src = prevCard.imageVerso; modalPrevCardImage.alt = `Verso: ${prevCard.id}`; modalPrevCardId.textContent = prevCard.id; modalPrevCardImage.style.display = 'block'; modalPrevCardImage.closest('.modal-adjacent-card').classList.remove('hidden'); modalPrevCardImage.onerror = () => { console.warn(`[Modal] Err img voisine G: ${prevCard.imageVerso}`); modalPrevCardId.textContent += ' (err)';}} else { modalPrevCardId.textContent = `${prevCard.id} (cassée)`; modalPrevCardImage.closest('.modal-adjacent-card').classList.remove('hidden'); }
        } else { console.log("[openConfirmationModal] Pas de voisine gauche."); }
        if (nextCardIndex >= 0 && nextCardIndex < gameState.timeline.length) {
            const nextCard = gameState.timeline[nextCardIndex]; console.log(`[openConfirmationModal] Voisine droite: ${nextCard.id}`);
            if (!nextCard.isBroken) { modalNextCardImage.src = nextCard.imageVerso; modalNextCardImage.alt = `Verso: ${nextCard.id}`; modalNextCardId.textContent = nextCard.id; modalNextCardImage.style.display = 'block'; modalNextCardImage.closest('.modal-adjacent-card').classList.remove('hidden'); modalNextCardImage.onerror = () => { console.warn(`[Modal] Err img voisine D: ${nextCard.imageVerso}`); modalNextCardId.textContent += ' (err)';}} else { modalNextCardId.textContent = `${nextCard.id} (cassée)`; modalNextCardImage.closest('.modal-adjacent-card').classList.remove('hidden'); }
        } else { console.log("[openConfirmationModal] Pas de voisine droite."); }

        confirmationModal.classList.add('visible'); document.body.classList.add('modal-open');
        console.log("[openConfirmationModal] Modal visible.");
    }
    function closeConfirmationModal() { /* ... identique ... */
        if (confirmationModal.classList.contains('visible')) {
            console.log("[closeConfirmationModal] Fermeture...");
            confirmationModal.classList.remove('visible');
            document.body.classList.remove('modal-open');
        }
    }


    // --- Gestionnaires d'événements ---
    function handleHandSelection(event) { /* ... identique ... */
        console.log("[handleHandSelection] Clic carte main.");
        if (gameState.gameOver || gameState.gamePhase !== 'selectHand') { console.log(" Ignoré (phase/fin)."); return; }
        const index = parseInt(event.currentTarget.dataset.index, 10); const selectedCard = gameState.mainJoueur[index];
        if (!selectedCard) { console.error(" ERREUR: Carte non trouvée index", index); return; }
        if (selectedCard.isBroken) { console.log(" Ignoré (carte cassée)."); displayMessage("Carte inutilisable.", "error"); return; }
        gameState.selectedHandCardIndex = index; gameState.selectedHandCard = selectedCard; gameState.selectedSlotIndex = -1; gameState.gamePhase = 'selectSlot';
        console.log(` -> Phase: selectSlot. Carte: ${selectedCard.id} (idx ${index})`);
        updateUIState(); displayMessage('');
    }

    function handleSlotSelection(event) { /* ... identique ... */
        console.log("[handleSlotSelection] Clic slot.");
        if (gameState.gameOver || gameState.gamePhase !== 'selectSlot' || !gameState.selectedHandCard || gameState.selectedHandCard.isBroken) { console.log(" Ignoré (état invalide).", gameState.gamePhase, gameState.selectedHandCard); return; }
        const index = parseInt(event.currentTarget.dataset.index, 10); gameState.selectedSlotIndex = index; gameState.gamePhase = 'confirmPlacement';
        console.log(` -> Phase: confirmPlacement. Slot index: ${index}`);
        updateUIState(); // Met à jour UI principale (marque 'revealed')
        openConfirmationModal(); // Ouvre le modal
    }

    // handleConfirmation (Appelée par boutons MODAL - MODIFIÉE)
    function handleConfirmation(userConfirmsCorrect) {
        console.log(`[handleConfirmation] Bouton cliqué: Correct = ${userConfirmsCorrect}`);
        // Vérifications robustes
        if (gameState.gameOver || gameState.gamePhase !== 'confirmPlacement' || !gameState.selectedHandCard || gameState.selectedHandCard.isBroken) {
             console.error("[handleConfirmation] ERREUR: État invalide pour confirmation !");
             closeConfirmationModal();
             // Essaye de revenir à un état stable
             gameState.gamePhase = 'selectHand';
             gameState.selectedHandCard = null;
             gameState.selectedHandCardIndex = -1;
             gameState.selectedSlotIndex = -1;
             updateUIState();
             return;
        }

        const cardToProcess = gameState.selectedHandCard; // Copie référence
        const originalHandIndex = gameState.selectedHandCardIndex; // Copie index main
        const targetTimelineIndex = gameState.selectedSlotIndex; // Copie index timeline

        // --- Réinitialise l'état de sélection AVANT la logique jeu ---
        // Cela évite des états incohérents si la logique échoue ou si on reclique vite
        gameState.selectedHandCard = null;
        gameState.selectedHandCardIndex = -1;
        gameState.selectedSlotIndex = -1;
        gameState.gamePhase = 'selectHand'; // On reviendra à selectHand après l'action

        closeConfirmationModal(); // Ferme le modal

        // --- Logique de jeu ---
        if (userConfirmsCorrect) {
            console.log(`[handleConfirmation] Placement CORRECT pour ${cardToProcess.id} à l'index ${targetTimelineIndex}.`);
            // Retire de la main à l'index original
            gameState.mainJoueur.splice(originalHandIndex, 1);
             // Insère dans la timeline à l'index cible
            gameState.timeline.splice(targetTimelineIndex, 0, cardToProcess);
            displayMessage('Correct ! Carte ajoutée.', 'success');
        } else {
            console.log(`[handleConfirmation] Placement INCORRECT pour ${cardToProcess.id}.`);
            // Retire de la main
            const cardIncorrecte = gameState.mainJoueur.splice(originalHandIndex, 1)[0]; // cardIncorrecte est la même que cardToProcess
            console.log(`[handleConfirmation] Carte retirée: ${cardIncorrecte.id}.`);
            // *** CORRECTION: Remet la carte au début de la pioche (sous le paquet) ***
            gameState.pioche.unshift(cardIncorrecte);
            console.log(`[handleConfirmation] -> Carte ${cardIncorrecte.id} remise DANS la pioche (en début d'array). Taille pioche: ${gameState.pioche.length}`);
            // Pioche une nouvelle carte SI possible
            if (gameState.pioche.length > 0) {
                const nouvelleCarte = gameState.pioche.pop();
                gameState.mainJoueur.push(nouvelleCarte);
                console.log(`[handleConfirmation] -> Carte piochée: ${nouvelleCarte.id}. Pioche restante: ${gameState.pioche.length}`);
                displayMessage(`Incorrect. Carte remise dans la pioche. Vous piochez.`, 'error');
            } else {
                console.log("[handleConfirmation] -> Pioche vide, impossible de piocher après erreur.");
                displayMessage(`Incorrect. Carte remise dans la pioche. Pioche vide !`, 'error');
            }
        }

        // --- Mise à jour finale ---
        console.log("[handleConfirmation] Mise à jour UI et vérification fin...");
        updateDeckCount();
        updateUIState(); // Important: Appeler APRES avoir modifié mainJoueur et timeline
        checkEndCondition();
    }

    function checkEndCondition() { /* ... identique ... */
        console.log(`[checkEndCondition] Check: Main=${gameState.mainJoueur.length}, Pioche=${gameState.pioche.length}, Phase=${gameState.gamePhase}, Over=${gameState.gameOver}`);
        if (gameState.gameOver) return;
        if (gameState.mainJoueur.length === 0) { displayMessage("🎉 Félicitations ! Vous avez gagné ! 🎉", 'success'); console.log("##### FIN: Victoire #####"); gameState.gameOver = true; }
        else if (gameState.pioche.length === 0 && gameState.mainJoueur.length > 0 && gameState.gamePhase === 'selectHand') { displayMessage("Pioche vide et cartes en main. Bloqué.", 'info'); console.log("##### FIN: Bloqué #####"); gameState.gameOver = true; }
        if (gameState.gameOver) { updateUIState(); }
    }

    function startGame() { /* ... identique ... */
        console.clear(); console.log("==================================="); console.log("--- Initialisation Nouvelle Partie ---"); console.log("===================================");
        let startingHandSize = DEFAULT_STARTING_HAND_SIZE; const inputValue = handSizeInputElement.value; const parsedValue = parseInt(inputValue, 10);
        if (!isNaN(parsedValue) && parsedValue >= MIN_HAND_SIZE && parsedValue <= MAX_HAND_SIZE) { startingHandSize = parsedValue; } else { console.warn(`Taille main invalide (${inputValue}). Défaut: ${DEFAULT_STARTING_HAND_SIZE}`); handSizeInputElement.value = DEFAULT_STARTING_HAND_SIZE; }
        console.log(`[startGame] Taille main: ${startingHandSize}`);
        gameState = { pioche: creerJeuCartes(TOTAL_UNIQUE_CARDS, ID_PADDING), mainJoueur: [], timeline: [], selectedHandCard: null, selectedHandCardIndex: -1, selectedSlotIndex: -1, gamePhase: 'selectHand', gameOver: false };
        closeConfirmationModal();
        if (gameState.pioche.length === 0) { displayMessage("Erreur: Aucune carte créée.", "error"); gameState.gameOver = true; updateUIState(); return; }
        shuffleArray(gameState.pioche); console.log(`[startGame] Pioche initiale: ${gameState.pioche.length}`);
        const cartesNecessaires = startingHandSize + 1; console.log(`[startGame] Cartes nécessaires: ${cartesNecessaires}`);
        if (gameState.pioche.length < cartesNecessaires) { displayMessage(`ERREUR: Pas assez de cartes (${gameState.pioche.length} / ${cartesNecessaires})! Vérifiez TOTAL_UNIQUE_CARDS.`, "error"); console.error(`[startGame] ERREUR: Manque de cartes.`); gameState.gameOver = true; updateUIState(); return; }
        console.log("[startGame] Distribution...");
        for (let i = 0; i < startingHandSize; i++) { if(gameState.pioche.length > 0) gameState.mainJoueur.push(gameState.pioche.pop()); } console.log(`[startGame] -> Main: ${gameState.mainJoueur.length} cartes`);
        if(gameState.pioche.length > 0) { gameState.timeline.push(gameState.pioche.pop()); console.log(`[startGame] -> Timeline départ: ${gameState.timeline[0].id}`); } else { console.error("[startGame] ERREUR: Pioche vide avant carte timeline !"); displayMessage("Erreur init.", "error"); gameState.gameOver = true; updateUIState(); return; }
        console.log(`[startGame] Pioche restante: ${gameState.pioche.length}`);
        updateDeckCount(); updateUIState(); displayMessage('Bonne chance ! Placez vos cartes.'); console.log("--- Partie prête ! ---");
    }

    // --- Ajout des écouteurs d'événements ---
    console.log("[Init] Ajout des listeners...");
    modalBtnConfirmOui.addEventListener('click', () => handleConfirmation(true));
    modalBtnConfirmNon.addEventListener('click', () => handleConfirmation(false));
    restartButton.addEventListener('click', startGame);
    confirmationModal.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            console.log("[Overlay Click] Fermeture modal + retour selectSlot.");
            closeConfirmationModal();
            if (gameState.gamePhase === 'confirmPlacement') { // Si on annule la confirmation
                gameState.gamePhase = 'selectSlot';
                gameState.selectedSlotIndex = -1; // Important de désélectionner le slot
                updateUIState(); // Met à jour pour refléter l'annulation
            }
        }
    });
    console.log("[Init] Listeners ajoutés.");

    // --- Démarrer le jeu ---
    console.log("[Init] Appel de startGame()...");
    startGame();

}); // Fin du DOMContentLoaded