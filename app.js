// App State Configuration
const CONFIG = {
    storageKey: 'scoreboard_arena_scores',
    colorPresets: {
        blue: '#00f0ff',
        red: '#ff4b5c',
        green: '#00ff66',
        yellow: '#ffd600',
        purple: '#d600ff',
        orange: '#ff7b00'
    }
};

let state = {
    scores: {
        "1": [],
        "2": [],
        "3": [],
        "4": []
    },
    activeGame: "1",
    selectedColor: "#00f0ff",
    selectedColorName: "น้ำเงิน", // Thai color name for Sheet
    editId: null,
    sheetsUrl: "",
    activeSuggestionIndex: -1,
    activeCategory: null,
    match: {
        teamA: '#00f0ff',
        teamB: '#ff4b5c',
        winner: 'A', // 'A' or 'B'
        weightA: '',
        weightB: ''
    },
    pole: {
        teamA: '#00f0ff',
        teamB: '#ff4b5c',
        winner: 'A'
    },
    activeMatchId: null
};

let clearMode = 'active_game'; // 'active_game' or 'all_games'

// DOM Elements
const DOM = {
    body: document.body,
    appContainer: document.getElementById('app-container'),
    portalContainer: document.getElementById('portal-container'),
    portalCards: document.querySelectorAll('.portal-card'),
    backPortalBtn: document.getElementById('back-portal-btn'),
    headerCategoryName: document.getElementById('header-category-name'),
    tabGame1: document.getElementById('tab-game-1'),
    tabGame2: document.getElementById('tab-game-2'),
    tabGame3: document.getElementById('tab-game-3'),
    tabGame4: document.getElementById('tab-game-4'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    clearAllDataBtn: document.getElementById('clear-all-data-btn'),
    
    // Stats
    statTotalPlayers: document.getElementById('stat-total-players'),
    statHighScore: document.getElementById('stat-high-score'),
    
    // Form
    scoreForm: document.getElementById('score-form'),
    formPanelSubtitle: document.getElementById('form-panel-subtitle'),
    editIdInput: document.getElementById('edit-id'),
    playerNameInput: document.getElementById('player-name'),
    playerScoreInput: document.getElementById('player-score'),
    scoreInputGroup: document.getElementById('score-input-group'),
    objectsHitGroup: document.getElementById('objects-hit-group'),
    colorNameBtns: document.querySelectorAll('#standard-form-fields .color-name-btn'),
    submitBtn: document.getElementById('submit-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    
    // Score Adjusters
    scoreMinus5: document.getElementById('score-minus-5'),
    scoreMinus1: document.getElementById('score-minus-1'),
    scorePlus1: document.getElementById('score-plus-1'),
    scorePlus5: document.getElementById('score-plus-5'),
    
    // Leaderboard
    searchInput: document.getElementById('search-input'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    clearDataBtn: document.getElementById('clear-data-btn'),
    leaderboardList: document.getElementById('leaderboard-list'),
    
    // Chart
    chartSection: document.getElementById('chart-section'),
    chartBarsList: document.getElementById('chart-bars-list'),
    
    // Dialog
    confirmDialog: document.getElementById('confirm-dialog'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogDesc: document.getElementById('dialog-desc'),
    dialogCancelBtn: document.getElementById('dialog-cancel-btn'),
    dialogConfirmBtn: document.getElementById('dialog-confirm-btn'),
    
    // Sheets Connection & Modal
    sheetsConfigBtn: document.getElementById('sheets-config-btn'),
    syncStatusText: document.getElementById('sync-status-text'),
    sheetsModal: document.getElementById('sheets-modal'),
    sheetsModalClose: document.getElementById('sheets-modal-close'),
    sheetsModalCancel: document.getElementById('sheets-modal-cancel'),
    sheetsSaveBtn: document.getElementById('sheets-save-btn'),
    sheetsUrlInput: document.getElementById('sheets-webapp-url'),
    toastContainer: document.getElementById('toast-container'),
    mainDashboard: document.getElementById('main-dashboard'),
    tabGameSummary: document.getElementById('tab-game-summary'),
    summaryPanel: document.getElementById('summary-panel'),
    presentationBtn: document.getElementById('presentation-btn'),
    summaryChartContainer: document.getElementById('summary-chart-container')
};

// Initialize Application
function init() {
    setupEventListeners();
    updateSheetsConnectionUI();
    document.documentElement.style.setProperty('--selected-color-accent', state.selectedColor);
    showPortal();
}

// Load from LocalStorage
function loadData() {
    if (!state.activeCategory) return;
    const key = `${CONFIG.storageKey}_${state.activeCategory}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            state.scores = JSON.parse(saved);
            if (!state.scores || typeof state.scores !== 'object') {
                resetScoresObject();
            }
            // Verify structure has all games and sanitize old/malformed records
            for (let i = 1; i <= 4; i++) {
                if (!state.scores[i] || !Array.isArray(state.scores[i])) {
                    state.scores[i] = [];
                } else {
                    const gNum = i.toString();
                    const gName = getActiveGameName(gNum);
                    if (gName === 'Fishing') {
                        state.scores[i] = state.scores[i].filter(item => item && item.isFishing);
                    } else if (checkIfPickPlace4Way(gNum, state.activeCategory)) {
                        state.scores[i] = state.scores[i].filter(item => item && item.isPP4Way);
                    } else if (checkIfPoleGame(gNum, state.activeCategory)) {
                        state.scores[i] = state.scores[i].filter(item => item && item.isPole);
                    } else if (checkIfMatchupGame(gNum, state.activeCategory)) {
                        state.scores[i] = state.scores[i].filter(item => item && item.teamA && !item.isPole);
                    } else {
                        state.scores[i] = state.scores[i].filter(item => item && item.name);
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing stored scores, initializing empty state', e);
            resetScoresObject();
        }
    } else {
        resetScoresObject();
    }
    
    // Load Sheets integration URL (global)
    state.sheetsUrl = localStorage.getItem('scoreboard_sheets_url') || "";
}

function resetScoresObject() {
    state.scores = { "1": [], "2": [], "3": [], "4": [] };
}

// Save to LocalStorage
function saveData() {
    if (!state.activeCategory) return;
    const key = `${CONFIG.storageKey}_${state.activeCategory}`;
    localStorage.setItem(key, JSON.stringify(state.scores));
}

// Update Google Sheets Status in header
function updateSheetsConnectionUI() {
    if (state.sheetsUrl) {
        DOM.sheetsConfigBtn.classList.add('connected');
        DOM.syncStatusText.textContent = 'เชื่อมต่อแล้ว';
        DOM.sheetsUrlInput.value = state.sheetsUrl;
    } else {
        DOM.sheetsConfigBtn.classList.remove('connected');
        DOM.syncStatusText.textContent = 'เชื่อมต่อ Sheet';
        DOM.sheetsUrlInput.value = '';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab Switching
    DOM.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const gameNum = btn.getAttribute('data-game');
            setActiveGame(gameNum);
        });
    });

    // Named Color Button Selection
    DOM.colorNameBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.colorNameBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const hex = btn.getAttribute('data-hex');
            state.selectedColor = hex;
            state.selectedColorName = btn.textContent.trim(); // e.g. "น้ำเงิน"
            document.documentElement.style.setProperty('--selected-color-accent', hex);
            
            updatePlayerNameDropdown();
        });
    });

    // Score adjustments
    DOM.scoreMinus5.addEventListener('click', () => adjustScoreInput(-5));
    DOM.scoreMinus1.addEventListener('click', () => adjustScoreInput(-1));
    DOM.scorePlus1.addEventListener('click', () => adjustScoreInput(1));
    DOM.scorePlus5.addEventListener('click', () => adjustScoreInput(5));

    // Form Submit
    DOM.scoreForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit();
    });

    // Cancel Edit
    DOM.cancelEditBtn.addEventListener('click', () => {
        exitEditMode();
    });

    // Real-time Search
    DOM.searchInput.addEventListener('input', () => {
        renderLeaderboard();
    });

    // No dropdown suggestions logic needed since we use select dropdown.

    // Export CSV
    DOM.exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // Clear Scores (Modal Triggers)
    DOM.clearDataBtn.addEventListener('click', () => {
        clearMode = 'active_game';
        DOM.dialogTitle.textContent = 'ล้างคะแนนเกมนี้?';
        DOM.dialogDesc.textContent = `คุณแน่ใจหรือไม่ว่าต้องการล้างคะแนนของผู้เล่นทั้งหมดใน ${getActiveGameName(state.activeGame)}? ข้อมูลนี้ไม่สามารถกู้คืนได้`;
        DOM.confirmDialog.classList.add('open');
    });

    DOM.clearAllDataBtn.addEventListener('click', () => {
        clearMode = 'all_games';
        DOM.dialogTitle.textContent = 'ล้างคะแนนทั้งหมดทุกเกม?';
        DOM.dialogDesc.textContent = 'คุณแน่ใจหรือไม่ว่าต้องการล้างคะแนนของผู้เล่นในทุกเกม (Game 1 - 4)? ข้อมูลนี้ไม่สามารถกู้คืนได้';
        DOM.confirmDialog.classList.add('open');
    });

    DOM.dialogCancelBtn.addEventListener('click', () => {
        DOM.confirmDialog.classList.remove('open');
    });

    DOM.dialogConfirmBtn.addEventListener('click', () => {
        if (clearMode === 'active_game') {
            clearActiveGameScores();
        } else if (clearMode === 'all_games') {
            clearAllGamesScores();
        }
        DOM.confirmDialog.classList.remove('open');
    });

    // Google Sheets Config Modal Triggers
    DOM.sheetsConfigBtn.addEventListener('click', () => {
        DOM.sheetsModal.classList.add('open');
    });

    DOM.sheetsModalClose.addEventListener('click', () => {
        DOM.sheetsModal.classList.remove('open');
    });

    DOM.sheetsModalCancel.addEventListener('click', () => {
        DOM.sheetsModal.classList.remove('open');
    });

    DOM.sheetsSaveBtn.addEventListener('click', () => {
        const url = DOM.sheetsUrlInput.value.trim();
        if (url === "") {
            state.sheetsUrl = "";
            localStorage.removeItem('scoreboard_sheets_url');
            showToast("ยกเลิกการเชื่อมต่อ Google Sheets", "info");
        } else if (url.startsWith('https://script.google.com/')) {
            state.sheetsUrl = url;
            localStorage.setItem('scoreboard_sheets_url', url);
            showToast("เชื่อมต่อ Google Sheets สำเร็จ!", "success");
        } else {
            showToast("URL เว็บแอปไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", "error");
            return;
        }
        updateSheetsConnectionUI();
        DOM.sheetsModal.classList.remove('open');
    });

    // Portal Card Selectors
    DOM.portalCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryKey = card.getAttribute('data-category');
            selectCategory(categoryKey);
        });
    });

    // Back to Portal Button
    DOM.backPortalBtn.addEventListener('click', () => {
        showPortal();
    });

    // Presentation Toggle Button
    DOM.presentationBtn.addEventListener('click', () => {
        togglePresentationMode();
    });

    // Fullscreen change listener to toggle CSS classes on panel
    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!document.fullscreenElement;
        DOM.summaryPanel.classList.toggle('presentation-mode', isFullscreen);
        
        if (isFullscreen) {
            DOM.presentationBtn.querySelector('span').textContent = 'ย่อหน้าจอ Exit';
            DOM.presentationBtn.querySelector('svg').innerHTML = `
                <path d="M4 14h6v6m0-6l-6 6m16-6h-6v6m0-6l6 6M4 10h6V4m0 6l-6-6m16 6h-6V4m0 6l6-6"/>
            `;
        } else {
            DOM.presentationBtn.querySelector('span').textContent = 'ขยายเต็มจอ Presentation';
            DOM.presentationBtn.querySelector('svg').innerHTML = `
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            `;
        }
    });

    // Objects hit selector for Game 1 Sunday Small (เด็กเล็ก)
    document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            const hits = parseInt(btn.getAttribute('data-hits')) || 0;
            // Update active state in UI
            document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(b => {
                b.classList.toggle('active', parseInt(b.getAttribute('data-hits')) === hits);
            });
            // Calculate and update score
            let score = 0;
            if (hits === 3) {
                score = 100;
            } else {
                score = hits * 30;
            }
            DOM.playerScoreInput.value = score;
        });
    });

    // Team A Matchup Color Selection
    document.querySelectorAll('#match-team-a-selector .color-name-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hex = btn.getAttribute('data-hex');
            state.match.teamA = hex;
            if (state.match.teamA === state.match.teamB) {
                const otherColors = Object.keys(HEX_TO_NAME).filter(c => c !== hex);
                state.match.teamB = otherColors[0];
            }
            updateMatchFormUI();
        });
    });

    // Team B Matchup Color Selection
    document.querySelectorAll('#match-team-b-selector .color-name-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hex = btn.getAttribute('data-hex');
            state.match.teamB = hex;
            if (state.match.teamA === state.match.teamB) {
                const otherColors = Object.keys(HEX_TO_NAME).filter(c => c !== hex);
                state.match.teamA = otherColors[0];
            }
            updateMatchFormUI();
        });
    });

    // Winner Selection
    document.getElementById('winner-team-a-btn').addEventListener('click', () => {
        state.match.winner = 'A';
        updateMatchFormUI();
    });
    document.getElementById('winner-team-b-btn').addEventListener('click', () => {
        state.match.winner = 'B';
        updateMatchFormUI();
    });

    // Fishing team input and controls listeners
    ['blue', 'red', 'green', 'yellow'].forEach(color => {
        const input = document.getElementById(`fishing-fish-${color}`);
        if (!input) return;
        const scoreLabel = document.getElementById(`fishing-score-${color}`);
        const card = input.closest('.fishing-team-card');
        if (!card) return;
        const btns = card.querySelectorAll('.fishing-btn');
        
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isPlus = btn.textContent.trim() === '+';
                let val = parseInt(input.value) || 0;
                val += isPlus ? 1 : -1;
                if (val < 0) val = 0;
                input.value = val;
                if (scoreLabel) scoreLabel.textContent = `${val * 10} คะแนน`;
            });
        });
        
        input.addEventListener('input', () => {
            let val = parseInt(input.value) || 0;
            if (val < 0) {
                val = 0;
                input.value = 0;
            }
            if (scoreLabel) scoreLabel.textContent = `${val * 10} คะแนน`;
        });
    });

    // Win/Loss Selector
    const btnWin = document.getElementById('btn-result-win');
    const btnLoss = document.getElementById('btn-result-loss');
    if (btnWin && btnLoss) {
        btnWin.addEventListener('click', () => {
            btnWin.classList.add('active');
            btnLoss.classList.remove('active');
            const gameName = getActiveGameName(state.activeGame);
            const isPickAndPlace = gameName === 'Pick and Place';
            const isHockey = gameName === 'Hockey';
            if (!isPickAndPlace && !isHockey) {
                DOM.playerScoreInput.value = 30;
            }
        });
        btnLoss.addEventListener('click', () => {
            btnLoss.classList.add('active');
            btnWin.classList.remove('active');
            const gameName = getActiveGameName(state.activeGame);
            const isPickAndPlace = gameName === 'Pick and Place';
            const isHockey = gameName === 'Hockey';
            if (!isPickAndPlace && !isHockey) {
                DOM.playerScoreInput.value = 10;
            }
        });
    }

    // Pick and Place 4-Way Win/Loss Toggles
    const colors_list = ['yellow', 'green', 'blue', 'red'];
    colors_list.forEach(col => {
        const winBtn = document.getElementById(`pp4-win-${col}`);
        const lossBtn = document.getElementById(`pp4-loss-${col}`);
        if (winBtn && lossBtn) {
            winBtn.addEventListener('click', () => {
                winBtn.classList.add('active');
                lossBtn.classList.remove('active');
            });
            lossBtn.addEventListener('click', () => {
                lossBtn.classList.add('active');
                winBtn.classList.remove('active');
            });
        }
    });

    // Pole Fighting Form Listeners
    document.querySelectorAll('#pole-team-a-selector .color-name-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hex = btn.getAttribute('data-hex');
            state.pole.teamA = hex;
            if (state.pole.teamA === state.pole.teamB) {
                const others = Object.keys(HEX_TO_NAME).filter(c => c !== hex);
                state.pole.teamB = others[0];
            }
            updatePoleFormUI();
        });
    });
    document.querySelectorAll('#pole-team-b-selector .color-name-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hex = btn.getAttribute('data-hex');
            state.pole.teamB = hex;
            if (state.pole.teamA === state.pole.teamB) {
                const others = Object.keys(HEX_TO_NAME).filter(c => c !== hex);
                state.pole.teamA = others[0];
            }
            updatePoleFormUI();
        });
    });
    const poleWinABtn = document.getElementById('pole-winner-a-btn');
    const poleWinBBtn = document.getElementById('pole-winner-b-btn');
    if (poleWinABtn) poleWinABtn.addEventListener('click', () => { state.pole.winner = 'A'; updatePoleFormUI(); });
    if (poleWinBBtn) poleWinBBtn.addEventListener('click', () => { state.pole.winner = 'B'; updatePoleFormUI(); });
}

// Set Active Game & Update UI Themes
function setActiveGame(gameNum) {
    state.activeGame = gameNum;
    exitEditMode();
    
    // Update theme accent colors on body
    DOM.body.className = `g${gameNum}-accent`;
    
    // Update tab active classes
    DOM.tabButtons.forEach(btn => {
        const currentBtnGame = btn.getAttribute('data-game');
        btn.className = 'tab-btn';
        if (currentBtnGame === gameNum) {
            btn.classList.add(`active-g${gameNum}`);
        }
    });

    if (gameNum === "summary") {
        // Toggle view containers
        DOM.mainDashboard.style.display = 'none';
        DOM.summaryPanel.style.display = 'flex';
        
        // Render standings chart
        renderSummaryChart();
    } else {
        // Toggle view containers
        DOM.summaryPanel.style.display = 'none';
        DOM.mainDashboard.style.display = 'grid';

        // Toggle standard/objects hit/matchup/pole form fields
        const isFishingGame = checkIfFishingGame(gameNum, state.activeCategory);
        const isMatchupGame = checkIfMatchupGame(gameNum, state.activeCategory);
        const isPoleGame = checkIfPoleGame(gameNum, state.activeCategory);
        
        const isPP4Way = checkIfPickPlace4Way(gameNum, state.activeCategory);
        if (isPoleGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pp4-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'block';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `บันทึกผลการแข่ง ${getActiveGameName(gameNum)} (2 ทีม × 2 คน)`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกผลการแข่ง';
            updatePoleFormUI();
        } else if (isFishingGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'block';
            document.getElementById('pp4-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `ระบุจำนวนปลาที่แต่ละสีตกได้ใน ${getActiveGameName(gameNum)}`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกคะแนนรอบนี้';
            updateFishingPlayerDropdowns();
        } else if (isPP4Way) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pp4-form-fields').style.display = 'block';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `ระบุน้ำหนักและผลการแข่งใน ${getActiveGameName(gameNum)} (แข่งทีละ 4 คน)`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกคะแนนรอบนี้';
            updatePP4PlayerDropdowns();
        } else if (isMatchupGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'block';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.removeAttribute('required');
            const matchGameName = getActiveGameName(gameNum);
            const isHockeyMatch = matchGameName === 'Hockey';
            
            // Update labels for weight (Pick and Place) vs points (Hockey)
            const labelA = document.getElementById('match-label-a');
            const labelB = document.getElementById('match-label-b');
            const inputA = document.getElementById('match-weight-a');
            const inputB = document.getElementById('match-weight-b');
            const scoreGroupA = document.getElementById('match-score-a-group');
            const scoreGroupB = document.getElementById('match-score-b-group');
            
            const isSumoMatch = matchGameName === 'Sumo';
            if (scoreGroupA) scoreGroupA.style.display = isSumoMatch ? 'none' : 'block';
            if (scoreGroupB) scoreGroupB.style.display = isSumoMatch ? 'none' : 'block';
            
            if (labelA) labelA.textContent = isHockeyMatch ? 'แต้มของทีมที่ 1' : 'น้ำหนักทีมที่ 1 (กิโลกรัม)';
            if (labelB) labelB.textContent = isHockeyMatch ? 'แต้มของทีมที่ 2' : 'น้ำหนักทีมที่ 2 (กิโลกรัม)';
            if (inputA) inputA.placeholder = isHockeyMatch ? 'ระบุแต้มของทีมที่ 1...' : 'ระบุน้ำหนักทีมที่ 1...';
            if (inputB) inputB.placeholder = isHockeyMatch ? 'ระบุแต้มของทีมที่ 2...' : 'ระบุน้ำหนักทีมที่ 2...';
            if (inputA) inputA.step = isHockeyMatch ? '1' : '0.01';
            if (inputB) inputB.step = isHockeyMatch ? '1' : '0.01';
            
            DOM.formPanelSubtitle.textContent = `บันทึกผลการแข่งขัน 2 ทีม ใน ${matchGameName}`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกผลการแข่ง';
            updateMatchFormUI();
            updateMatchPlayerDropdown('A');
            updateMatchPlayerDropdown('B');
        } else {
            document.getElementById('standard-form-fields').style.display = 'block';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.setAttribute('required', '');
            
            // Score label selector and controls display adjustment
            const scoreLabel = document.querySelector('#score-input-group label');
            const gameName = getActiveGameName(gameNum);
            const isPickAndPlace = gameName === 'Pick and Place';
            const isHockey = gameName === 'Hockey';
            const isBowling = gameName === 'Bowling';
            const isSumoOrPole = gameName === 'Sumo' || gameName === 'Pole Fighting';
            
            if (scoreLabel) {
                if (isPickAndPlace) {
                    scoreLabel.textContent = "น้ำหนัก (กิโลกรัม)";
                } else if (isHockey) {
                    scoreLabel.textContent = "ใส่จำนวนคะแนน";
                } else {
                    scoreLabel.textContent = "คะแนน";
                }
            }
            
            // Hide +/- buttons for weight input in Game 1 (Pick & Place), show them for Hockey in Game 2
            const modButtons = document.querySelectorAll('.score-input-container .score-control-btn');
            modButtons.forEach(btn => {
                btn.style.display = isPickAndPlace ? 'none' : 'flex';
            });
            
            const isSmallKidsGame1 = isBowling;
            const isWinLossGame = isSumoOrPole || isPickAndPlace || isHockey;
            
            if (isSmallKidsGame1) {
                DOM.formPanelSubtitle.textContent = `เลือกจำนวนวัตถุที่โดนใน ${gameName} (เด็กเล็ก)`;
                if (DOM.scoreInputGroup) DOM.scoreInputGroup.style.display = 'none';
                if (DOM.objectsHitGroup) DOM.objectsHitGroup.style.display = 'block';
                if (document.getElementById('win-loss-group')) document.getElementById('win-loss-group').style.display = 'none';
                
                // Sync objects hit selector UI with current score value
                const currentScore = parseInt(DOM.playerScoreInput.value) || 0;
                let hits = 0;
                if (currentScore === 100) hits = 3;
                else if (currentScore === 60) hits = 2;
                else if (currentScore === 30) hits = 1;
                
                document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.getAttribute('data-hits')) === hits);
                });
            } else if (isWinLossGame) {
                if (isPickAndPlace || isHockey) {
                    DOM.formPanelSubtitle.textContent = `เลือกผลแพ้ชนะและใส่รายละเอียดใน ${gameName}`;
                    if (DOM.scoreInputGroup) DOM.scoreInputGroup.style.display = 'block';
                } else {
                    DOM.formPanelSubtitle.textContent = `เลือกผลแพ้ชนะใน ${gameName}`;
                    if (DOM.scoreInputGroup) DOM.scoreInputGroup.style.display = 'none';
                }
                if (DOM.objectsHitGroup) DOM.objectsHitGroup.style.display = 'none';
                if (document.getElementById('win-loss-group')) document.getElementById('win-loss-group').style.display = 'block';
                
                // Sync win-loss UI
                const isWin = document.getElementById('btn-result-win') && document.getElementById('btn-result-win').classList.contains('active');
                
                const winBtn = document.getElementById('btn-result-win');
                const lossBtn = document.getElementById('btn-result-loss');
                if (winBtn && lossBtn) {
                    winBtn.classList.toggle('active', isWin || !lossBtn.classList.contains('active'));
                    lossBtn.classList.toggle('active', !isWin && lossBtn.classList.contains('active'));
                }
            } else {
                DOM.formPanelSubtitle.textContent = `เพิ่มหรือแก้ไขข้อมูลใน ${gameName}`;
                if (DOM.scoreInputGroup) DOM.scoreInputGroup.style.display = 'block';
                if (DOM.objectsHitGroup) DOM.objectsHitGroup.style.display = 'none';
                if (document.getElementById('win-loss-group')) document.getElementById('win-loss-group').style.display = 'none';
                
                // Reset score adjustment buttons (remove any old custom override)
                DOM.scoreMinus5.textContent = '-5';
                DOM.scoreMinus5.title = 'ลด 5 คะแนน';
                DOM.scoreMinus1.textContent = '-1';
                DOM.scoreMinus1.title = 'ลด 1 คะแนน';
                DOM.scorePlus1.textContent = '+1';
                DOM.scorePlus1.title = 'เพิ่ม 1 คะแนน';
                DOM.scorePlus5.textContent = '+5';
                DOM.scorePlus5.title = 'เพิ่ม 5 คะแนน';
                DOM.scoreMinus5.onclick = null;
                DOM.scoreMinus1.onclick = null;
                DOM.scorePlus1.onclick = null;
                DOM.scorePlus5.onclick = null;
            }
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกคะแนน';
        }
        
        // Clear search query
        DOM.searchInput.value = '';
        
        // Render components
        renderStats();
        renderLeaderboard();
    }
}

// Color Selection Logic (2 colors only: blue and red)
const HEX_TO_NAME = {
    '#00f0ff': 'น้ำเงิน',
    '#ff4b5c': 'แดง',
    '#ffd600': 'เหลือง',
    '#00ff66': 'เขียว'
};

function checkIfMatchupGame(gameNum, category) {
    const gameName = getActiveGameName(gameNum);
    if (gameName === 'Sumo') return true;
    // Pick and Place เป็นแมตช์ 1 ต่อ 1 (ใส่น้ำหนัก) ยกเว้นเด็กโตวันอาทิตย์ และวันเสาร์ (เป็น 2v2)
    if (gameName === 'Pick and Place' && category !== 'sunday_big' && category !== 'saturday') return true;
    // Hockey เป็นแมตช์ 1 ต่อ 1 (ใส่แต้ม) เฉพาะวันเสาร์
    if (gameName === 'Hockey' && category === 'saturday') return true;
    return false;
}

function checkIfFishingGame(gameNum, category) {
    return gameNum === "3" && (category === 'sunday_small' || category === 'sunday_big');
}

function checkIfPickPlace4Way(gameNum, category) {
    return false;
}

function selectColorByHex(hex) {
    DOM.colorNameBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-hex') === hex) {
            btn.classList.add('selected');
        }
    });
    state.selectedColor = hex;
    state.selectedColorName = HEX_TO_NAME[hex] || hex;
    document.documentElement.style.setProperty('--selected-color-accent', hex);
    updatePlayerNameDropdown();
}

// Helper Score Incrementor/Decrementor
function adjustScoreInput(amount) {
    let val = parseInt(DOM.playerScoreInput.value) || 0;
    val += amount;
    if (val < 0) val = 0;
    DOM.playerScoreInput.value = val;
}

// Form Submit Handling
function handleFormSubmit() {
    try {
        // --- Pole Fighting (2 vs 2) — รวม Hockey วันอาทิตย์ ---
        const isPoleGame = checkIfPoleGame(state.activeGame, state.activeCategory);
        if (isPoleGame) {
            const teamA = state.pole.teamA;
            const teamB = state.pole.teamB;
            const winner = state.pole.winner;
            const scoreA = winner === 'A' ? 30 : 10;
            const scoreB = winner === 'B' ? 30 : 10;
            const pA1 = document.getElementById('pole-player-a1')?.value || '';
            const pA2 = document.getElementById('pole-player-a2')?.value || '';
            const pB1 = document.getElementById('pole-player-b1')?.value || '';
            const pB2 = document.getElementById('pole-player-b2')?.value || '';
            
            if (state.editId !== null) {
                const idx = state.scores[state.activeGame].findIndex(m => m.id === state.editId);
                if (idx !== -1) {
                    Object.assign(state.scores[state.activeGame][idx], {
                        teamA, teamB, winner, scoreA, scoreB,
                        playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2
                    });
                    if (state.activeMatchId) {
                        state.scores[state.activeGame][idx].matchId = state.activeMatchId;
                    }
                    syncPoleToGoogleSheet(state.scores[state.activeGame][idx]);
                }
            } else {
                const newPole = {
                    id: Date.now().toString(), isPole: true,
                    teamA, teamB, winner, scoreA, scoreB,
                    playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2,
                    timestamp: Date.now(),
                    matchId: state.activeMatchId || null
                };
                state.scores[state.activeGame].push(newPole);
                syncPoleToGoogleSheet(newPole);
            }
            saveData(); exitEditMode(); renderStats(); renderLeaderboard();
            return;
        }
        
        // --- Match (Pick and Place / Hockey เสาร์ / Sumo) ---
        const isMatchupGame = checkIfMatchupGame(state.activeGame, state.activeCategory);
        if (isMatchupGame) {
            const teamA = state.match.teamA;
            const teamB = state.match.teamB;
            const winner = state.match.winner;
            const scoreA = winner === 'A' ? 30 : 10;
            const scoreB = winner === 'B' ? 30 : 10;
            const weightA = parseFloat(document.getElementById('match-weight-a').value) || 0;
            const weightB = parseFloat(document.getElementById('match-weight-b').value) || 0;
            const playerA = document.getElementById('match-player-a')?.value || '';
            const playerB = document.getElementById('match-player-b')?.value || '';
            
            if (state.editId !== null) {
                const index = state.scores[state.activeGame].findIndex(m => m.id === state.editId);
                if (index !== -1) {
                    state.scores[state.activeGame][index].teamA = teamA;
                    state.scores[state.activeGame][index].teamB = teamB;
                    state.scores[state.activeGame][index].winner = winner;
                    state.scores[state.activeGame][index].scoreA = scoreA;
                    state.scores[state.activeGame][index].scoreB = scoreB;
                    state.scores[state.activeGame][index].weightA = weightA;
                    state.scores[state.activeGame][index].weightB = weightB;
                    state.scores[state.activeGame][index].playerA = playerA;
                    state.scores[state.activeGame][index].playerB = playerB;
                    syncMatchToGoogleSheet(state.scores[state.activeGame][index]);
                }
            } else {
                const newMatch = {
                    id: Date.now().toString(),
                    teamA, teamB, winner, scoreA, scoreB,
                    weightA, weightB, playerA, playerB,
                    timestamp: Date.now()
                };
                state.scores[state.activeGame].push(newMatch);
                syncMatchToGoogleSheet(newMatch);
            }
            
            saveData();
            exitEditMode();
            renderStats();
            renderLeaderboard();
            return;
        }

        const isPP4Way = checkIfPickPlace4Way(state.activeGame, state.activeCategory);
        if (isPP4Way) {
            const nameYellow = document.getElementById('pp4-player-yellow')?.value || '';
            const nameGreen = document.getElementById('pp4-player-green')?.value || '';
            const nameBlue = document.getElementById('pp4-player-blue')?.value || '';
            const nameRed = document.getElementById('pp4-player-red')?.value || '';
            
            const weightYellow = parseFloat(document.getElementById('pp4-weight-yellow')?.value) || 0;
            const weightGreen = parseFloat(document.getElementById('pp4-weight-green')?.value) || 0;
            const weightBlue = parseFloat(document.getElementById('pp4-weight-blue')?.value) || 0;
            const weightRed = parseFloat(document.getElementById('pp4-weight-red')?.value) || 0;
            
            const isWinYellow = document.getElementById('pp4-win-yellow')?.classList.contains('active');
            const isWinGreen = document.getElementById('pp4-win-green')?.classList.contains('active');
            const isWinBlue = document.getElementById('pp4-win-blue')?.classList.contains('active');
            const isWinRed = document.getElementById('pp4-win-red')?.classList.contains('active');
            
            const scoreYellow = isWinYellow ? 30 : 10;
            const scoreGreen = isWinGreen ? 30 : 10;
            const scoreBlue = isWinBlue ? 30 : 10;
            const scoreRed = isWinRed ? 30 : 10;
            
            const resultYellow = isWinYellow ? 'win' : 'loss';
            const resultGreen = isWinGreen ? 'win' : 'loss';
            const resultBlue = isWinBlue ? 'win' : 'loss';
            const resultRed = isWinRed ? 'win' : 'loss';
            
            if (state.editId !== null) {
                const index = state.scores[state.activeGame].findIndex(r => r.id === state.editId);
                if (index !== -1) {
                    Object.assign(state.scores[state.activeGame][index], {
                        nameYellow, nameGreen, nameBlue, nameRed,
                        weightYellow, weightGreen, weightBlue, weightRed,
                        resultYellow, resultGreen, resultBlue, resultRed,
                        scoreYellow, scoreGreen, scoreBlue, scoreRed
                    });
                    if (state.activeMatchId) {
                        state.scores[state.activeGame][index].matchId = state.activeMatchId;
                    }
                    syncPickPlace4WayToGoogleSheet(state.scores[state.activeGame][index]);
                }
            } else {
                const newRound = {
                    id: Date.now().toString(),
                    isPP4Way: true,
                    nameYellow, nameGreen, nameBlue, nameRed,
                    weightYellow, weightGreen, weightBlue, weightRed,
                    resultYellow, resultGreen, resultBlue, resultRed,
                    scoreYellow, scoreGreen, scoreBlue, scoreRed,
                    timestamp: Date.now(),
                    matchId: state.activeMatchId || null
                };
                state.scores[state.activeGame].push(newRound);
                syncPickPlace4WayToGoogleSheet(newRound);
            }
            
            saveData();
            exitEditMode();
            renderStats();
            renderLeaderboard();
            return;
        }

        const isFishingGame = checkIfFishingGame(state.activeGame, state.activeCategory);
        if (isFishingGame) {
            const fishBlue = parseInt(document.getElementById('fishing-fish-blue')?.value) || 0;
            const fishGreen = parseInt(document.getElementById('fishing-fish-green')?.value) || 0;
            const fishYellow = parseInt(document.getElementById('fishing-fish-yellow')?.value) || 0;
            const fishRed = parseInt(document.getElementById('fishing-fish-red')?.value) || 0;
            const nameBlue = document.getElementById('fishing-player-blue')?.value || '';
            const nameGreen = document.getElementById('fishing-player-green')?.value || '';
            const nameYellow = document.getElementById('fishing-player-yellow')?.value || '';
            const nameRed = document.getElementById('fishing-player-red')?.value || '';
            
            if (state.editId !== null) {
                const index = state.scores[state.activeGame].findIndex(r => r.id === state.editId);
                if (index !== -1) {
                    state.scores[state.activeGame][index].fishBlue = fishBlue;
                    state.scores[state.activeGame][index].fishGreen = fishGreen;
                    state.scores[state.activeGame][index].fishYellow = fishYellow;
                    state.scores[state.activeGame][index].fishRed = fishRed;
                    state.scores[state.activeGame][index].nameBlue = nameBlue;
                    state.scores[state.activeGame][index].nameGreen = nameGreen;
                    state.scores[state.activeGame][index].nameYellow = nameYellow;
                    state.scores[state.activeGame][index].nameRed = nameRed;
                    state.scores[state.activeGame][index].scoreBlue = fishBlue * 10;
                    state.scores[state.activeGame][index].scoreGreen = fishGreen * 10;
                    state.scores[state.activeGame][index].scoreYellow = fishYellow * 10;
                    state.scores[state.activeGame][index].scoreRed = fishRed * 10;
                    if (state.activeMatchId) {
                        state.scores[state.activeGame][index].matchId = state.activeMatchId;
                    }
                    syncFishingToGoogleSheet(state.scores[state.activeGame][index]);
                }
            } else {
                const newRound = {
                    id: Date.now().toString(),
                    isFishing: true,
                    fishBlue: fishBlue,
                    fishGreen: fishGreen,
                    fishYellow: fishYellow,
                    fishRed: fishRed,
                    nameBlue: nameBlue,
                    nameGreen: nameGreen,
                    nameYellow: nameYellow,
                    nameRed: nameRed,
                    scoreBlue: fishBlue * 10,
                    scoreGreen: fishGreen * 10,
                    scoreYellow: fishYellow * 10,
                    scoreRed: fishRed * 10,
                    timestamp: Date.now(),
                    matchId: state.activeMatchId || null
                };
                state.scores[state.activeGame].push(newRound);
                syncFishingToGoogleSheet(newRound);
            }
            
            saveData();
            exitEditMode();
            renderStats();
            renderLeaderboard();
            return;
        }

        const name = DOM.playerNameInput.value.trim();
        const color = state.selectedColor;
        
        if (!name) return;

        const gameName = getActiveGameName(state.activeGame);
        const isPickAndPlace = gameName === 'Pick and Place';
        const isHockey = gameName === 'Hockey';
        const isSumoOrPole = gameName === 'Sumo' || gameName === 'Pole Fighting';
        
        let score = 0;
        let result = '';
        let weight = undefined;
        let points = undefined;
        
        if (isPickAndPlace) {
            const isWin = document.getElementById('btn-result-win').classList.contains('active');
            score = isWin ? 30 : 10;
            result = isWin ? 'win' : 'loss';
            weight = parseFloat(DOM.playerScoreInput.value) || 0;
        } else if (isHockey) {
            const isWin = document.getElementById('btn-result-win').classList.contains('active');
            score = isWin ? 30 : 10;
            result = isWin ? 'win' : 'loss';
            points = parseInt(DOM.playerScoreInput.value) || 0;
        } else if (isSumoOrPole) {
            const isWin = document.getElementById('btn-result-win').classList.contains('active');
            score = isWin ? 30 : 10;
            result = isWin ? 'win' : 'loss';
        } else {
            score = parseInt(DOM.playerScoreInput.value) || 0;
        }

        if (state.editId !== null) {
            // Edit Mode
            const gameScores = state.scores[state.activeGame];
            const index = gameScores.findIndex(p => p.id === state.editId);
            if (index !== -1) {
                gameScores[index].name = name;
                gameScores[index].score = score;
                gameScores[index].color = color;
                gameScores[index].result = result;
                gameScores[index].weight = weight;
                gameScores[index].points = points;
                if (state.activeMatchId) {
                    gameScores[index].matchId = state.activeMatchId;
                }
            }
        } else {
            // Add Mode
            const newPlayer = {
                id: Date.now().toString(),
                name: name,
                score: score,
                color: color,
                result: result,
                weight: weight,
                points: points,
                timestamp: Date.now(),
                matchId: state.activeMatchId || null
            };
            state.scores[state.activeGame].push(newPlayer);
        }
        
        saveData();
        
        // Sync to Google Sheet — format dynamic detail text
        let sheetName = name;
        if (isPickAndPlace) {
            sheetName = `${name} (${result === 'win' ? 'ชนะ' : 'แพ้'}) [น้ำหนัก: ${weight} กก.]`;
        } else if (isHockey) {
            sheetName = `${name} (${result === 'win' ? 'ชนะ' : 'แพ้'}) [แต้ม: ${points}]`;
        } else if (isSumoOrPole) {
            sheetName = `${name} (${result === 'win' ? 'ชนะ' : 'แพ้'})`;
        }
        
        syncToGoogleSheet(state.activeGame, sheetName, score, state.selectedColorName);
        
        exitEditMode();
        renderStats();
        renderLeaderboard();
    } catch (e) {
        console.error("Error submitting form:", e);
        showToast("เกิดข้อผิดพลาดในการบันทึกคะแนน", "error");
    }
}

// Edit Mode Entry & Exit
function enterEditMode(player) {
    state.editId = player.id;
    state.activeMatchId = player.matchId || null;
    
    const gameName = getActiveGameName(state.activeGame);
    const isPickAndPlace = gameName === 'Pick and Place';
    const isHockey = gameName === 'Hockey';
    const isBowling = gameName === 'Bowling';
    const isSumoOrPole = gameName === 'Sumo' || gameName === 'Pole Fighting';
    
    if (isPickAndPlace) {
        DOM.playerScoreInput.value = player.weight || 0;
    } else if (isHockey) {
        DOM.playerScoreInput.value = player.points || 0;
    } else {
        DOM.playerScoreInput.value = player.score;
    }
    
    // Sync UI Color buttons with player's color
    selectColorByHex(player.color);
    
    // Sync player name dropdown selection
    updatePlayerNameDropdown(player.name);
    
    // Sync objects hit selector UI if Sunday Small Game 1 (Bowling)
    if (isBowling) {
        let hits = 0;
        if (player.score === 100) hits = 3;
        else if (player.score === 60) hits = 2;
        else if (player.score === 30) hits = 1;
        
        document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-hits')) === hits);
        });
    }
    
    // Sync win/loss selector UI if Sumo/Pole Fighting/Pick Place/Hockey
    const isWinLossGame = isSumoOrPole || isPickAndPlace || isHockey;
    if (isWinLossGame) {
        const isWin = player.result === 'win' || player.score === 30;
        const winBtn = document.getElementById('btn-result-win');
        const lossBtn = document.getElementById('btn-result-loss');
        if (winBtn && lossBtn) {
            winBtn.classList.toggle('active', isWin);
            lossBtn.classList.toggle('active', !isWin);
        }
    }
    
    // UI state change
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
}

function enterMatchEditMode(match) {
    state.editId = match.id;
    state.match = {
        teamA: match.teamA,
        teamB: match.teamB,
        winner: match.winner,
        weightA: match.weightA || 0,
        weightB: match.weightB || 0
    };
    
    const wA = document.getElementById('match-weight-a');
    const wB = document.getElementById('match-weight-b');
    if (wA) wA.value = match.weightA || '';
    if (wB) wB.value = match.weightB || '';
    
    updateMatchFormUI();
    updateMatchPlayerDropdown('A', match.playerA || null);
    updateMatchPlayerDropdown('B', match.playerB || null);
    
    // UI state change
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
}

function enterFishingEditMode(round) {
    state.editId = round.id;
    state.activeMatchId = round.matchId || null;
    updateFishingPlayerDropdowns();
    
    const fb = document.getElementById('fishing-fish-blue');
    const fg = document.getElementById('fishing-fish-green');
    const fy = document.getElementById('fishing-fish-yellow');
    const fr = document.getElementById('fishing-fish-red');
    const pb = document.getElementById('fishing-player-blue');
    const pg = document.getElementById('fishing-player-green');
    const py = document.getElementById('fishing-player-yellow');
    const pr = document.getElementById('fishing-player-red');
    
    if (fb) fb.value = round.fishBlue || 0;
    if (fg) fg.value = round.fishGreen || 0;
    if (fy) fy.value = round.fishYellow || 0;
    if (fr) fr.value = round.fishRed || 0;
    if (pb) pb.value = round.nameBlue || '';
    if (pg) pg.value = round.nameGreen || '';
    if (py) py.value = round.nameYellow || '';
    if (pr) pr.value = round.nameRed || '';
    
    const sb = document.getElementById('fishing-score-blue');
    const sg = document.getElementById('fishing-score-green');
    const sy = document.getElementById('fishing-score-yellow');
    const sr = document.getElementById('fishing-score-red');
    
    if (sb) sb.textContent = `${(round.fishBlue || 0) * 10} แต้ม`;
    if (sg) sg.textContent = `${(round.fishGreen || 0) * 10} แต้ม`;
    if (sy) sy.textContent = `${(round.fishYellow || 0) * 10} แต้ม`;
    if (sr) sr.textContent = `${(round.fishRed || 0) * 10} แต้ม`;
    
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
}

function exitEditMode() {
    state.editId = null;
    state.activeMatchId = null;
    DOM.scoreForm.reset();
    DOM.playerScoreInput.value = '0';
    
    // Reset to default color (น้ำเงิน)
    selectColorByHex('#00f0ff');
    
    // Reset match state
    state.match = {
        teamA: '#00f0ff',
        teamB: '#ff4b5c',
        winner: 'A',
        weightA: '',
        weightB: ''
    };
    const wA = document.getElementById('match-weight-a');
    const wB = document.getElementById('match-weight-b');
    if (wA) wA.value = '';
    if (wB) wB.value = '';
    // Reset match player dropdowns
    ['match-player-a', 'match-player-b'].forEach(id => {
        const sel = document.getElementById(id); if (sel) sel.value = '';
    });
    
    // Reset pole state
    state.pole = { teamA: '#00f0ff', teamB: '#ff4b5c', winner: 'A' };
    ['pole-player-a1', 'pole-player-a2', 'pole-player-b1', 'pole-player-b2'].forEach(id => {
        const sel = document.getElementById(id); if (sel) sel.value = '';
    });

    // Reset objects hit selector buttons in UI to 0
    document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-hits') === '0');
    });

    // Reset win/loss selector in UI
    const winBtn = document.getElementById('btn-result-win');
    const lossBtn = document.getElementById('btn-result-loss');
    if (winBtn && lossBtn) {
        winBtn.classList.add('active');
        lossBtn.classList.remove('active');
    }

    // Reset fishing inputs
    const fb = document.getElementById('fishing-fish-blue');
    const fg = document.getElementById('fishing-fish-green');
    const fy = document.getElementById('fishing-fish-yellow');
    const fr = document.getElementById('fishing-fish-red');
    const pb = document.getElementById('fishing-player-blue');
    const pg = document.getElementById('fishing-player-green');
    const py = document.getElementById('fishing-player-yellow');
    const pr = document.getElementById('fishing-player-red');
    if (fb && fg && fy && fr) {
        fb.value = '0';
        fg.value = '0';
        fy.value = '0';
        fr.value = '0';
        document.getElementById('fishing-score-blue').textContent = '0 แต้ม';
        document.getElementById('fishing-score-green').textContent = '0 แต้ม';
        document.getElementById('fishing-score-yellow').textContent = '0 แต้ม';
        document.getElementById('fishing-score-red').textContent = '0 แต้ม';
    }
    if (pb && pg && py && pr) {
        pb.value = '';
        pg.value = '';
        py.value = '';
        pr.value = '';
    }

    // Reset pp4 inputs
    const pp4_py = document.getElementById('pp4-player-yellow');
    const pp4_pg = document.getElementById('pp4-player-green');
    const pp4_pb = document.getElementById('pp4-player-blue');
    const pp4_pr = document.getElementById('pp4-player-red');
    if (pp4_py) pp4_py.value = '';
    if (pp4_pg) pp4_pg.value = '';
    if (pp4_pb) pp4_pb.value = '';
    if (pp4_pr) pp4_pr.value = '';
    
    const pp4_wy = document.getElementById('pp4-weight-yellow');
    const pp4_wg = document.getElementById('pp4-weight-green');
    const pp4_wb = document.getElementById('pp4-weight-blue');
    const pp4_wr = document.getElementById('pp4-weight-red');
    if (pp4_wy) pp4_wy.value = '0';
    if (pp4_wg) pp4_wg.value = '0';
    if (pp4_wb) pp4_wb.value = '0';
    if (pp4_wr) pp4_wr.value = '0';
    
    const colors_list = ['yellow', 'green', 'blue', 'red'];
    colors_list.forEach(col => {
        const winBtn = document.getElementById(`pp4-win-${col}`);
        const lossBtn = document.getElementById(`pp4-loss-${col}`);
        if (winBtn && lossBtn) {
            winBtn.classList.add('active');
            lossBtn.classList.remove('active');
        }
    });
    
    const isMatchupGame = checkIfMatchupGame(state.activeGame, state.activeCategory);
    const isPoleGameNow = state.activeCategory ? checkIfPoleGame(state.activeGame, state.activeCategory) : false;
    
    // Reset buttons
    DOM.submitBtn.classList.remove('btn-edit-mode');
    if (isPoleGameNow) {
        DOM.submitBtn.querySelector('span').textContent = 'บันทึกผลการแข่ง';
        updatePoleFormUI();
    } else if (isMatchupGame) {
        DOM.submitBtn.querySelector('span').textContent = 'บันทึกผลการแข่ง';
        updateMatchFormUI();
    } else {
        DOM.submitBtn.querySelector('span').textContent = 'บันทึกคะแนน';
    }
    DOM.cancelEditBtn.style.display = 'none';
}

// Update Fishing Player Dropdowns with color-specific names
function updateFishingPlayerDropdowns() {
    const colors = [
        { id: 'yellow', hex: '#ffd600' },
        { id: 'red',    hex: '#ff4b5c' },
        { id: 'blue',   hex: '#00f0ff' },
        { id: 'green',  hex: '#00ff66' }
    ];
    
    const cat = state.activeCategory || 'saturday';
    
    colors.forEach(color => {
        const select = document.getElementById(`fishing-player-${color.id}`);
        if (!select) return;
        
        const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][color.hex]) || [];
        select.innerHTML = '<option value="" disabled selected>-- เลือกชื่อน้อง --</option>';
        list.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    });
}

function updatePP4PlayerDropdowns() {
    const colors = [
        { id: 'yellow', hex: '#ffd600' },
        { id: 'red',    hex: '#ff4b5c' },
        { id: 'blue',   hex: '#00f0ff' },
        { id: 'green',  hex: '#00ff66' }
    ];
    
    const cat = state.activeCategory || 'saturday';
    
    colors.forEach(color => {
        const select = document.getElementById(`pp4-player-${color.id}`);
        if (!select) return;
        
        const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][color.hex]) || [];
        select.innerHTML = '<option value="" disabled selected>-- เลือกชื่อน้อง --</option>';
        list.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    });
}

function enterPP4EditMode(round) {
    state.editId = round.id;
    state.activeMatchId = round.matchId || null;
    updatePP4PlayerDropdowns();
    
    const py = document.getElementById('pp4-player-yellow');
    const pg = document.getElementById('pp4-player-green');
    const pb = document.getElementById('pp4-player-blue');
    const pr = document.getElementById('pp4-player-red');
    if (py) py.value = round.nameYellow || '';
    if (pg) pg.value = round.nameGreen || '';
    if (pb) pb.value = round.nameBlue || '';
    if (pr) pr.value = round.nameRed || '';
    
    const wy = document.getElementById('pp4-weight-yellow');
    const wg = document.getElementById('pp4-weight-green');
    const wb = document.getElementById('pp4-weight-blue');
    const wr = document.getElementById('pp4-weight-red');
    if (wy) wy.value = round.weightYellow || 0;
    if (wg) wg.value = round.weightGreen || 0;
    if (wb) wb.value = round.weightBlue || 0;
    if (wr) wr.value = round.weightRed || 0;
    
    const colors = ['yellow', 'green', 'blue', 'red'];
    colors.forEach(col => {
        const result = round[`result${col.charAt(0).toUpperCase() + col.slice(1)}`] || 'win';
        const winBtn = document.getElementById(`pp4-win-${col}`);
        const lossBtn = document.getElementById(`pp4-loss-${col}`);
        if (winBtn && lossBtn) {
            if (result === 'win') {
                winBtn.classList.add('active');
                lossBtn.classList.remove('active');
            } else {
                lossBtn.classList.add('active');
                winBtn.classList.remove('active');
            }
        }
    });
    
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
}

function syncPickPlace4WayToGoogleSheet(record) {
    if (!state.sheetsUrl) return;
    const colors = [
        { name: 'เหลือง', player: record.nameYellow, score: record.scoreYellow, weight: record.weightYellow, result: record.resultYellow },
        { name: 'เขียว', player: record.nameGreen, score: record.scoreGreen, weight: record.weightGreen, result: record.resultGreen },
        { name: 'น้ำเงิน', player: record.nameBlue, score: record.scoreBlue, weight: record.weightBlue, result: record.resultBlue },
        { name: 'แดง', player: record.nameRed, score: record.scoreRed, weight: record.weightRed, result: record.resultRed }
    ];
    colors.forEach((c, idx) => {
        setTimeout(() => {
            const resultText = c.result === 'win' ? 'ชนะ' : 'แพ้';
            const displayName = `น้อง${c.player} [${resultText}] [น้ำหนัก: ${c.weight} กก.]`;
            syncToGoogleSheet(state.activeGame, displayName, c.score, c.name);
        }, idx * 1200);
    });
}

// Game 1 Matchup Helpers
function updateMatchFormUI() {
    // Team A selector
    const aBtns = document.querySelectorAll('#match-team-a-selector .color-name-btn');
    aBtns.forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-hex') === state.match.teamA);
    });
    
    // Team B selector
    const bBtns = document.querySelectorAll('#match-team-b-selector .color-name-btn');
    bBtns.forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-hex') === state.match.teamB);
    });
    
    // Update team labels with color names
    const teamAColorName = HEX_TO_NAME[state.match.teamA] || 'ที่ 1';
    const teamBColorName = HEX_TO_NAME[state.match.teamB] || 'ที่ 2';
    
    // Update team color labels
    const matchTeamALabel = document.querySelector('#match-form-fields .form-group:nth-child(1) > label');
    const matchTeamBLabel = document.querySelector('#match-form-fields .form-group:nth-child(6) > label');
    if (matchTeamALabel) matchTeamALabel.textContent = `ทีมสี${teamAColorName}`;
    if (matchTeamBLabel) matchTeamBLabel.textContent = `ทีมสี${teamBColorName}`;
    
    // Update player selection labels
    const playerALabel = document.querySelector('label[for="match-player-a"]');
    const playerBLabel = document.querySelector('label[for="match-player-b"]');
    if (playerALabel) playerALabel.textContent = `ผู้เล่นทีมสี${teamAColorName}`;
    if (playerBLabel) playerBLabel.textContent = `ผู้เล่นทีมสี${teamBColorName}`;
    
    // Update weight/score labels
    const labelA = document.getElementById('match-label-a');
    const labelB = document.getElementById('match-label-b');
    const gameNameNow = getActiveGameName(state.activeGame);
    const isHockeyMatch = gameNameNow === 'Hockey';
    const unitTxt = isHockeyMatch ? '(แต้ม)' : '(กิโลกรัม)';
    const labelKind = isHockeyMatch ? 'แต้ม' : 'น้ำหนัก';
    if (labelA) labelA.textContent = `${labelKind}ทีมสี${teamAColorName} ${unitTxt}`;
    if (labelB) labelB.textContent = `${labelKind}ทีมสี${teamBColorName} ${unitTxt}`;
    
    // Winner buttons text and active classes
    const winABtn = document.getElementById('winner-team-a-btn');
    const winBBtn = document.getElementById('winner-team-b-btn');
    if (winABtn && winBBtn) {
        winABtn.textContent = `ทีมสี${HEX_TO_NAME[state.match.teamA]} ชนะ`;
        winBBtn.textContent = `ทีมสี${HEX_TO_NAME[state.match.teamB]} ชนะ`;
        
        const isWinnerA = state.match.winner === 'A';
        const isWinnerB = state.match.winner === 'B';
        
        winABtn.classList.toggle('active', isWinnerA);
        winBBtn.classList.toggle('active', isWinnerB);
        
        if (isWinnerA) {
            winABtn.style.borderColor = state.match.teamA;
            winABtn.style.color = state.match.teamA;
            winABtn.style.boxShadow = `0 0 12px ${state.match.teamA}80`;
            winABtn.style.background = `${state.match.teamA}15`;
            
            winBBtn.style.borderColor = '';
            winBBtn.style.color = '';
            winBBtn.style.boxShadow = '';
            winBBtn.style.background = '';
        } else if (isWinnerB) {
            winBBtn.style.borderColor = state.match.teamB;
            winBBtn.style.color = state.match.teamB;
            winBBtn.style.boxShadow = `0 0 12px ${state.match.teamB}80`;
            winBBtn.style.background = `${state.match.teamB}15`;
            
            winABtn.style.borderColor = '';
            winABtn.style.color = '';
            winABtn.style.boxShadow = '';
            winABtn.style.background = '';
        }
    }
    // Refresh รายชื่อตามสีที่เลือก
    updateMatchPlayerDropdown('A');
    updateMatchPlayerDropdown('B');

}

// Update player dropdown for match form based on selected team color
function updateMatchPlayerDropdown(team, selectedValue = null) {
    const hex = team === 'A' ? state.match.teamA : state.match.teamB;
    const cat = state.activeCategory || 'saturday';
    const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][hex]) || [];
    const id = team === 'A' ? 'match-player-a' : 'match-player-b';
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>-- เลือกชื่อน้อง --</option>';
    list.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
    });
    if (selectedValue && !list.includes(selectedValue)) {
        const opt = document.createElement('option'); opt.value = selectedValue; opt.textContent = selectedValue;
        sel.appendChild(opt);
    }
    if (selectedValue) sel.value = selectedValue;
}

// Check if current game is Pole Fighting (2v2) — รวม Hockey วันอาทิตย์ด้วย
function checkIfPoleGame(gameNum, category) {
    const gameName = getActiveGameName(gameNum);

    if (gameName === 'Pole Fighting') return true;

    if (gameName === 'Bowling' &&
        category === 'sunday_small')
        return true;

    if (gameName === 'Hockey' &&
       (category === 'sunday_small' || category === 'sunday_big'))
       return true;

    if (gameName === 'Pick and Place' &&
       (category === 'sunday_big' || category === 'saturday'))
       return true;

    return false;
}


// Update pole form UI state (color selectors + winner buttons + player dropdowns)
function updatePoleFormUI() {
    document.querySelectorAll('#pole-team-a-selector .color-name-btn').forEach(btn =>
        btn.classList.toggle('selected', btn.getAttribute('data-hex') === state.pole.teamA));
    document.querySelectorAll('#pole-team-b-selector .color-name-btn').forEach(btn =>
        btn.classList.toggle('selected', btn.getAttribute('data-hex') === state.pole.teamB));
    
    // Update team labels with color names
    const teamAColorName = HEX_TO_NAME[state.pole.teamA] || 'ที่ 1';
    const teamBColorName = HEX_TO_NAME[state.pole.teamB] || 'ที่ 2';
    
    // Update team color labels
    const poleTeamALabel = document.querySelector('#pole-form-fields .form-group:nth-child(1) > label');
    const poleTeamBLabel = document.querySelector('#pole-form-fields .form-group:nth-child(3) > label');
    if (poleTeamALabel) poleTeamALabel.textContent = `ทีมสี${teamAColorName}`;
    if (poleTeamBLabel) poleTeamBLabel.textContent = `ทีมสี${teamBColorName}`;
    
    const winABtn = document.getElementById('pole-winner-a-btn');
    const winBBtn = document.getElementById('pole-winner-b-btn');
    
    if (winABtn && winBBtn) {
        winABtn.textContent = `ทีมสี${HEX_TO_NAME[state.pole.teamA]} ชนะ`;
        winBBtn.textContent = `ทีมสี${HEX_TO_NAME[state.pole.teamB]} ชนะ`;
        const isWinA = state.pole.winner === 'A';
        winABtn.classList.toggle('active', isWinA);
        winBBtn.classList.toggle('active', !isWinA);
        winABtn.style.borderColor = isWinA ? state.pole.teamA : '';
        winABtn.style.color = isWinA ? state.pole.teamA : '';
        winABtn.style.boxShadow = isWinA ? `0 0 12px ${state.pole.teamA}80` : '';
        winABtn.style.background = isWinA ? `${state.pole.teamA}15` : '';
        winBBtn.style.borderColor = !isWinA ? state.pole.teamB : '';
        winBBtn.style.color = !isWinA ? state.pole.teamB : '';
        winBBtn.style.boxShadow = !isWinA ? `0 0 12px ${state.pole.teamB}80` : '';
        winBBtn.style.background = !isWinA ? `${state.pole.teamB}15` : '';
    }

    // Toggle 1v1 vs 2v2: Pole Fighting วันเสาร์ = 1v1, ที่เหลือ (วันอาทิตย์ + Hockey อาทิตย์ + Pick and Place เสาร์) = 2v2
    const gameName = getActiveGameName(state.activeGame);
    const isPole1v1 = state.activeCategory === 'saturday' && gameName === 'Pole Fighting';
    const wrapperA2 = document.getElementById('pole-player-a2-wrapper');
    const wrapperB2 = document.getElementById('pole-player-b2-wrapper');
    const gridA = document.getElementById('pole-team-a-players-grid');
    const gridB = document.getElementById('pole-team-b-players-grid');
    const labelA1 = document.getElementById('pole-label-a1');
    const labelB1 = document.getElementById('pole-label-b1');
    
    if (isPole1v1) {
        if (wrapperA2) wrapperA2.style.display = 'none';
        if (wrapperB2) wrapperB2.style.display = 'none';
        if (gridA) gridA.style.gridTemplateColumns = '1fr';
        if (gridB) gridB.style.gridTemplateColumns = '1fr';
        if (labelA1) labelA1.textContent = `ผู้เล่น (ทีมสี${teamAColorName})`;
        if (labelB1) labelB1.textContent = `ผู้เล่น (ทีมสี${teamBColorName})`;
    } else {
        if (wrapperA2) wrapperA2.style.display = 'block';
        if (wrapperB2) wrapperB2.style.display = 'block';
        if (gridA) gridA.style.gridTemplateColumns = '1fr 1fr';
        if (gridB) gridB.style.gridTemplateColumns = '1fr 1fr';
        if (labelA1) labelA1.textContent = `ผู้เล่น 1 (ทีมสี${teamAColorName})`;
        if (labelB1) labelB1.textContent = `ผู้เล่น 1 (ทีมสี${teamBColorName})`;
    }

    updatePolePlayerDropdown('A');
    updatePolePlayerDropdown('B');
}

// Update player dropdowns for Pole Fighting team
function updatePolePlayerDropdown(team, selectedValues = [null, null]) {
    const hex = team === 'A' ? state.pole.teamA : state.pole.teamB;
    const cat = state.activeCategory || 'saturday';
    const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][hex]) || [];
    const ids = team === 'A' ? ['pole-player-a1', 'pole-player-a2'] : ['pole-player-b1', 'pole-player-b2'];
    ids.forEach((id, idx) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="" disabled selected>-- เลือกชื่อน้อง --</option>';
        list.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name; sel.appendChild(opt);
        });
        const sv = selectedValues[idx];
        if (sv && !list.includes(sv)) {
            const opt = document.createElement('option'); opt.value = sv; opt.textContent = sv; sel.appendChild(opt);
        }
        if (sv) sel.value = sv;
    });
}

// Enter edit mode for a Pole Fighting match
function enterPoleEditMode(pole) {
    state.editId = pole.id;
    state.activeMatchId = pole.matchId || null;
    state.pole = { teamA: pole.teamA, teamB: pole.teamB, winner: pole.winner };
    updatePoleFormUI();
    updatePolePlayerDropdown('A', [pole.playerA1 || null, pole.playerA2 || null]);
    updatePolePlayerDropdown('B', [pole.playerB1 || null, pole.playerB2 || null]);
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
}

// Sync Pole Fighting result to Google Sheets
function syncPoleToGoogleSheet(pole) {
    if (!state.sheetsUrl) return;
    const pA = [pole.playerA1, pole.playerA2].filter(Boolean).join(', ') || '-';
    const pB = [pole.playerB1, pole.playerB2].filter(Boolean).join(', ') || '-';
    const nameA = `ทีมสี${HEX_TO_NAME[pole.teamA]} (${pole.winner === 'A' ? 'ชนะ' : 'แพ้'}) [${pA}]`;
    const nameB = `ทีมสี${HEX_TO_NAME[pole.teamB]} (${pole.winner === 'B' ? 'ชนะ' : 'แพ้'}) [${pB}]`;
    syncToGoogleSheet(state.activeGame, nameA, pole.scoreA, HEX_TO_NAME[pole.teamA]);
    setTimeout(() => syncToGoogleSheet(state.activeGame, nameB, pole.scoreB, HEX_TO_NAME[pole.teamB]), 1200);
}

function syncMatchToGoogleSheet(match) {
    if (!state.sheetsUrl) return;
    
    const gameName = getActiveGameName(state.activeGame);
    const isHockeyMatch = gameName === 'Hockey';
    const isSumo = gameName === 'Sumo';
    const labelText = isHockeyMatch ? "แต้ม" : "น้ำหนัก";
    const suffixText = isHockeyMatch ? "" : " กก.";
    const wA = (isSumo || match.weightA === undefined || match.weightA === '' || match.weightA === 0) ? '' : ` [${labelText}: ${match.weightA}${suffixText}]`;
    const wB = (isSumo || match.weightB === undefined || match.weightB === '' || match.weightB === 0) ? '' : ` [${labelText}: ${match.weightB}${suffixText}]`;
    const pA = match.playerA ? ` [${match.playerA}]` : '';
    const pB = match.playerB ? ` [${match.playerB}]` : '';
    
    const nameA = `ทีมสี${HEX_TO_NAME[match.teamA]} (${match.winner === 'A' ? 'ชนะ' : 'แพ้'})${pA}${wA}`;
    const nameB = `ทีมสี${HEX_TO_NAME[match.teamB]} (${match.winner === 'B' ? 'ชนะ' : 'แพ้'})${pB}${wB}`;
    
    syncToGoogleSheet(state.activeGame, nameA, match.scoreA, HEX_TO_NAME[match.teamA]);
    setTimeout(() => {
        syncToGoogleSheet(state.activeGame, nameB, match.scoreB, HEX_TO_NAME[match.teamB]);
    }, 1200);
}

function syncFishingToGoogleSheet(round) {
    if (!state.sheetsUrl) return;
    
    const colors = [
        { name: 'น้ำเงิน', score: round.scoreBlue, fish: round.fishBlue },
        { name: 'แดง', score: round.scoreRed, fish: round.fishRed }
    ];
    
    colors.forEach((c, idx) => {
        setTimeout(() => {
            const displayName = `ทีมสี${c.name} [ปลา: ${c.fish} ตัว]`;
            syncToGoogleSheet(state.activeGame, displayName, c.score, c.name);
        }, idx * 1200);
    });
}

// Pre-configured matches for Sunday Small (วันอาทิตย์ เด็กเล็ก)
const SUNDAY_SMALL_MATCHES = {
    "1": [
        {
            "id": 1,
            "round": 1,
            "type": "individual",
            "player": "ก้าว",
            "color": "#ffd600"
        },
        {
            "id": 2,
            "round": 1,
            "type": "individual",
            "player": "เซนต์",
            "color": "#ffd600"
        },
        {
            "id": 3,
            "round": 1,
            "type": "individual",
            "player": "ดีเซล",
            "color": "#ffd600"
        },
        {
            "id": 4,
            "round": 1,
            "type": "individual",
            "player": "ใบบุญ",
            "color": "#ffd600"
        },
        {
            "id": 5,
            "round": 2,
            "type": "individual",
            "player": "จินดา",
            "color": "#ffd600"
        },
        {
            "id": 6,
            "round": 2,
            "type": "individual",
            "player": "Cani",
            "color": "#ffd600"
        },
        {
            "id": 7,
            "round": 2,
            "type": "individual",
            "player": "ภาคิน",
            "color": "#ffd600"
        },
        {
            "id": 8,
            "round": 2,
            "type": "individual",
            "player": "ไบรท์",
            "color": "#ffd600"
        },
        {
            "id": 9,
            "round": 3,
            "type": "individual",
            "player": "เลโก้",
            "color": "#00ff66"
        },
        {
            "id": 10,
            "round": 3,
            "type": "individual",
            "player": "อาเหยียน",
            "color": "#00ff66"
        },
        {
            "id": 11,
            "round": 3,
            "type": "individual",
            "player": "เชฟ",
            "color": "#00ff66"
        },
        {
            "id": 12,
            "round": 3,
            "type": "individual",
            "player": "ขอบคุณ",
            "color": "#00ff66"
        },
        {
            "id": 13,
            "round": 4,
            "type": "individual",
            "player": "ฟรานส์",
            "color": "#00ff66"
        },
        {
            "id": 14,
            "round": 4,
            "type": "individual",
            "player": "มีตังค์",
            "color": "#00ff66"
        },
        {
            "id": 15,
            "round": 4,
            "type": "individual",
            "player": "เชอริล",
            "color": "#00f0ff"
        },
        {
            "id": 16,
            "round": 4,
            "type": "individual",
            "player": "เท็นเท็น",
            "color": "#00f0ff"
        },
        {
            "id": 17,
            "round": 5,
            "type": "individual",
            "player": "นาคิน",
            "color": "#ff4b5c"
        },
        {
            "id": 18,
            "round": 5,
            "type": "individual",
            "player": "ปุณณ์ W",
            "color": "#00ff66"
        },
        {
            "id": 19,
            "round": 5,
            "type": "individual",
            "player": "นาคินทร์",
            "color": "#00ff66"
        },
        {
            "id": 20,
            "round": 5,
            "type": "individual",
            "player": "ไทเป",
            "color": "#00f0ff"
        },
        {
            "id": 21,
            "round": 6,
            "type": "individual",
            "player": "ภูผา",
            "color": "#ff4b5c"
        },
        {
            "id": 22,
            "round": 6,
            "type": "individual",
            "player": "กราฟิก",
            "color": "#00f0ff"
        },
        {
            "id": 23,
            "round": 6,
            "type": "individual",
            "player": "พายุ",
            "color": "#ff4b5c"
        },
        {
            "id": 24,
            "round": 6,
            "type": "individual",
            "player": "อาร์ชี่",
            "color": "#ff4b5c"
        },
        {
            "id": 25,
            "round": 7,
            "type": "individual",
            "player": "ลอฟต์",
            "color": "#ff4b5c"
        },
        {
            "id": 26,
            "round": 7,
            "type": "individual",
            "player": "อคิณ",
            "color": "#ff4b5c"
        },
        {
            "id": 27,
            "round": 7,
            "type": "individual",
            "player": "อิงอิง",
            "color": "#ffd600"
        },
        {
            "id": 28,
            "round": 7,
            "type": "individual",
            "player": "ฟลินน์",
            "color": "#00ff66"
        },
        {
            "id": 29,
            "round": 8,
            "type": "individual",
            "player": "ณคุณ",
            "color": "#00f0ff"
        },
        {
            "id": 30,
            "round": 8,
            "type": "individual",
            "player": "ตะวัน",
            "color": "#ff4b5c"
        },
        {
            "id": 31,
            "round": 8,
            "type": "individual",
            "player": "คิน",
            "color": "#ffd600"
        },
        {
            "id": 32,
            "round": 8,
            "type": "individual",
            "player": "ปุงปัง",
            "color": "#00ff66"
        },
        {
            "id": 33,
            "round": 9,
            "type": "individual",
            "player": "Glad",
            "color": "#00ff66"
        },
        {
            "id": 34,
            "round": 9,
            "type": "individual",
            "player": "ท้องฟ้า",
            "color": "#ff4b5c"
        },
        {
            "id": 35,
            "round": 9,
            "type": "individual",
            "player": "พรีมพรีม",
            "color": "#ffd600"
        },
        {
            "id": 36,
            "round": 9,
            "type": "individual",
            "player": "ลูกแก้ว",
            "color": "#ffd600"
        },
        {
            "id": 37,
            "round": 10,
            "type": "individual",
            "player": "อุ่นใจ",
            "color": "#00f0ff"
        },
        {
            "id": 38,
            "round": 10,
            "type": "individual",
            "player": "เอ็ดก้า",
            "color": "#00f0ff"
        },
        {
            "id": 39,
            "round": 10,
            "type": "individual",
            "player": "ปุณณ์",
            "color": "#ff4b5c"
        },
        {
            "id": 40,
            "round": 10,
            "type": "individual",
            "player": "ภัฅ",
            "color": "#00ff66"
        },
        {
            "id": 41,
            "round": 11,
            "type": "individual",
            "player": "ภูเขา",
            "color": "#00f0ff"
        },
        {
            "id": 42,
            "round": 11,
            "type": "individual",
            "player": "โปรดปราน",
            "color": "#00f0ff"
        },
        {
            "id": 43,
            "round": 11,
            "type": "individual",
            "player": "อะตอมW",
            "color": "#00f0ff"
        },
        {
            "id": 44,
            "round": 12,
            "type": "individual",
            "player": "TinTin",
            "color": "#ff4b5c"
        },
        {
            "id": 45,
            "round": 12,
            "type": "individual",
            "player": "ฟีนิกซ์",
            "color": "#ff4b5c"
        },
        {
            "id": 46,
            "round": 12,
            "type": "individual",
            "player": "แมนต้า",
            "color": "#ff4b5c"
        },
        {
            "id": 47,
            "round": 13,
            "type": "individual",
            "player": "ปราบ",
            "color": "#00f0ff"
        },
        {
            "id": 48,
            "round": 13,
            "type": "individual",
            "player": "ยูตะ",
            "color": "#ff4b5c"
        },
        {
            "id": 49,
            "round": 13,
            "type": "individual",
            "player": "อินเวสต์",
            "color": "#00f0ff"
        }
    ],
    "2": [
        {
            "id": 1,
            "round": 1,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "อะตอมW",
            "playerA2": "เอ็ดก้า",
            "playerB1": "แมนต้า",
            "playerB2": "ปุณณ์"
        },
        {
            "id": 2,
            "round": 2,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "ภูเขา",
            "playerA2": "โปรดปราน",
            "playerB1": "TinTin",
            "playerB2": "ฟีนิกซ์"
        },
        {
            "id": 3,
            "round": 3,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "กราฟิก",
            "playerA2": "อินเวสต์",
            "playerB1": "อคิณ",
            "playerB2": "พายุ"
        },
        {
            "id": 4,
            "round": 4,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "ลูกแก้ว",
            "playerA2": "ไบรท์",
            "playerB1": "ปราบ",
            "playerB2": "ณคุณ"
        },
        {
            "id": 5,
            "round": 5,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ดีเซล",
            "playerA2": "ใบบุญ",
            "playerB1": "ปุงปัง",
            "playerB2": "อาเหยียน"
        },
        {
            "id": 6,
            "round": 6,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "พรีมพรีม",
            "playerA2": "ภาคิน",
            "playerB1": "อุ่นใจ",
            "playerB2": "เชอริล"
        },
        {
            "id": 7,
            "round": 7,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ก้าว",
            "playerA2": "เซนต์",
            "playerB1": "ปุณณ์ W",
            "playerB2": "เลโก้"
        },
        {
            "id": 8,
            "round": 8,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "ภัฅ",
            "playerA2": "มีตังค์",
            "playerB1": "ยูตะ",
            "playerB2": "ภูผา"
        },
        {
            "id": 9,
            "round": 9,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "อิงอิง",
            "playerA2": "Cani",
            "playerB1": "กราฟิก",
            "playerB2": "อินเวสต์"
        },
        {
            "id": 10,
            "round": 10,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "ไทเป",
            "playerA2": "เท็นเท็น",
            "playerB1": "ตะวัน",
            "playerB2": "นาคิน"
        },
        {
            "id": 11,
            "round": 11,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "นาคินทร์",
            "playerA2": "ขอบคุณ",
            "playerB1": "พายุ",
            "playerB2": "ท้องฟ้า"
        },
        {
            "id": 12,
            "round": 12,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "ฟลินน์",
            "playerA2": "ฟรานส์",
            "playerB1": "อาร์ชี่",
            "playerB2": "ลอฟต์"
        },
        {
            "id": 13,
            "round": 13,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "จินดา",
            "playerA2": "คิน",
            "playerB1": "เชฟ",
            "playerB2": "Glad"
        }
    ],
    "3": [
        {
            "id": 1,
            "round": 1,
            "type": "fishing",
            "playerYellow": "อิงอิง",
            "playerGreen": "นาคินทร์",
            "playerBlue": "ไทเป",
            "playerRed": "ตะวัน"
        },
        {
            "id": 2,
            "round": 2,
            "type": "fishing",
            "playerYellow": "คิน",
            "playerGreen": "Glad",
            "playerBlue": "ณคุณ",
            "playerRed": "ภูผา"
        },
        {
            "id": 3,
            "round": 3,
            "type": "fishing",
            "playerYellow": "ดีเซล",
            "playerGreen": "ปุงปัง",
            "playerBlue": "อุ่นใจ",
            "playerRed": "อาร์ชี่"
        },
        {
            "id": 4,
            "round": 4,
            "type": "fishing",
            "playerYellow": "พรีมพรีม",
            "playerGreen": "ฟลินน์",
            "playerBlue": "ภูเขา",
            "playerRed": "TinTin"
        },
        {
            "id": 5,
            "round": 5,
            "type": "fishing",
            "playerYellow": "เซนต์",
            "playerGreen": "เลโก้",
            "playerBlue": "อินเวสต์",
            "playerRed": "ท้องฟ้า"
        },
        {
            "id": 6,
            "round": 6,
            "type": "fishing",
            "playerYellow": "ลูกแก้ว",
            "playerGreen": "ภัฅ",
            "playerBlue": "อะตอมW",
            "playerRed": "แมนต้า"
        },
        {
            "id": 7,
            "round": 7,
            "type": "fishing",
            "playerYellow": "Cani",
            "playerGreen": "ขอบคุณ",
            "playerBlue": "เท็นเท็น",
            "playerRed": "นาคิน"
        },
        {
            "id": 8,
            "round": 8,
            "type": "fishing",
            "playerYellow": "ภาคิน",
            "playerGreen": "ฟรานส์",
            "playerBlue": "โปรดปราน",
            "playerRed": "ฟีนิกซ์"
        },
        {
            "id": 9,
            "round": 9,
            "type": "fishing",
            "playerYellow": "ใบบุญ",
            "playerGreen": "อาเหยียน",
            "playerBlue": "เชอริล",
            "playerRed": "ลอฟต์"
        },
        {
            "id": 10,
            "round": 10,
            "type": "fishing",
            "playerYellow": "จินดา",
            "playerGreen": "เชฟ",
            "playerBlue": "ปราบ",
            "playerRed": "ยูตะ"
        },
        {
            "id": 11,
            "round": 11,
            "type": "fishing",
            "playerYellow": "ก้าว",
            "playerGreen": "ปุณณ์ W",
            "playerBlue": "กราฟิก",
            "playerRed": "อคิณ"
        },
        {
            "id": 12,
            "round": 12,
            "type": "fishing",
            "playerYellow": "ไบรท์",
            "playerGreen": "มีตังค์",
            "playerBlue": "เอ็ดก้า",
            "playerRed": "ปุณณ์"
        },
        {
            "id": 13,
            "round": 13,
            "type": "fishing",
            "playerYellow": "ก้าว",
            "playerGreen": "ปุณณ์ W",
            "playerBlue": "กราฟิก",
            "playerRed": "พายุ"
        }
    ],
    "4": [
        {
            "id": 1,
            "round": 1,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ปุณณ์ W",
            "playerA2": "ปุงปัง",
            "playerB1": "กราฟิก",
            "playerB2": "อุ่นใจ"
        },
        {
            "id": 2,
            "round": 2,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "พรีมพรีม",
            "playerA2": "ลูกแก้ว",
            "playerB1": "ฟลินน์",
            "playerB2": "ภัฅ"
        },
        {
            "id": 3,
            "round": 3,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "เซนต์",
            "playerA2": "ใบบุญ",
            "playerB1": "ท้องฟ้า",
            "playerB2": "ลอฟต์"
        },
        {
            "id": 4,
            "round": 4,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "จินดา",
            "playerA2": "อิงอิง",
            "playerB1": "ยูตะ",
            "playerB2": "ตะวัน"
        },
        {
            "id": 5,
            "round": 5,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "คิน",
            "playerA2": "Cani",
            "playerB1": "Glad",
            "playerB2": "ขอบคุณ"
        },
        {
            "id": 6,
            "round": 6,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "โปรดปราน",
            "playerA2": "เอ็ดก้า",
            "playerB1": "ฟีนิกซ์",
            "playerB2": "ปุณณ์"
        },
        {
            "id": 7,
            "round": 7,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "เชฟ",
            "playerA2": "นาคินทร์",
            "playerB1": "ปราบ",
            "playerB2": "ไทเป"
        },
        {
            "id": 8,
            "round": 8,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "ภูเขา",
            "playerA2": "อะตอมW",
            "playerB1": "TinTin",
            "playerB2": "แมนต้า"
        },
        {
            "id": 9,
            "round": 9,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "ก้าว",
            "playerA2": "ดีเซล",
            "playerB1": "พายุ",
            "playerB2": "อาร์ชี่"
        },
        {
            "id": 10,
            "round": 10,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ภาคิน",
            "playerA2": "ไบรท์",
            "playerB1": "ฟรานส์",
            "playerB2": "มีตังค์"
        },
        {
            "id": 11,
            "round": 11,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "เลโก้",
            "playerA2": "อาเหยียน",
            "playerB1": "อินเวสต์",
            "playerB2": "เชอริล"
        },
        {
            "id": 12,
            "round": 12,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "ณคุณ",
            "playerA2": "เท็นเท็น",
            "playerB1": "ภูผา",
            "playerB2": "นาคิน"
        },
        {
            "id": 13,
            "round": 13,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "อุ่นใจ",
            "playerA2": "เชอริล",
            "playerB1": "อคิณ",
            "playerB2": "ท้องฟ้า"
        }
    ]
};


const SUNDAY_BIG_MATCHES = {
    "1": [
        {
            "id": 1,
            "round": 1,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "Harry",
            "playerA2": "ลูว่า",
            "playerB1": "ซอจุน",
            "playerB2": "Onewon"
        },
        {
            "id": 2,
            "round": 2,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ทุน",
            "playerA2": "Prize",
            "playerB1": "ไตเติ้ล",
            "playerB2": "Cooper"
        },
        {
            "id": 3,
            "round": 3,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ต่อ",
            "playerA2": "ลิปตัล",
            "playerB1": "นนท์",
            "playerB2": "คีริน"
        },
        {
            "id": 4,
            "round": 4,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "แทค",
            "playerA2": "มรรค",
            "playerB1": "แพงตอง",
            "playerB2": "TottiWBB"
        },
        {
            "id": 5,
            "round": 5,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "โฟโต้",
            "playerA2": "Smart",
            "playerB1": "อันยา",
            "playerB2": "ดีโน่"
        },
        {
            "id": 6,
            "round": 6,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "พาย",
            "playerA2": "PV",
            "playerB1": "เฌอโม่",
            "playerB2": "โกฮัง"
        },
        {
            "id": 7,
            "round": 7,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "พังก้า",
            "playerA2": "แมค",
            "playerB1": "องศา",
            "playerB2": "พบ"
        },
        {
            "id": 8,
            "round": 8,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "ริชชี่",
            "playerA2": "โบนัส",
            "playerB1": "คามิน",
            "playerB2": "ปุ๊บปั๊บ"
        },
        {
            "id": 9,
            "round": 9,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "มิตตะ",
            "playerA2": "อัลฟา",
            "playerB1": "ทีเค",
            "playerB2": "ปอท่อ"
        },
        {
            "id": 10,
            "round": 10,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ตฤณ",
            "playerA2": "Gaspard",
            "playerB1": "มอนเน่",
            "playerB2": "เอิร์ท"
        },
        {
            "id": 11,
            "round": 11,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "ออสติน",
            "playerA2": "แทนเทน",
            "playerB1": "ลีโอ",
            "playerB2": "Smith"
        },
        {
            "id": 12,
            "round": 12,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "คิดถึง",
            "playerA2": "ซันจิ",
            "playerB1": "ภูดิน",
            "playerB2": "ออนเซน"
        }
    ],
    "2": [
        {
            "id": 1,
            "round": 1,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "โบนัส",
            "playerA2": "ซันจิ",
            "playerB1": "เฌอโม่",
            "playerB2": "มอนเน่"
        },
        {
            "id": 2,
            "round": 2,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "องศา",
            "playerA2": "อันยา",
            "playerB1": "ภูดิน",
            "playerB2": "คามิน"
        },
        {
            "id": 3,
            "round": 3,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "Gaspard",
            "playerA2": "PV",
            "playerB1": "ลีโอ",
            "playerB2": "ซออุน"
        },
        {
            "id": 4,
            "round": 4,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "คิดถึง",
            "playerA2": "ริชชี่",
            "playerB1": "คีริน",
            "playerB2": "Cooper"
        },
        {
            "id": 5,
            "round": 5,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ลูว่า",
            "playerA2": "แทนเทน",
            "playerB1": "ลิปตัล",
            "playerB2": "Prize"
        },
        {
            "id": 6,
            "round": 6,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ออสติน",
            "playerA2": "Harry",
            "playerB1": "ทุน",
            "playerB2": "ต่อ"
        },
        {
            "id": 7,
            "round": 7,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "มิตตะ",
            "playerA2": "แทค",
            "playerB1": "พาย",
            "playerB2": "ตฤณ"
        },
        {
            "id": 8,
            "round": 8,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00f0ff",
            "playerA1": "มรรค",
            "playerA2": "อัลฟา",
            "playerB1": "ไตเติ้ล",
            "playerB2": "นนท์"
        },
        {
            "id": 9,
            "round": 9,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "พังก้า",
            "playerA2": "โฟโต้",
            "playerB1": "Onewon",
            "playerB2": "Smith"
        },
        {
            "id": 10,
            "round": 10,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "ดีโน่",
            "playerA2": "พบ",
            "playerB1": "ปุ๊บปั๊บ",
            "playerB2": "ออนเซน"
        },
        {
            "id": 11,
            "round": 11,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#ff4b5c",
            "playerA1": "Smart",
            "playerA2": "แมค",
            "playerB1": "ทีเค",
            "playerB2": "แพงตอง"
        },
        {
            "id": 12,
            "round": 12,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "เอิร์ท",
            "playerA2": "โกฮัง",
            "playerB1": "TottiWBB",
            "playerB2": "ปอท่อ"
        }
    ],
    "3": [
        {
            "id": 1,
            "round": 1,
            "type": "fishing",
            "playerYellow": "ออสติน",
            "playerGreen": "ทุน",
            "playerBlue": "ไตเติ้ล",
            "playerRed": "ลีโอ"
        },
        {
            "id": 2,
            "round": 2,
            "type": "fishing",
            "playerYellow": "Harry",
            "playerGreen": "ต่อ",
            "playerBlue": "นนท์",
            "playerRed": "ซออุน"
        },
        {
            "id": 3,
            "round": 3,
            "type": "fishing",
            "playerYellow": "แทค",
            "playerGreen": "ตฤณ",
            "playerBlue": "มอนเน่",
            "playerRed": "แพงตอง"
        },
        {
            "id": 4,
            "round": 4,
            "type": "fishing",
            "playerYellow": "มิตตะ",
            "playerGreen": "พาย",
            "playerBlue": "เฌอโม่",
            "playerRed": "ทีเค"
        },
        {
            "id": 5,
            "round": 5,
            "type": "fishing",
            "playerYellow": "ซันจิ",
            "playerGreen": "แมค",
            "playerBlue": "พบ",
            "playerRed": "ออนเซน"
        },
        {
            "id": 6,
            "round": 6,
            "type": "fishing",
            "playerYellow": "โบนัส",
            "playerGreen": "Smart",
            "playerBlue": "ดีโน่",
            "playerRed": "ปุ๊บปั๊บ"
        },
        {
            "id": 7,
            "round": 7,
            "type": "fishing",
            "playerYellow": "ลูว่า",
            "playerGreen": "ลิปตัล",
            "playerBlue": "คีริน",
            "playerRed": "Onewon"
        },
        {
            "id": 8,
            "round": 8,
            "type": "fishing",
            "playerYellow": "คิดถึง",
            "playerGreen": "พังก้า",
            "playerBlue": "องศา",
            "playerRed": "ภูดิน"
        },
        {
            "id": 9,
            "round": 9,
            "type": "fishing",
            "playerYellow": "มรรค",
            "playerGreen": "Gaspard",
            "playerBlue": "เอิร์ท",
            "playerRed": "TottiWBB"
        },
        {
            "id": 10,
            "round": 10,
            "type": "fishing",
            "playerYellow": "อัลฟา",
            "playerGreen": "PV",
            "playerBlue": "โกฮัง",
            "playerRed": "ปอท่อ"
        },
        {
            "id": 11,
            "round": 11,
            "type": "fishing",
            "playerYellow": "ริชชี่",
            "playerGreen": "โฟโต้",
            "playerBlue": "อันยา",
            "playerRed": "คามิน"
        },
        {
            "id": 12,
            "round": 12,
            "type": "fishing",
            "playerYellow": "แทนเทน",
            "playerGreen": "Prize",
            "playerBlue": "Cooper",
            "playerRed": "Smith"
        }
    ],
    "4": [
        {
            "id": 1,
            "round": 1,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "มิตตะ",
            "playerA2": "มรรค",
            "playerB1": "ทีเค",
            "playerB2": "TottiWBB"
        },
        {
            "id": 2,
            "round": 2,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "ริชชี่",
            "playerA2": "ซันจิ",
            "playerB1": "โฟโต้",
            "playerB2": "แมค"
        },
        {
            "id": 3,
            "round": 3,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "คิดถึง",
            "playerA2": "โบนัส",
            "playerB1": "พังก้า",
            "playerB2": "Smart"
        },
        {
            "id": 4,
            "round": 4,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "Harry",
            "playerA2": "แทนเทน",
            "playerB1": "ซออุน",
            "playerB2": "Smith"
        },
        {
            "id": 5,
            "round": 5,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "มอนเน่",
            "playerA2": "โกฮัง",
            "playerB1": "แพงตอง",
            "playerB2": "ปอท่อ"
        },
        {
            "id": 6,
            "round": 6,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "อันยา",
            "playerA2": "พบ",
            "playerB1": "คามิน",
            "playerB2": "ออนเซน"
        },
        {
            "id": 7,
            "round": 7,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ต่อ",
            "playerA2": "Prize",
            "playerB1": "นนท์",
            "playerB2": "Cooper"
        },
        {
            "id": 8,
            "round": 8,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "พาย",
            "playerA2": "Gaspard",
            "playerB1": "เฌอโม่",
            "playerB2": "เอิร์ท"
        },
        {
            "id": 9,
            "round": 9,
            "type": "pole",
            "teamA": "#00f0ff",
            "teamB": "#ff4b5c",
            "playerA1": "องศา",
            "playerA2": "ดีโน่",
            "playerB1": "ภูดิน",
            "playerB2": "ปุ๊บปั๊บ"
        },
        {
            "id": 10,
            "round": 10,
            "type": "pole",
            "teamA": "#00ff66",
            "teamB": "#00f0ff",
            "playerA1": "ทุน",
            "playerA2": "ลิปตัล",
            "playerB1": "ไตเติ้ล",
            "playerB2": "คีริน"
        },
        {
            "id": 11,
            "round": 11,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#00ff66",
            "playerA1": "แทค",
            "playerA2": "อัลฟา",
            "playerB1": "ตฤณ",
            "playerB2": "PV"
        },
        {
            "id": 12,
            "round": 12,
            "type": "pole",
            "teamA": "#ffd600",
            "teamB": "#ff4b5c",
            "playerA1": "ออสติน",
            "playerA2": "ลูว่า",
            "playerB1": "ลีโอ",
            "playerB2": "Onewon"
        }
    ]
};


const COLOR_SUGGESTIONS = {
    'saturday': {
        '#00f0ff': ['ดาวา', 'อันดา', 'อายซิลต์', 'เจเจ', 'เมทัล', 'เมิ้นท์'],
        '#ff4b5c': ['กัน', 'ข้าวปั้น', 'เรสซิ่ง', 'ปกป้อง2', 'กรรณ', 'ไดโน่', 'ธีร์']
    },
    'sunday_small': {
        '#ffd600': ['ก้าว', 'เซนต์', 'ดีเซล', 'ใบบุญ', 'จินดา', 'คิน', 'อิงอิง', 'Cani', 'พรีมพรีม', 'ภาคิน', 'ลูกแก้ว', 'ไบรท์'],
        '#00ff66': ['ปุณณ์ W', 'เลโก้', 'ปุงปัง', 'อาเหยียน', 'เชฟ', 'Glad', 'นาคินทร์', 'ขอบคุณ', 'ฟลินน์', 'ฟรานส์', 'ภัฅ', 'มีตังค์'],
        '#00f0ff': ['กราฟิก', 'อินเวสต์', 'อุ่นใจ', 'เชอริล', 'ปราบ', 'ณคุณ', 'ไทเป', 'เท็นเท็น', 'ภูเขา', 'โปรดปราน', 'อะตอมW', 'เอ็ดก้า'],
        '#ff4b5c': ['พายุ', 'ท้องฟ้า', 'อาร์ชี่', 'ลอฟต์', 'ยูตะ', 'ภูผา', 'ตะวัน', 'นาคิน', 'TinTin', 'ฟีนิกซ์', 'แมนต้า', 'ปุณณ์', 'อคิณ']
    },
    sunday_big: {
        '#ffd600': ['ออสติน', 'Harry', 'ลูว่า', 'แทนเทน', 'มิตตะ', 'แทค', 'มรรค', 'อัลฟา', 'คิดถึง', 'ริชชี่', 'โบนัส', 'ซันจิ'],

        '#00ff66': ['ทุน', 'ต่อ', 'ลิปตัล', 'Prize', 'พาย', 'ตฤณ', 'Gaspard', 'PV', 'พังก้า', 'โฟโต้', 'Smart', 'แมค'],

        '#00f0ff': ['ไตเติ้ล', 'นนท์', 'คีริน', 'Cooper', 'เฌอโม่', 'มอนเน่', 'เอิร์ท', 'โกฮัง', 'องศา', 'อันยา', 'ดีโน่', 'พบ'],

        '#ff4b5c': ['ลีโอ', 'ซออุน', 'Onewon', 'Smith', 'ทีเค', 'แพงตอง', 'TottiWBB', 'ปอท่อ', 'ภูดิน', 'คามิน', 'ปุ๊บปั๊บ', 'ออนเซน']
    },
};

function updatePlayerNameDropdown(selectedValue = null) {
    const select = DOM.playerNameInput;
    if (!select) return;
    
    const hex = state.selectedColor;
    const cat = state.activeCategory || 'saturday';
    const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][hex]) || [];
    
    // Clear current options except placeholder
    select.innerHTML = '<option value="" disabled selected>-- เลือกชื่อน้อง --</option>';
    
    // Populate dropdown
    list.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    
    // Add custom value if editing and it's not in default suggestions list
    if (selectedValue && !list.includes(selectedValue)) {
        const opt = document.createElement('option');
        opt.value = selectedValue;
        opt.textContent = selectedValue;
        select.appendChild(opt);
    }
    
    if (selectedValue) {
        select.value = selectedValue;
    } else {
        select.value = "";
    }
}

// Delete Player Record
function deletePlayer(id) {
    state.scores[state.activeGame] = state.scores[state.activeGame].filter(p => p.id !== id);
    saveData();
    
    // If deleted player or match was currently being edited, reset form
    if (state.editId === id) {
        exitEditMode();
    }
    
    renderStats();
    renderLeaderboard();
}

// Clear Scoreboard Data for Active Game
function clearActiveGameScores() {
    state.scores[state.activeGame] = [];
    saveData();
    exitEditMode();
    syncClearToGoogleSheet(state.activeGame);
    renderStats();
    renderLeaderboard();
}

// Render Stats Header Panel
function renderStats() {
    const activeScores = state.scores[state.activeGame] || [];
    const totalPlayersLabel = document.getElementById('stat-total-players-label');
    const highScoreLabel = document.getElementById('stat-high-score-label');
    
    const isMatchupGame = checkIfMatchupGame(state.activeGame, state.activeCategory);
    const isFishingGame = checkIfFishingGame(state.activeGame, state.activeCategory);
    const isPoleGame = checkIfPoleGame(state.activeGame, state.activeCategory);
    
    const isPP4Way = checkIfPickPlace4Way(state.activeGame, state.activeCategory);
    if (isFishingGame) {
        if (totalPlayersLabel) totalPlayersLabel.textContent = 'รอบทั้งหมด';
        if (highScoreLabel) highScoreLabel.textContent = 'ปลาทั้งหมด (ตัว)';
        
        let totalRounds = activeScores.length;
        let totalFish = 0;
        activeScores.forEach(round => {
            totalFish += (round.fishBlue || 0) + (round.fishGreen || 0) + (round.fishYellow || 0) + (round.fishRed || 0);
        });
        
        DOM.statTotalPlayers.textContent = totalRounds;
        DOM.statHighScore.textContent = formatNumber(totalFish);
    } else if (isPP4Way) {
        if (totalPlayersLabel) totalPlayersLabel.textContent = 'รอบทั้งหมด';
        if (highScoreLabel) highScoreLabel.textContent = 'น้ำหนักรวม (กก.)';
        
        let totalRounds = activeScores.length;
        let totalWeight = 0;
        activeScores.forEach(round => {
            totalWeight += (round.weightBlue || 0) + (round.weightGreen || 0) + (round.weightYellow || 0) + (round.weightRed || 0);
        });
        
        DOM.statTotalPlayers.textContent = totalRounds;
        DOM.statHighScore.textContent = formatNumber(totalWeight);
    } else if (isMatchupGame || isPoleGame) {
        if (totalPlayersLabel) totalPlayersLabel.textContent = 'แมตช์ทั้งหมด';
        if (highScoreLabel) highScoreLabel.textContent = 'คะแนนนำสูงสุด';
        
        const teamTotals = {};
        activeScores.forEach(item => {
            if (item.teamA) teamTotals[item.teamA] = (teamTotals[item.teamA] || 0) + (item.scoreA || 0);
            if (item.teamB) teamTotals[item.teamB] = (teamTotals[item.teamB] || 0) + (item.scoreB || 0);
        });
        const maxTeamScore = Math.max(0, ...Object.values(teamTotals));
        
        DOM.statTotalPlayers.textContent = activeScores.length;
        DOM.statHighScore.textContent = formatNumber(maxTeamScore);
    } else {
        if (totalPlayersLabel) totalPlayersLabel.textContent = 'ผู้เล่นทั้งหมด';
        if (highScoreLabel) highScoreLabel.textContent = 'คะแนนสูงสุด';
        
        let totalPlayers = activeScores.length;
        let maxScore = 0;
        if (activeScores.length > 0) {
            maxScore = Math.max(...activeScores.map(p => p.score));
        }
        
        DOM.statTotalPlayers.textContent = totalPlayers;
        DOM.statHighScore.textContent = formatNumber(maxScore);
    }
}

// Render Leaderboard & Chart Columns
function renderLeaderboard() {
    const allScores = state.scores[state.activeGame] || [];
    const searchQuery = DOM.searchInput.value.toLowerCase().trim();
    
    const panelTitle = document.querySelector('#leaderboard-panel .panel-title');
    const panelSubtitle = document.querySelector('#leaderboard-panel .panel-subtitle');

    if (state.activeCategory === 'sunday_small' || state.activeCategory === 'sunday_big') {
        if (panelTitle) {
            panelTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                ตารางจับคู่การแข่งขัน (Matches)
            `;
        }
        if (panelSubtitle) {
            panelSubtitle.textContent = 'ตารางประกบคู่และบันทึกผลแยกตามคู่แข่งขัน';
        }
        DOM.chartSection.style.display = 'none';
        
        renderSundaySmallMatches(allScores, searchQuery);
        return;
    } else {
        if (panelTitle) {
            panelTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
                ตารางอันดับคะแนน (Leaderboard)
            `;
        }
        if (panelSubtitle) {
            panelSubtitle.textContent = 'เรียงลำดับคะแนนจากมากไปน้อยแบบเรียลไทม์';
        }
    }

    const isMatchupGame = checkIfMatchupGame(state.activeGame, state.activeCategory);
    const isFishingGame = checkIfFishingGame(state.activeGame, state.activeCategory);
    const isPoleGame = checkIfPoleGame(state.activeGame, state.activeCategory);
    
    // --- Pole Fighting / Hockey อาทิตย์ leaderboard ---
    if (isPoleGame) {
        const sorted = [...allScores].sort((a, b) => b.timestamp - a.timestamp);
        const filtered = sorted.filter(item => {
            if (!searchQuery) return true;
            const aStr = [HEX_TO_NAME[item.teamA], HEX_TO_NAME[item.teamB], item.playerA1, item.playerA2, item.playerB1, item.playerB2].join(' ').toLowerCase();
            return aStr.includes(searchQuery);
        });
        DOM.leaderboardList.innerHTML = '';
        if (filtered.length === 0) {
            const emptyMsg = searchQuery ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูล ' + getActiveGameName(state.activeGame);
            DOM.leaderboardList.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg><p style="font-weight:500;font-size:1.1rem;margin-top:0.5rem;">${emptyMsg}</p></div>`;
            DOM.chartSection.style.display = 'none';
            return;
        }
        DOM.chartSection.style.display = 'flex';
        filtered.forEach(pole => {
            const matchIdx = sorted.length - sorted.findIndex(m => m.id === pole.id);
            const card = document.createElement('div');
            card.className = 'player-card match-card';
            const nameA = HEX_TO_NAME[pole.teamA], nameB = HEX_TO_NAME[pole.teamB];
            const isWinA = pole.winner === 'A';
            const pA = [pole.playerA1, pole.playerA2].filter(Boolean).join(', ') || '-';
            const pB = [pole.playerB1, pole.playerB2].filter(Boolean).join(', ') || '-';
            card.innerHTML = `
                <div class="rank-badge" style="font-size:0.85rem;width:auto;padding:0 0.5rem;background:rgba(255,255,255,0.03);color:var(--text-secondary);">คู่ที่ ${matchIdx}</div>
                <div class="player-name" style="display:flex;flex-direction:column;gap:0.25rem;overflow:visible;width:100%;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                        <span style="color:${pole.teamA};font-weight:${isWinA ? '800' : '400'};">${isWinA ? '🏆 ' : ''}ทีมสี${nameA}</span>
                        <span style="color:var(--text-muted);font-size:0.8rem;">[${escapeHTML(pA)}]</span>
                        <span style="color:var(--text-muted);font-size:0.8rem;">VS</span>
                        <span style="color:${pole.teamB};font-weight:${!isWinA ? '800' : '400'};">${!isWinA ? '🏆 ' : ''}ทีมสี${nameB}</span>
                        <span style="color:var(--text-muted);font-size:0.8rem;">[${escapeHTML(pB)}]</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="icon-btn btn-edit" title="แก้ไข" data-id="${pole.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="icon-btn btn-delete" title="ลบ" data-id="${pole.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>`;
            card.querySelector('.btn-edit').addEventListener('click', () => enterPoleEditMode(pole));
            card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(pole.id));
            DOM.leaderboardList.appendChild(card);
        });
        const poleTotals = {};
        allScores.forEach(p => {
            if (p.teamA) poleTotals[p.teamA] = (poleTotals[p.teamA] || 0) + (p.scoreA || 0);
            if (p.teamB) poleTotals[p.teamB] = (poleTotals[p.teamB] || 0) + (p.scoreB || 0);
        });
        renderChart(Object.keys(poleTotals).map(hex => ({ name: `ทีมสี${HEX_TO_NAME[hex]}`, color: hex, score: poleTotals[hex] })).sort((a,b) => b.score - a.score));
        return;
    }
    
    if (isFishingGame) {
        const sorted = [...allScores].sort((a, b) => b.timestamp - a.timestamp);
        const filtered = sorted.filter(round => {
            if (!searchQuery) return true;
            const roundIndex = sorted.length - sorted.findIndex(r => r.id === round.id);
            return `รอบที่ ${roundIndex}`.includes(searchQuery);
        });
        
        DOM.leaderboardList.innerHTML = '';
        
        if (filtered.length === 0) {
            const emptyMsg = searchQuery ? 'ไม่พบรอบการแข่งขันที่ค้นหา' : 'ยังไม่มีข้อมูลการตกปลาเกมนี้';
            DOM.leaderboardList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                    </svg>
                    <p style="font-weight: 500; font-size: 1.1rem; margin-top: 0.5rem;">${emptyMsg}</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">กรอกจำนวนปลาด้านซ้ายเพื่อเพิ่มข้อมูลรอบ</p>
                </div>
            `;
            DOM.chartSection.style.display = 'none';
            return;
        }
        
        DOM.chartSection.style.display = 'flex';
        
        filtered.forEach((round) => {
            const roundIndex = sorted.length - sorted.findIndex(r => r.id === round.id);
            const card = document.createElement('div');
            card.className = 'player-card match-card';
            card.style.gridTemplateColumns = '80px 1fr 80px';
            
            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.9rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">รอบที่ ${roundIndex}</div>
                <div class="player-name" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.8rem; overflow: visible; font-size: 0.95rem; width: 100%;">
                    <span style="color: #ffd600; font-weight: 600;">🟡 ${round.nameYellow || '-'}: ${round.fishYellow || 0} ตัว (${round.scoreYellow || 0})</span>
                    <span style="color: #00ff66; font-weight: 600;">🟢 ${round.nameGreen || '-'}: ${round.fishGreen || 0} ตัว (${round.scoreGreen || 0})</span>
                    <span style="color: #00f0ff; font-weight: 600;">🔵 ${round.nameBlue || '-'}: ${round.fishBlue || 0} ตัว (${round.scoreBlue || 0})</span>
                    <span style="color: #ff4b5c; font-weight: 600;">🔴 ${round.nameRed || '-'}: ${round.fishRed || 0} ตัว (${round.scoreRed || 0})</span>
                </div>
                <div class="card-actions">
                    <button class="icon-btn btn-edit" title="แก้ไขผลรอบ" data-id="${round.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${round.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            `;
            
            card.querySelector('.btn-edit').addEventListener('click', () => enterFishingEditMode(round));
            card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(round.id));
            
            DOM.leaderboardList.appendChild(card);
        });
        
        // Render comparison chart for Fishing
        const fishingTotals = {
            '#ffd600': 0, '#00ff66': 0, '#00f0ff': 0, '#ff4b5c': 0
        };
        allScores.forEach(round => {
            fishingTotals['#ffd600'] += round.scoreYellow || 0;
            fishingTotals['#00ff66'] += round.scoreGreen || 0;
            fishingTotals['#00f0ff'] += round.scoreBlue || 0;
            fishingTotals['#ff4b5c'] += round.scoreRed || 0;
        });
        const sortedFishingTotals = Object.keys(fishingTotals).map(hex => ({
            name: `ทีมสี${HEX_TO_NAME[hex]}`,
            color: hex,
            score: fishingTotals[hex]
        })).sort((a, b) => b.score - a.score);
        
        renderChart(sortedFishingTotals);
        return;
    }
    
    if (isMatchupGame) {
        // Sort matches: Timestamp Descending
        const sorted = [...allScores].sort((a, b) => b.timestamp - a.timestamp);
        
        // Filter matching names/colors
        const filtered = sorted.filter(match => {
            if (!searchQuery) return true;
            const nameA = HEX_TO_NAME[match.teamA] || '';
            const nameB = HEX_TO_NAME[match.teamB] || '';
            return nameA.toLowerCase().includes(searchQuery) || nameB.toLowerCase().includes(searchQuery);
        });
        
        DOM.leaderboardList.innerHTML = '';
        
        if (filtered.length === 0) {
            const emptyMsg = searchQuery ? 'ไม่พบข้อมูลการแข่งขันที่ค้นหา' : 'ยังไม่มีข้อมูลการแข่งขันเกมนี้';
            DOM.leaderboardList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                    </svg>
                    <p style="font-weight: 500; font-size: 1.1rem; margin-top: 0.5rem;">${emptyMsg}</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">เลือกประกบคู่แข่งขันด้านซ้ายเพื่อเพิ่มข้อมูล</p>
                </div>
            `;
            DOM.chartSection.style.display = 'none';
            return;
        }
        
        DOM.chartSection.style.display = 'flex';
        
        filtered.forEach((match, idx) => {
            const matchIndex = sorted.length - sorted.findIndex(m => m.id === match.id);
            const card = document.createElement('div');
            card.className = 'player-card match-card';
            card.style.gridTemplateColumns = '80px 1fr 80px';
            
            const nameA = HEX_TO_NAME[match.teamA];
            const nameB = HEX_TO_NAME[match.teamB];
            
            const currentGameName = getActiveGameName(state.activeGame);
            const isHockeyMatchup = currentGameName === 'Hockey';
            const suffixText = isHockeyMatchup ? " แต้ม" : " กก.";
            const suffixLabel = isHockeyMatchup ? "แต้ม" : "น้ำหนัก";
            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.9rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">คู่ที่ ${matchIndex}</div>
                <div class="player-name" style="display: flex; align-items: center; gap: 0.6rem; overflow: visible; font-size: 1.05rem; width: 100%;">
                    <span style="color: ${match.teamA}; font-weight: ${match.winner === 'A' ? '800' : '400'}; text-shadow: ${match.winner === 'A' ? '0 0 8px ' + match.teamA + '80' : 'none'}">
                        ${match.winner === 'A' ? '🏆 ' : ''}ทีมสี${nameA}${match.playerA ? ` <span style="font-size:0.8rem;opacity:0.75">[${escapeHTML(match.playerA)}]</span>` : ''}${(match.weightA !== undefined && match.weightA !== '' && match.weightA !== 0) ? ` <span style="font-size:0.8rem;opacity:0.7">(${suffixLabel}: ${match.weightA}${suffixText})</span>` : ''}
                    </span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">VS</span>
                    <span style="color: ${match.teamB}; font-weight: ${match.winner === 'B' ? '800' : '400'}; text-shadow: ${match.winner === 'B' ? '0 0 8px ' + match.teamB + '80' : 'none'}">
                        ${match.winner === 'B' ? '🏆 ' : ''}ทีมสี${nameB}${match.playerB ? ` <span style="font-size:0.8rem;opacity:0.75">[${escapeHTML(match.playerB)}]</span>` : ''}${(match.weightB !== undefined && match.weightB !== '' && match.weightB !== 0) ? ` <span style="font-size:0.8rem;opacity:0.7">(${suffixLabel}: ${match.weightB}${suffixText})</span>` : ''}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="icon-btn btn-edit" title="แก้ไขผลแข่ง" data-id="${match.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${match.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            `;
            
            card.querySelector('.btn-edit').addEventListener('click', () => enterMatchEditMode(match));
            card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(match.id));
            
            DOM.leaderboardList.appendChild(card);
        });
        
        // Render matchup chart (Compare teams)
        const matchTotals = {};
        allScores.forEach(match => {
            if (match.teamA) matchTotals[match.teamA] = (matchTotals[match.teamA] || 0) + (match.scoreA || 0);
            if (match.teamB) matchTotals[match.teamB] = (matchTotals[match.teamB] || 0) + (match.scoreB || 0);
        });
        const sortedMatchTotals = Object.keys(matchTotals).map(hex => ({
            name: `ทีมสี${HEX_TO_NAME[hex]}`,
            color: hex,
            score: matchTotals[hex]
        })).sort((a, b) => b.score - a.score);
        
        renderChart(sortedMatchTotals);
        return;
    }

    // Sort scores: Score Descending, then Timestamp Ascending (so first in is higher rank)
    const sorted = [...allScores].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.timestamp - b.timestamp;
    });
    
    // Filter matching names
    const filtered = sorted.filter(p => p.name.toLowerCase().includes(searchQuery));
    
    // Clear list
    DOM.leaderboardList.innerHTML = '';
    
    if (filtered.length === 0) {
        // Render Empty State
        const emptyMsg = searchQuery ? 'ไม่พบข้อมูลผู้เล่นที่ค้นหา' : 'ยังไม่มีข้อมูลคะแนนเกมนี้';
        DOM.leaderboardList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                </svg>
                <p style="font-weight: 500; font-size: 1.1rem; margin-top: 0.5rem;">${emptyMsg}</p>
                <p style="font-size: 0.85rem; color: var(--text-muted);">กรอกคะแนนด้านซ้ายเพื่อเพิ่มข้อมูลผู้เล่น</p>
            </div>
        `;
        DOM.chartSection.style.display = 'none';
        return;
    }
    
    DOM.chartSection.style.display = 'flex';
    
    // Render Table Card Rows
    filtered.forEach((player, idx) => {
        // Original rank in sorted array (to keep rank absolute despite filtering)
        const rank = sorted.findIndex(p => p.id === player.id) + 1;
        
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        
        const gameName = getActiveGameName(state.activeGame);
        const isPickAndPlace = gameName === 'Pick and Place';
        const isHockey = gameName === 'Hockey';
        const isBowling = gameName === 'Bowling';
        const isSumoOrPole = gameName === 'Sumo' || gameName === 'Pole Fighting';
        
        let extra = '';
        if (isPickAndPlace) {
            extra = ` <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.5rem;">[${player.weight || 0} กก.]</span>`;
        } else if (isHockey) {
            extra = ` <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.5rem;">[${player.points || 0} แต้ม]</span>`;
        } else if (isSumoOrPole) {
            extra = player.score === 30 ? ' <span style="font-size: 0.8rem; color: #00ff66; margin-left: 0.5rem;">[ชนะ]</span>' : ' <span style="font-size: 0.8rem; color: #ff4b5c; margin-left: 0.5rem;">[แพ้]</span>';
        } else if (isBowling) {
            let hits = 0;
            if (player.score === 100) hits = 3;
            else if (player.score === 60) hits = 2;
            else if (player.score === 30) hits = 1;
            extra = ` <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.5rem;">[โดน: ${hits} อัน]</span>`;
        }

        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="rank-badge ${rankClass}">${rank}</div>
            <div class="color-dot" style="background-color: ${player.color}; box-shadow: 0 0 8px ${player.color}a0;"></div>
            <div class="player-name" title="${escapeHTML(player.name)}">${escapeHTML(player.name)}${extra}</div>
            <div class="player-score">${formatNumber(player.score)}</div>
            <div class="card-actions">
                <button class="icon-btn btn-edit" title="แก้ไขคะแนน" data-id="${player.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${player.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Actions hook
        card.querySelector('.btn-edit').addEventListener('click', () => enterEditMode(player));
        card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(player.id));
        
        DOM.leaderboardList.appendChild(card);
    });
    
    // Render Charts based on top sorted players
    renderChart(sorted);
}

// Render dynamic CSS Progress Bar Charts
function renderChart(sortedPlayers) {
    DOM.chartBarsList.innerHTML = '';
    
    if (sortedPlayers.length === 0) return;
    
    // Find highest score to set chart ratio base
    const maxScore = Math.max(...sortedPlayers.map(p => p.score));
    
    // Take top 8 players for visual cleanliness in charts
    const topPlayers = sortedPlayers.slice(0, 8);
    
    topPlayers.forEach(player => {
        // Calculate percentage width. Avoid division by zero
        const percentage = maxScore > 0 ? (player.score / maxScore) * 100 : 0;
        
        const chartRow = document.createElement('div');
        chartRow.className = 'chart-bar-row';
        chartRow.innerHTML = `
            <div class="chart-player-name" title="${escapeHTML(player.name)}">${escapeHTML(player.name)}</div>
            <div class="bar-track">
                <div class="bar-fill" style="width: 0%; background-color: ${player.color}; color: ${player.color};"></div>
            </div>
            <div class="chart-value">${formatNumber(player.score)}</div>
        `;
        
        DOM.chartBarsList.appendChild(chartRow);
        
        // Trigger CSS transition animation after rendering in DOM
        setTimeout(() => {
            const fill = chartRow.querySelector('.bar-fill');
            if (fill) fill.style.width = `${percentage}%`;
        }, 50);
    });
}

// Render the pre-configured match list for Sunday Small
function renderSundaySmallMatches(allScores, searchQuery) {
    const matchesSource = state.activeCategory === 'sunday_big' ? SUNDAY_BIG_MATCHES : SUNDAY_SMALL_MATCHES;
    const activeMatches = matchesSource[state.activeGame] || [];
    
    // Filter matches based on search query
    const filtered = activeMatches.filter(match => {
        if (!searchQuery) return true;
        if (match.type === 'individual') {
            return match.player.toLowerCase().includes(searchQuery);
        } else if (match.type === 'pole') {
            return [match.playerA1, match.playerA2, match.playerB1, match.playerB2].some(name => name && name.toLowerCase().includes(searchQuery));
        } else if (match.type === 'fishing') {
            return [match.playerYellow, match.playerGreen, match.playerBlue, match.playerRed].some(name => name && name.toLowerCase().includes(searchQuery));
        }
        return true;
    });

    DOM.leaderboardList.innerHTML = '';

    if (filtered.length === 0) {
        DOM.leaderboardList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                </svg>
                <p style="font-weight: 500; font-size: 1.1rem; margin-top: 0.5rem;">ไม่พบชื่อผู้เล่นในตารางประกบคู่</p>
            </div>
        `;
        return;
    }

    if (state.activeGame === "1" && state.activeCategory === 'sunday_small') {
        // Group Game 1 (Bowling/Pick & Place, individual) by round (1 to 12 or 13)
        const totalRounds = state.activeCategory === 'sunday_big' ? 12 : 13;
        const matchesByRound = {};
        for (let r = 1; r <= totalRounds; r++) {
            matchesByRound[r] = [];
        }
        filtered.forEach(match => {
            const r = match.round || 1;
            if (!matchesByRound[r]) matchesByRound[r] = [];
            matchesByRound[r].push(match);
        });

        for (let r = 1; r <= totalRounds; r++) {
            const roundMatches = matchesByRound[r];
            if (roundMatches.length === 0) continue; 

            const hasActiveInRound = roundMatches.some(m => state.activeMatchId === m.id.toString());
            
            const roundSection = document.createElement('div');
            roundSection.className = `round-section ${hasActiveInRound ? 'has-active-match' : ''}`;
            
            const header = document.createElement('div');
            header.className = 'round-header';
            header.innerHTML = `
                <div class="round-title">รอบที่ ${r}</div>
                <div class="round-player-count">ผู้เล่น ${roundMatches.length} คน</div>
                <span class="chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            `;
            
            const body = document.createElement('div');
            body.className = 'round-body';
            
            roundSection.appendChild(header);
            roundSection.appendChild(body);
            DOM.leaderboardList.appendChild(roundSection);

            header.addEventListener('click', () => {
                roundSection.classList.toggle('collapsed');
            });

            roundMatches.forEach(match => {
                const card = document.createElement('div');
                const isCurrentActive = state.activeMatchId === match.id.toString();
                card.className = `player-card match-card ${isCurrentActive ? 'active-match' : ''}`;
                
                let record = allScores.find(p => p.matchId === match.id.toString() || (!p.matchId && p.name === match.player));
                let isPlayed = !!record;

                if (isPlayed) card.classList.add('played-match');
                card.style.borderLeft = `4px solid ${match.color}`;
                
                const colorName = HEX_TO_NAME[match.color] || '';
                let extra = '';
                if (isPlayed) {
                    if (state.activeCategory === 'sunday_big') {
                        const winLabel = record.result === 'win' ? 'ชนะ' : 'แพ้';
                        extra = `[${winLabel}] [น้ำหนัก: ${record.weight || 0} กก.]`;
                    } else {
                        if (record.score === 100) extra = '[โดน 3 อัน]';
                        else if (record.score === 60) extra = '[โดน 2 อัน]';
                        else if (record.score === 30) extra = '[โดน 1 อัน]';
                        else extra = '[โดน 0 อัน]';
                    }
                }

                card.innerHTML = `
                    <div class="rank-badge" style="font-size: 0.85rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">คิวที่ ${match.id}</div>
                    <div class="player-name" style="display:flex; flex-direction:column; gap:0.2rem; width: 100%; overflow: visible; white-space: normal;">
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap: wrap;">
                            <span class="color-dot" style="background-color: ${match.color}; margin-right: 0; box-shadow: 0 0 6px ${match.color}a0;"></span>
                            <span style="font-weight: 700; font-size:1.05rem;">น้อง${escapeHTML(match.player)}</span>
                            <span style="color: var(--text-muted); font-size:0.8rem;">(ทีมสี${colorName})</span>
                        </div>
                        ${isPlayed ? `<div style="font-size:0.85rem; color:#00ff66; font-weight:600; text-shadow:0 0 8px #00ff6640;">คะแนน: ${formatNumber(record.score)} แต้ม ${extra}</div>` : '<div style="font-size:0.85rem; color:var(--text-muted);">สถานะ: ยังไม่ได้แข่ง</div>'}
                    </div>
                    <div class="card-actions">
                        ${isPlayed ? `
                            <button class="icon-btn btn-edit" title="แก้ไขคะแนน" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        ` : `
                            <button class="btn-primary btn-play-match" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: var(--accent); color: #000; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px var(--accent-glow);">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                เริ่มแข่ง
                            </button>
                        `}
                    </div>
                `;

                if (isPlayed) {
                    card.querySelector('.btn-edit').addEventListener('click', (e) => {
                        e.stopPropagation();
                        enterEditMode(record);
                        state.activeMatchId = match.id.toString();
                        renderLeaderboard();
                    });
                    card.querySelector('.btn-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        deletePlayer(record.id);
                    });
                } else {
                    card.querySelector('.btn-play-match').addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectColorByHex(match.color);
                        DOM.playerNameInput.value = match.player;
                        state.activeMatchId = match.id.toString();
                        
                        document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
                            btn.classList.toggle('active', btn.getAttribute('data-hits') === '0');
                        });
                        const wBtn = document.getElementById('btn-result-win');
                        const lBtn = document.getElementById('btn-result-loss');
                        if (wBtn && lBtn) {
                            wBtn.classList.add('active');
                            lBtn.classList.remove('active');
                        }
                        DOM.playerScoreInput.value = '0';
                        
                        DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                        renderLeaderboard();
                        showToast(`เตรียมตัวคู่แข่งสำหรับ น้อง${match.player}`, "info");
                    });
                }

                body.appendChild(card);
            });
        }
        return;
    }

    filtered.forEach(match => {
        const card = document.createElement('div');
        const isCurrentActive = state.activeMatchId === match.id.toString();
        card.className = `player-card match-card ${isCurrentActive ? 'active-match' : ''}`;
        
        let record = null;
        let isPlayed = false;

        if (match.type === 'pole') {
            record = allScores.find(p => p.matchId === match.id.toString() || (!p.matchId && p.playerA1 === match.playerA1 && p.playerA2 === match.playerA2 && p.playerB1 === match.playerB1 && p.playerB2 === match.playerB2));
            isPlayed = !!record;

            if (isPlayed) card.classList.add('played-match');
            card.style.background = `linear-gradient(90deg, ${match.teamA}0d 0%, ${match.teamB}0d 100%)`;
            card.style.borderLeft = `4px solid ${match.teamA}`;
            card.style.borderRight = `4px solid ${match.teamB}`;

            const nameA = HEX_TO_NAME[match.teamA];
            const nameB = HEX_TO_NAME[match.teamB];
            const pA = [match.playerA1, match.playerA2].filter(Boolean).join(' + ');
            const pB = [match.playerB1, match.playerB2].filter(Boolean).join(' + ');

            let resultHTML = '';
            if (isPlayed) {
                const isWinA = record.winner === 'A';
                const winLabelA = isWinA ? '🏆 ชนะ' : 'แพ้';
                const winLabelB = !isWinA ? '🏆 ชนะ' : 'แพ้';
                resultHTML = `
                    <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; gap:1rem;">
                        <span style="color:${match.teamA}; font-weight:${isWinA ? '700' : 'normal'}">${winLabelA} (${record.scoreA} แต้ม)</span>
                        <span style="color:var(--text-muted)">|</span>
                        <span style="color:${match.teamB}; font-weight:${!isWinA ? '700' : 'normal'}">${winLabelB} (${record.scoreB} แต้ม)</span>
                    </div>
                `;
            } else {
                resultHTML = `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">สถานะ: ยังไม่ได้แข่ง</div>`;
            }

            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.85rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">คู่ที่ ${match.id}</div>
                <div class="player-name" style="display:flex; flex-direction:column; gap:0.1rem; width: 100%; overflow: visible; white-space: normal;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; font-size: 0.95rem;">
                        <span style="color:${match.teamA}; font-weight:600;">ทีมสี${nameA} [${escapeHTML(pA)}]</span>
                        <span style="color:var(--text-muted); font-size:0.8rem; font-weight:bold;">VS</span>
                        <span style="color:${match.teamB}; font-weight:600;">ทีมสี${nameB} [${escapeHTML(pB)}]</span>
                    </div>
                    ${resultHTML}
                </div>
                <div class="card-actions">
                    ${isPlayed ? `
                        <button class="icon-btn btn-edit" title="แก้ไขผลแข่ง" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    ` : `
                        <button class="btn-primary btn-play-match" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: var(--accent); color: #000; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px var(--accent-glow);">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            เริ่มแข่ง
                        </button>
                    `}
                </div>
            `;

            if (isPlayed) {
                card.querySelector('.btn-edit').addEventListener('click', () => {
                    enterPoleEditMode(record);
                    state.activeMatchId = match.id.toString();
                    renderLeaderboard();
                });
                card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(record.id));
            } else {
                card.querySelector('.btn-play-match').addEventListener('click', () => {
                    state.activeMatchId = match.id.toString();
                    state.pole.teamA = match.teamA;
                    state.pole.teamB = match.teamB;
                    state.pole.winner = 'A';
                    updatePoleFormUI();
                    
                    const selA1 = document.getElementById('pole-player-a1');
                    const selA2 = document.getElementById('pole-player-a2');
                    const selB1 = document.getElementById('pole-player-b1');
                    const selB2 = document.getElementById('pole-player-b2');
                    
                    if (selA1) selA1.value = match.playerA1;
                    if (selA2) selA2.value = match.playerA2;
                    if (selB1) selB1.value = match.playerB1;
                    if (selB2) selB2.value = match.playerB2;
                    
                    DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                    renderLeaderboard();
                    showToast(`เตรียมตัวคู่ที่ ${match.id}: สี${nameA} VS สี${nameB}`, "info");
                });
            }
        } 
        else if (match.type === 'fishing') {
            record = allScores.find(p => p.matchId === match.id.toString() || (!p.matchId && p.nameYellow === match.playerYellow && p.nameGreen === match.playerGreen && p.nameBlue === match.playerBlue && p.nameRed === match.playerRed));
            isPlayed = !!record;

            if (isPlayed) card.classList.add('played-match');
            card.style.background = `rgba(255, 255, 255, 0.01)`;
            card.style.borderLeft = `4px solid #ffd600`;

            const isPickPlace = getActiveGameName(state.activeGame) === 'Pick and Place';

            let resultHTML = '';
            if (isPlayed) {
                if (isPickPlace) {
                    const winLabelY = record.resultYellow === 'win' ? 'ชนะ' : 'แพ้';
                    const winLabelG = record.resultGreen === 'win' ? 'ชนะ' : 'แพ้';
                    const winLabelB = record.resultBlue === 'win' ? 'ชนะ' : 'แพ้';
                    const winLabelR = record.resultRed === 'win' ? 'ชนะ' : 'แพ้';
                    resultHTML = `
                        <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.5rem 0.8rem; overflow:visible;">
                            <span style="color: #ffd600; font-weight: 600;">🟡 ${escapeHTML(match.playerYellow)}: ${record.weightYellow} กก. [${winLabelY}] (${record.scoreYellow} แต้ม)</span>
                            <span style="color: #00ff66; font-weight: 600;">🟢 ${escapeHTML(match.playerGreen)}: ${record.weightGreen} กก. [${winLabelG}] (${record.scoreGreen} แต้ม)</span>
                            <span style="color: #00f0ff; font-weight: 600;">🔵 ${escapeHTML(match.playerBlue)}: ${record.weightBlue} กก. [${winLabelB}] (${record.scoreBlue} แต้ม)</span>
                            <span style="color: #ff4b5c; font-weight: 600;">🔴 ${escapeHTML(match.playerRed)}: ${record.weightRed} กก. [${winLabelR}] (${record.scoreRed} แต้ม)</span>
                        </div>
                    `;
                } else {
                    resultHTML = `
                        <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.5rem 0.8rem; overflow:visible;">
                            <span style="color: #ffd600; font-weight: 600;">🟡 ${escapeHTML(match.playerYellow)}: ${record.fishYellow} ตัว (${record.scoreYellow} แต้ม)</span>
                            <span style="color: #00ff66; font-weight: 600;">🟢 ${escapeHTML(match.playerGreen)}: ${record.fishGreen} ตัว (${record.scoreGreen} แต้ม)</span>
                            <span style="color: #00f0ff; font-weight: 600;">🔵 ${escapeHTML(match.playerBlue)}: ${record.fishBlue} ตัว (${record.scoreBlue} แต้ม)</span>
                            <span style="color: #ff4b5c; font-weight: 600;">🔴 ${escapeHTML(match.playerRed)}: ${record.fishRed} ตัว (${record.scoreRed} แต้ม)</span>
                        </div>
                    `;
                }
            } else {
                resultHTML = `
                    <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.5rem 0.8rem; overflow:visible;">
                        <span style="color: #ffd600; font-weight: 500;">🟡 ${escapeHTML(match.playerYellow)}</span>
                        <span style="color: #00ff66; font-weight: 500;">🟢 ${escapeHTML(match.playerGreen)}</span>
                        <span style="color: #00f0ff; font-weight: 500;">🔵 ${escapeHTML(match.playerBlue)}</span>
                        <span style="color: #ff4b5c; font-weight: 500;">🔴 ${escapeHTML(match.playerRed)}</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.85rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">รอบที่ ${match.id}</div>
                <div class="player-name" style="display:flex; flex-direction:column; gap:0.1rem; width: 100%; overflow: visible; white-space: normal;">
                    <div style="font-size: 0.95rem; font-weight:600;">${isPickPlace ? 'การแข่ง Pick & Place 4 สี' : 'การแข่งตกปลา 4 สี'}</div>
                    ${resultHTML}
                </div>
                <div class="card-actions">
                    ${isPlayed ? `
                        <button class="icon-btn btn-edit" title="แก้ไขคะแนน" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="icon-btn btn-delete" title="ลบข้อมูล" data-id="${record.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    ` : `
                        <button class="btn-primary btn-play-match" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: var(--accent); color: #000; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px var(--accent-glow);">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            เริ่มแข่ง
                        </button>
                    `}
                </div>
            `;

            if (isPlayed) {
                card.querySelector('.btn-edit').addEventListener('click', () => {
                    if (isPickPlace) {
                        enterPP4EditMode(record);
                    } else {
                        enterFishingEditMode(record);
                    }
                    state.activeMatchId = match.id.toString();
                    renderLeaderboard();
                });
                card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(record.id));
            } else {
                card.querySelector('.btn-play-match').addEventListener('click', () => {
                    state.activeMatchId = match.id.toString();
                    if (isPickPlace) {
                        updatePP4PlayerDropdowns();
                        
                        const selY = document.getElementById('pp4-player-yellow');
                        const selG = document.getElementById('pp4-player-green');
                        const selB = document.getElementById('pp4-player-blue');
                        const selR = document.getElementById('pp4-player-red');
                        
                        if (selY) selY.value = match.playerYellow;
                        if (selG) selG.value = match.playerGreen;
                        if (selB) selB.value = match.playerBlue;
                        if (selR) selR.value = match.playerRed;
                        
                        const wy = document.getElementById('pp4-weight-yellow');
                        const wg = document.getElementById('pp4-weight-green');
                        const wb = document.getElementById('pp4-weight-blue');
                        const wr = document.getElementById('pp4-weight-red');
                        if (wy) wy.value = '0';
                        if (wg) wg.value = '0';
                        if (wb) wb.value = '0';
                        if (wr) wr.value = '0';
                        
                        const colors = ['yellow', 'green', 'blue', 'red'];
                        colors.forEach(col => {
                            const winBtn = document.getElementById(`pp4-win-${col}`);
                            const lossBtn = document.getElementById(`pp4-loss-${col}`);
                            if (winBtn && lossBtn) {
                                winBtn.classList.add('active');
                                lossBtn.classList.remove('active');
                            }
                        });
                        
                        DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                        renderLeaderboard();
                        showToast(`เตรียมตัวแข่ง Pick & Place รอบที่ ${match.id}`, "info");
                    } else {
                        updateFishingPlayerDropdowns();
                        
                        const selY = document.getElementById('fishing-player-yellow');
                        const selG = document.getElementById('fishing-player-green');
                        const selB = document.getElementById('fishing-player-blue');
                        const selR = document.getElementById('fishing-player-red');
                        
                        if (selY) selY.value = match.playerYellow;
                        if (selG) selG.value = match.playerGreen;
                        if (selB) selB.value = match.playerBlue;
                        if (selR) selR.value = match.playerRed;
                        
                        const fb = document.getElementById('fishing-fish-blue');
                        const fg = document.getElementById('fishing-fish-green');
                        const fy = document.getElementById('fishing-fish-yellow');
                        const fr = document.getElementById('fishing-fish-red');
                        if (fb) fb.value = '0';
                        if (fg) fg.value = '0';
                        if (fy) fy.value = '0';
                        if (fr) fr.value = '0';
                        
                        document.getElementById('fishing-score-blue').textContent = '0 แต้ม';
                        document.getElementById('fishing-score-green').textContent = '0 แต้ม';
                        document.getElementById('fishing-score-yellow').textContent = '0 แต้ม';
                        document.getElementById('fishing-score-red').textContent = '0 แต้ม';
                        
                        DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                        renderLeaderboard();
                        showToast(`เตรียมตัวรอบตกปลาที่ ${match.id}`, "info");
                    }
                });
            }
        }
        DOM.leaderboardList.appendChild(card);
    });
}

// Generate & Download Score CSV file
function exportToCSV() {
    const allScores = state.scores[state.activeGame] || [];
    if (allScores.length === 0) {
        alert('ไม่มีข้อมูลคะแนนที่จะส่งออก');
        return;
    }
    
    const isMatchupGame = checkIfMatchupGame(state.activeGame, state.activeCategory);
    const isFishingGame = checkIfFishingGame(state.activeGame, state.activeCategory);
    const isPoleGame = checkIfPoleGame(state.activeGame, state.activeCategory);
    let csvContent = "";
    
    const isPP4Way = checkIfPickPlace4Way(state.activeGame, state.activeCategory);
    if (isFishingGame) {
        csvContent = "Round,Yellow,Yellow Score,Green,Green Score,Blue,Blue Score,Red,Red Score\n";
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((round, idx) => {
            csvContent += `รอบที่ ${idx + 1},${round.fishYellow || 0},${round.scoreYellow || 0},${round.fishGreen || 0},${round.scoreGreen || 0},${round.fishBlue || 0},${round.scoreBlue || 0},${round.fishRed || 0},${round.scoreRed || 0}\n`;
        });
    } else if (isPP4Way) {
        csvContent = "Round,Yellow,Yellow Weight,Yellow Result,Green,Green Weight,Green Result,Blue,Blue Weight,Blue Result,Red,Red Weight,Red Result\n";
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((round, idx) => {
            csvContent += `รอบที่ ${idx + 1},${round.nameYellow},${round.weightYellow},${round.resultYellow === 'win' ? 'ชนะ' : 'แพ้'},${round.nameGreen},${round.weightGreen},${round.resultGreen === 'win' ? 'ชนะ' : 'แพ้'},${round.nameBlue},${round.weightBlue},${round.resultBlue === 'win' ? 'ชนะ' : 'แพ้'},${round.nameRed},${round.weightRed},${round.resultRed === 'win' ? 'ชนะ' : 'แพ้'}\n`;
        });
    } else if (isPoleGame) {
        csvContent = "Match,Team A,Players A,Score A,Team B,Players B,Score B,Winner\n";
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((pole, idx) => {
            const nameA = HEX_TO_NAME[pole.teamA] || pole.teamA;
            const nameB = HEX_TO_NAME[pole.teamB] || pole.teamB;
            const pA = [pole.playerA1, pole.playerA2].filter(Boolean).join(' + ');
            const pB = [pole.playerB1, pole.playerB2].filter(Boolean).join(' + ');
            const winnerName = pole.winner === 'A' ? nameA : nameB;
            csvContent += `คู่ที่ ${idx + 1},สี${nameA},"${pA}",${pole.scoreA},สี${nameB},"${pB}",${pole.scoreB},สี${winnerName}\n`;
        });
    } else if (isMatchupGame) {
        let headerPoints = "Weight";
        if (getActiveGameName(state.activeGame) === "Hockey") headerPoints = "Points";
        
        csvContent = `Match,Team A,${headerPoints} A,Score A,Team B,${headerPoints} B,Score B,Winner\n`;
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((match, idx) => {
            const nameA = HEX_TO_NAME[match.teamA] || match.teamA;
            const nameB = HEX_TO_NAME[match.teamB] || match.teamB;
            const winnerName = match.winner === 'A' ? nameA : nameB;
            const valA = (match.weightA || 0);
            const valB = (match.weightB || 0);
            csvContent += `คู่ที่ ${idx + 1},สี${nameA},${valA},${match.scoreA},สี${nameB},${valB},${match.scoreB},สี${winnerName}\n`;
        });
    } else {
        csvContent = "Rank,Player Name,Score,ColorHex\n";
        const sorted = [...allScores].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timestamp - b.timestamp;
        });
        sorted.forEach((player, idx) => {
            let name = player.name;
            if (name.includes(',') || name.includes('"') || name.includes('\n')) {
                name = `"${name.replace(/"/g, '""')}"`;
            }
            csvContent += `${idx + 1},${name},${player.score},${player.color}\n`;
        });
    }
    
    // Download Blob using UTF-8 BOM so Excel opens Thai strings correctly
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileSuffix = getActiveGameName(state.activeGame).toLowerCase().replace(/\s+/g, '_');
    link.setAttribute("download", `scoreboard_${fileSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// XSS Sanitizer Helper
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Number formatter helper
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Toast Notification Toast Generator
function showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);
    
    // Remove toast after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 3500);
}

// Background sync to Google Sheet Web App script
function syncToGoogleSheet(game, name, score, color) {
    if (!state.sheetsUrl) return; // Do nothing if not connected
    
    showToast("กำลังส่งข้อมูลไปยัง Google Sheet...", "info");
    
    const categoryName = CATEGORY_NAMES[state.activeCategory] || "";
    
    // Append data parameters
    const params = new URLSearchParams({
        category: categoryName,
        game: game,
        name: name,
        score: score,
        color: color
    });
    
    // Call Google Apps Script Web App
    fetch(`${state.sheetsUrl}?${params.toString()}`, {
        method: 'POST',
        mode: 'no-cors'
    })
    .then(() => {
        showToast("บันทึกข้อมูลใน Google Sheet สำเร็จ!", "success");
    })
    .catch(err => {
        console.error("Sheets Sync Error:", err);
        showToast("ไม่สามารถส่งข้อมูลไปยัง Google Sheet ได้", "error");
    });
}

// Clear Scoreboard Data for All Games
function clearAllGamesScores() {
    resetScoresObject();
    saveData();
    exitEditMode();
    syncClearAllToGoogleSheet();
    renderStats();
    renderLeaderboard();
    showToast("ล้างข้อมูลคะแนนผู้เล่นรวมทั้งหมดเรียบร้อยแล้ว", "success");
}


// Sync clear action to Google Sheet
function syncClearToGoogleSheet(game) {
    if (!state.sheetsUrl) return;
    showToast("กำลังล้างข้อมูลใน Google Sheet...", "info");
    
    const categoryName = CATEGORY_NAMES[state.activeCategory] || "";
    
    const params = new URLSearchParams({
        category: categoryName,
        game: game,
        action: 'clear'
    });
    
    fetch(`${state.sheetsUrl}?${params.toString()}`, {
        method: 'POST',
        mode: 'no-cors'
    })
    .then(() => {
        showToast("ล้างข้อมูลใน Google Sheet สำเร็จ!", "success");
    })
    .catch(err => {
        console.error("Sheets Sync Error:", err);
        showToast("ไม่สามารถล้างข้อมูลใน Google Sheet ได้", "error");
    });
}

// Sync clear all action to Google Sheet
function syncClearAllToGoogleSheet() {
    if (!state.sheetsUrl) return;
    showToast("กำลังล้างข้อมูลทุกเกมใน Google Sheet...", "info");
    
    const categoryName = CATEGORY_NAMES[state.activeCategory] || "";
    
    const params = new URLSearchParams({
        category: categoryName,
        action: 'clearAll'
    });
    
    fetch(`${state.sheetsUrl}?${params.toString()}`, {
        method: 'POST',
        mode: 'no-cors'
    })
    .then(() => {
        showToast("ล้างข้อมูลทุกเกมใน Google Sheet สำเร็จ!", "success");
    })
    .catch(err => {
        console.error("Sheets Sync Error:", err);
        showToast("ไม่สามารถล้างข้อมูลทุกเกมใน Google Sheet ได้", "error");
    });
}

// Calculate accumulated scores for the colors across Game 1-4
function calculateColorTotals() {
    const totals = {
        '#00f0ff': 0, // น้ำเงิน
        '#ff4b5c': 0, // แดง
        '#ffd600': 0, // เหลือง
        '#00ff66': 0  // เขียว
    };
    for (let g = 1; g <= 4; g++) {
        const gameScores = state.scores[g.toString()] || [];
        const isMatchup = checkIfMatchupGame(g.toString(), state.activeCategory);
        const isPole = checkIfPoleGame(g.toString(), state.activeCategory);
        
        if (isMatchup || isPole) {
            gameScores.forEach(item => {
                if (totals[item.teamA] !== undefined) totals[item.teamA] += item.scoreA || 0;
                if (totals[item.teamB] !== undefined) totals[item.teamB] += item.scoreB || 0;
            });
        } else {
            gameScores.forEach(player => {
                if (player.isFishing || player.isPP4Way) {
                    totals['#00f0ff'] += player.scoreBlue || 0;
                    totals['#ff4b5c'] += player.scoreRed || 0;
                    totals['#ffd600'] += player.scoreYellow || 0;
                    totals['#00ff66'] += player.scoreGreen || 0;
                } else if (totals[player.color] !== undefined) {
                    totals[player.color] += player.score;
                }
            });
        }
    }
    
    return totals;
}

// Render the Standings Color Comparison Bars
function renderSummaryChart() {
    const totals = calculateColorTotals();
    const hexToName = {
        '#00f0ff': 'ทีมสีน้ำเงิน',
        '#ff4b5c': 'ทีมสีแดง',
        '#ffd600': 'ทีมสีเหลือง',
        '#00ff66': 'ทีมสีเขียว'
    };
    
    // วันเสาร์ใช้แค่ 2 สี / วันอาทิตย์ใช้ 4 สี
    const activeHexes = state.activeCategory === 'saturday'
        ? ['#00f0ff', '#ff4b5c']
        : ['#00f0ff', '#ff4b5c', '#ffd600', '#00ff66'];
    
    // Construct sorted array to find leading colors
    const sortedColors = activeHexes.map(hex => ({
        hex: hex,
        name: hexToName[hex] || 'ทีมสีนิรนาม',
        score: totals[hex]
    })).sort((a, b) => b.score - a.score);
    
    const maxScore = Math.max(...sortedColors.map(c => c.score));
    
    DOM.summaryChartContainer.innerHTML = '';
    
    sortedColors.forEach(color => {
        const percentage = maxScore > 0 ? (color.score / maxScore) * 100 : 0;
        
        const column = document.createElement('div');
        column.className = 'summary-chart-column';
        column.innerHTML = `
            <div class="summary-score-value" style="color: ${color.hex};">${formatNumber(color.score)}</div>
            <div class="summary-bar-track-vertical">
                <div class="summary-bar-fill-vertical" style="height: 0%; background-color: ${color.hex};"></div>
            </div>
            <div class="summary-color-label">
                <span class="summary-color-dot" style="background-color: ${color.hex}; box-shadow: 0 0 10px ${color.hex}a0;"></span>
                <span>${color.name}</span>
            </div>
        `;
        
        DOM.summaryChartContainer.appendChild(column);
        
        // Trigger height transition animation
        setTimeout(() => {
            const fill = column.querySelector('.summary-bar-fill-vertical');
            if (fill) fill.style.height = `${percentage}%`;
        }, 50);
    });
}

// Fullscreen Presentation Mode Toggle
function togglePresentationMode() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error("Error attempting to enable full-screen mode:", err);
            showToast("ไม่สามารถเปิดโหมดเต็มจอได้", "error");
        });
    } else {
        document.exitFullscreen();
    }
}



const GAME_NAMES = {
    'saturday': {
        '1': 'Pick and Place',
        '2': 'Hockey',
        '3': 'Sumo',
        '4': 'Pole Fighting'
    },
    'sunday_small': {
        '1': 'Bowling',
        '2': 'Hockey',
        '3': 'Fishing',
        '4': 'Pole Fighting'
    },
    'sunday_big': {
        '1': 'Pick and Place',
        '2': 'Hockey',
        '3': 'Fishing',
        '4': 'Pole Fighting'
    }
};

function getActiveGameName(gameNum) {
    const category = state.activeCategory || 'saturday';
    return (GAME_NAMES[category] && GAME_NAMES[category][gameNum]) || `Game ${gameNum}`;
}

function updateTabLabels() {
    const category = state.activeCategory || 'saturday';
    const names = GAME_NAMES[category] || GAME_NAMES['saturday'];
    
    const tabs = {
        '1': DOM.tabGame1,
        '2': DOM.tabGame2,
        '3': DOM.tabGame3,
        '4': DOM.tabGame4
    };
    
    Object.keys(tabs).forEach(num => {
        const tab = tabs[num];
        if (tab) {
            const svg = tab.querySelector('svg');
            tab.innerHTML = '';
            if (svg) {
                tab.appendChild(svg);
            }
            tab.appendChild(document.createTextNode(' ' + names[num]));
        }
    });
}

const CATEGORY_NAMES = {
    'saturday': 'วันเสาร์',
    'sunday_small': 'วันอาทิตย์ เด็กเล็ก',
    'sunday_big': 'วันอาทิตย์ เด็กโต'
};

function selectCategory(categoryKey) {
    state.activeCategory = categoryKey;
    
    updateColorMode();
    // Load scores for this category
    loadData();
    
    // Update Header Badge
    DOM.headerCategoryName.textContent = CATEGORY_NAMES[categoryKey] || categoryKey;
    
    // Update dynamic tab labels
    updateTabLabels();
    
    // Show/Hide Containers
    DOM.portalContainer.style.display = 'none';
    DOM.appContainer.style.display = 'flex';
    DOM.body.style.overflow = '';
    
    // Re-initialize Active Game
    setActiveGame("1");
}

function showPortal() {
    state.activeCategory = null;
    
    // Show/Hide Containers
    DOM.appContainer.style.display = 'none';
    DOM.portalContainer.style.display = 'flex';
    DOM.body.style.overflow = 'auto';
    
    // Exit edit mode if left open
    exitEditMode();
}

// Run app init
window.addEventListener('DOMContentLoaded', init);

function updateColorMode() {
    const isSaturday = state.activeCategory === 'saturday';

    document.querySelectorAll('[data-hex="#ffd600"], [data-hex="#00ff66"]')
        .forEach(btn => {
            btn.style.display = isSaturday ? 'none' : '';
        });
}
