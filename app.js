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
    }
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
    colorNameBtns: document.querySelectorAll('.color-name-btn'),
    formGameBtns: document.querySelectorAll('.form-game-btn'),
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
    nameSuggestions: document.getElementById('name-suggestions'),
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
            // Verify structure has all games
            for (let i = 1; i <= 4; i++) {
                if (!state.scores[i]) state.scores[i] = [];
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

    // Form Game Selector (4 buttons inside the form)
    DOM.formGameBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const gameNum = btn.getAttribute('data-game');
            DOM.formGameBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setActiveGame(gameNum); // also updates the top tab
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
            
            // Auto-focus and update suggestions if name input is empty
            if (!DOM.playerNameInput.value.trim()) {
                DOM.playerNameInput.focus();
            }
            renderNameSuggestions(DOM.playerNameInput.value);
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

    // Name suggestions input behavior
    DOM.playerNameInput.addEventListener('focus', () => {
        renderNameSuggestions(DOM.playerNameInput.value);
    });

    DOM.playerNameInput.addEventListener('input', () => {
        renderNameSuggestions(DOM.playerNameInput.value);
    });

    DOM.playerNameInput.addEventListener('keydown', (e) => {
        const items = DOM.nameSuggestions.querySelectorAll('.suggestion-item');
        if (DOM.nameSuggestions.style.display === 'none' || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length;
            updateActiveSuggestionHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + items.length) % items.length;
            updateActiveSuggestionHighlight(items);
        } else if (e.key === 'Enter') {
            if (state.activeSuggestionIndex >= 0 && state.activeSuggestionIndex < currentFilteredSuggestions.length) {
                e.preventDefault();
                selectSuggestion(currentFilteredSuggestions[state.activeSuggestionIndex]);
            }
        } else if (e.key === 'Escape') {
            hideNameSuggestions();
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!DOM.playerNameInput.contains(e.target) && !DOM.nameSuggestions.contains(e.target)) {
            hideNameSuggestions();
        }
    });

    // Export CSV
    DOM.exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // Clear Scores (Modal Triggers)
    DOM.clearDataBtn.addEventListener('click', () => {
        clearMode = 'active_game';
        DOM.dialogTitle.textContent = 'ล้างคะแนนเกมนี้?';
        DOM.dialogDesc.textContent = `คุณแน่ใจหรือไม่ว่าต้องการล้างคะแนนของผู้เล่นทั้งหมดใน Game ${state.activeGame}? ข้อมูลนี้ไม่สามารถกู้คืนได้`;
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

        // Sync form game buttons
        DOM.formGameBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-game') === gameNum);
        });

        // Toggle standard/matchup form fields
        const isMatchupGame = gameNum === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
        const isSmallKidsGame1 = gameNum === "1" && state.activeCategory === 'sunday_small';
        if (isMatchupGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'block';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `บันทึกผลการแข่งขันประกบคู่ใน Game 1`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกผลการแข่ง';
            updateMatchFormUI();
        } else {
            document.getElementById('standard-form-fields').style.display = 'block';
            document.getElementById('match-form-fields').style.display = 'none';
            DOM.playerNameInput.setAttribute('required', '');
            // Game 1 เด็กเล็ก: ปรับปุ่มเป็น ±10
            if (isSmallKidsGame1) {
                DOM.formPanelSubtitle.textContent = `กรอกคะแนน Game 1 เด็กเล็ก (ทีละ 10 คะแนน)`;
                DOM.scoreMinus5.textContent = '-10';
                DOM.scoreMinus5.title = 'ลด 10 คะแนน';
                DOM.scoreMinus1.textContent = '-10';
                DOM.scoreMinus1.title = 'ลด 10 คะแนน';
                DOM.scorePlus1.textContent = '+10';
                DOM.scorePlus1.title = 'เพิ่ม 10 คะแนน';
                DOM.scorePlus5.textContent = '+10';
                DOM.scorePlus5.title = 'เพิ่ม 10 คะแนน';
                // Override event listeners for ±10
                DOM.scoreMinus5._g1handler = () => adjustScoreInput(-10);
                DOM.scoreMinus1._g1handler = () => adjustScoreInput(-10);
                DOM.scorePlus1._g1handler = () => adjustScoreInput(10);
                DOM.scorePlus5._g1handler = () => adjustScoreInput(10);
                DOM.scoreMinus5.onclick = DOM.scoreMinus5._g1handler;
                DOM.scoreMinus1.onclick = DOM.scoreMinus1._g1handler;
                DOM.scorePlus1.onclick = DOM.scorePlus1._g1handler;
                DOM.scorePlus5.onclick = DOM.scorePlus5._g1handler;
            } else {
                DOM.formPanelSubtitle.textContent = `เพิ่มหรือแก้ไขข้อมูลใน Game ${gameNum}`;
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

// Color Selection Logic
const HEX_TO_NAME = {
    '#00f0ff': 'น้ำเงิน',
    '#00ff66': 'เขียว',
    '#ffd600': 'เหลือง',
    '#ff4b5c': 'แดง'
};

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
    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    const isSmallKidsGame1 = state.activeGame === "1" && state.activeCategory === 'sunday_small';
    if (isMatchupGame) {
        const teamA = state.match.teamA;
        const teamB = state.match.teamB;
        const winner = state.match.winner;
        const scoreA = winner === 'A' ? 30 : 10;
        const scoreB = winner === 'B' ? 30 : 10;
        const weightA = parseFloat(document.getElementById('match-weight-a').value) || 0;
        const weightB = parseFloat(document.getElementById('match-weight-b').value) || 0;
        
        if (state.editId !== null) {
            const index = state.scores["1"].findIndex(m => m.id === state.editId);
            if (index !== -1) {
                state.scores["1"][index].teamA = teamA;
                state.scores["1"][index].teamB = teamB;
                state.scores["1"][index].winner = winner;
                state.scores["1"][index].scoreA = scoreA;
                state.scores["1"][index].scoreB = scoreB;
                state.scores["1"][index].weightA = weightA;
                state.scores["1"][index].weightB = weightB;
                
                // Sync to sheets
                syncMatchToGoogleSheet(state.scores["1"][index]);
            }
        } else {
            const newMatch = {
                id: Date.now().toString(),
                teamA: teamA,
                teamB: teamB,
                winner: winner,
                scoreA: scoreA,
                scoreB: scoreB,
                weightA: weightA,
                weightB: weightB,
                timestamp: Date.now()
            };
            state.scores["1"].push(newMatch);
            
            // Sync to sheets
            syncMatchToGoogleSheet(newMatch);
        }
        
        saveData();
        exitEditMode();
        renderStats();
        renderLeaderboard();
        return;
    }

    const name = DOM.playerNameInput.value.trim();
    const score = parseInt(DOM.playerScoreInput.value) || 0;
    const color = state.selectedColor;
    
    if (!name) return;

    if (state.editId !== null) {
        // Edit Mode
        const gameScores = state.scores[state.activeGame];
        const index = gameScores.findIndex(p => p.id === state.editId);
        if (index !== -1) {
            gameScores[index].name = name;
            gameScores[index].score = score;
            gameScores[index].color = color;
        }
    } else {
        // Add Mode
        const newPlayer = {
            id: Date.now().toString(),
            name: name,
            score: score,
            color: color,
            timestamp: Date.now()
        };
        state.scores[state.activeGame].push(newPlayer);
    }
    
    saveData();
    
    // Sync to Google Sheet — send Thai color name instead of hex
    syncToGoogleSheet(state.activeGame, name, score, state.selectedColorName);
    
    exitEditMode();
    renderStats();
    renderLeaderboard();
}

// Edit Mode Entry & Exit
function enterEditMode(player) {
    state.editId = player.id;
    DOM.playerNameInput.value = player.name;
    DOM.playerScoreInput.value = player.score;
    
    // Sync UI Color buttons with player's color
    selectColorByHex(player.color);
    
    // UI state change
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
    
    // Scroll form into view if on mobile
    DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
}

function exitEditMode() {
    state.editId = null;
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

    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    const isSmallKidsGame1 = state.activeGame === "1" && state.activeCategory === 'sunday_small';
    if (isMatchupGame) {
        updateMatchFormUI();
    } else if (isSmallKidsGame1) {
        // Restore ±10 buttons for sunday_small Game 1
        DOM.scoreMinus5.textContent = '-10';
        DOM.scoreMinus1.textContent = '-10';
        DOM.scorePlus1.textContent = '+10';
        DOM.scorePlus5.textContent = '+10';
        DOM.scoreMinus5.onclick = () => adjustScoreInput(-10);
        DOM.scoreMinus1.onclick = () => adjustScoreInput(-10);
        DOM.scorePlus1.onclick = () => adjustScoreInput(10);
        DOM.scorePlus5.onclick = () => adjustScoreInput(10);
    } else {
        // Restore default ±1/±5 buttons
        DOM.scoreMinus5.textContent = '-5';
        DOM.scoreMinus1.textContent = '-1';
        DOM.scorePlus1.textContent = '+1';
        DOM.scorePlus5.textContent = '+5';
        DOM.scoreMinus5.onclick = null;
        DOM.scoreMinus1.onclick = null;
        DOM.scorePlus1.onclick = null;
        DOM.scorePlus5.onclick = null;
    }
    
    // Reset buttons
    DOM.submitBtn.classList.remove('btn-edit-mode');
    if (isMatchupGame) {
        DOM.submitBtn.querySelector('span').textContent = 'บันทึกผลการแข่ง';
    } else {
        DOM.submitBtn.querySelector('span').textContent = 'บันทึกคะแนน';
    }
    DOM.cancelEditBtn.style.display = 'none';
    
    hideNameSuggestions();
}

// Player Name Auto-Suggestions Logic (Separated by Category and Color Hex)
const COLOR_SUGGESTIONS = {
    'saturday': {
        '#00f0ff': Array.from({length: 10}, (_, i) => `วันเสาร์ น้ำเงิน - Test ${i + 1}`),
        '#00ff66': Array.from({length: 10}, (_, i) => `วันเสาร์ เขียว - Test ${i + 1}`),
        '#ffd600': Array.from({length: 10}, (_, i) => `วันเสาร์ เหลือง - Test ${i + 1}`),
        '#ff4b5c': Array.from({length: 10}, (_, i) => `วันเสาร์ แดง - Test ${i + 1}`)
    },
    'sunday_small': {
        '#00f0ff': Array.from({length: 10}, (_, i) => `เด็กเล็ก น้ำเงิน - Test ${i + 1}`),
        '#00ff66': Array.from({length: 10}, (_, i) => `เด็กเล็ก เขียว - Test ${i + 1}`),
        '#ffd600': Array.from({length: 10}, (_, i) => `เด็กเล็ก เหลือง - Test ${i + 1}`),
        '#ff4b5c': Array.from({length: 10}, (_, i) => `เด็กเล็ก แดง - Test ${i + 1}`)
    },
    'sunday_big': {
        '#00f0ff': Array.from({length: 10}, (_, i) => `เด็กโต น้ำเงิน - Test ${i + 1}`),
        '#00ff66': Array.from({length: 10}, (_, i) => `เด็กโต เขียว - Test ${i + 1}`),
        '#ffd600': Array.from({length: 10}, (_, i) => `เด็กโต เหลือง - Test ${i + 1}`),
        '#ff4b5c': Array.from({length: 10}, (_, i) => `เด็กโต แดง - Test ${i + 1}`)
    }
};

let currentFilteredSuggestions = [];

function renderNameSuggestions(filterText = '') {
    const hex = state.selectedColor;
    const cat = state.activeCategory || 'saturday';
    const list = (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat][hex]) || [];
    const query = filterText.toLowerCase().trim();
    
    currentFilteredSuggestions = list.filter(name => name.toLowerCase().includes(query));
    
    if (currentFilteredSuggestions.length === 0) {
        hideNameSuggestions();
        return;
    }
    
    DOM.nameSuggestions.innerHTML = '';
    state.activeSuggestionIndex = -1;
    
    currentFilteredSuggestions.forEach((name, idx) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = name;
        item.dataset.index = idx;
        
        item.addEventListener('click', () => {
            selectSuggestion(name);
        });
        
        DOM.nameSuggestions.appendChild(item);
    });
    
    DOM.nameSuggestions.style.display = 'flex';
}

function selectSuggestion(name) {
    DOM.playerNameInput.value = name;
    hideNameSuggestions();
    DOM.playerNameInput.dispatchEvent(new Event('input'));
}

function hideNameSuggestions() {
    if (DOM.nameSuggestions) {
        DOM.nameSuggestions.style.display = 'none';
    }
    state.activeSuggestionIndex = -1;
}

function updateActiveSuggestionHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === state.activeSuggestionIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

// Delete Player Record
function deletePlayer(id) {
    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    if (isMatchupGame) {
        state.scores["1"] = state.scores["1"].filter(m => m.id !== id);
    } else {
        state.scores[state.activeGame] = state.scores[state.activeGame].filter(p => p.id !== id);
    }
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
    
    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    // sunday_small Game 1 is standard (not matchup)
    if (isMatchupGame) {
        if (totalPlayersLabel) totalPlayersLabel.textContent = 'แมตช์ทั้งหมด';
        if (highScoreLabel) highScoreLabel.textContent = 'คะแนนนำสูงสุด';
        
        const game1Totals = {
            '#00f0ff': 0, '#00ff66': 0, '#ffd600': 0, '#ff4b5c': 0
        };
        activeScores.forEach(match => {
            game1Totals[match.teamA] += match.scoreA;
            game1Totals[match.teamB] += match.scoreB;
        });
        const maxTeamScore = Math.max(...Object.values(game1Totals));
        
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
    
    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    // sunday_small Game 1 is NOT matchup — use standard flow
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
            
            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.9rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">คู่ที่ ${matchIndex}</div>
                <div class="player-name" style="display: flex; align-items: center; gap: 0.6rem; overflow: visible; font-size: 1.05rem; width: 100%;">
                    <span style="color: ${match.teamA}; font-weight: ${match.winner === 'A' ? '800' : '400'}; text-shadow: ${match.winner === 'A' ? '0 0 8px ' + match.teamA + '80' : 'none'}">
                        ทีมสี${nameA} (${match.scoreA})${match.weightA ? ` [${match.weightA} กก.]` : ''}
                    </span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">VS</span>
                    <span style="color: ${match.teamB}; font-weight: ${match.winner === 'B' ? '800' : '400'}; text-shadow: ${match.winner === 'B' ? '0 0 8px ' + match.teamB + '80' : 'none'}">
                        ทีมสี${nameB} (${match.scoreB})${match.weightB ? ` [${match.weightB} กก.]` : ''}
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
        
        // Render Game 1 chart (Compare 4 teams)
        const game1Totals = {
            '#00f0ff': 0, '#00ff66': 0, '#ffd600': 0, '#ff4b5c': 0
        };
        allScores.forEach(match => {
            game1Totals[match.teamA] += match.scoreA;
            game1Totals[match.teamB] += match.scoreB;
        });
        const sortedGame1Totals = Object.keys(game1Totals).map(hex => ({
            name: `ทีมสี${HEX_TO_NAME[hex]}`,
            color: hex,
            score: game1Totals[hex]
        })).sort((a, b) => b.score - a.score);
        
        renderChart(sortedGame1Totals);
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
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="rank-badge ${rankClass}">${rank}</div>
            <div class="color-dot" style="background-color: ${player.color}; box-shadow: 0 0 8px ${player.color}a0;"></div>
            <div class="player-name" title="${escapeHTML(player.name)}">${escapeHTML(player.name)}</div>
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

// Generate & Download Score CSV file
function exportToCSV() {
    const allScores = state.scores[state.activeGame] || [];
    if (allScores.length === 0) {
        alert('ไม่มีข้อมูลคะแนนที่จะส่งออก');
        return;
    }
    
    let csvContent = "";
    const isMatchupGame = state.activeGame === "1" && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
    // sunday_small Game 1 is standard
    if (isMatchupGame) {
        csvContent = "Match No,Team 1,Weight 1,Score 1,Team 2,Weight 2,Score 2,Winner\n";
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((match, idx) => {
            const nameA = HEX_TO_NAME[match.teamA];
            const nameB = HEX_TO_NAME[match.teamB];
            const winnerName = match.winner === 'A' ? nameA : nameB;
            csvContent += `${idx + 1},ทีมสี${nameA},${match.weightA || 0},${match.scoreA},ทีมสี${nameB},${match.weightB || 0},${match.scoreB},ทีมสี${winnerName}\n`;
        });
    } else {
        // Headers
        csvContent = "Rank,Player Name,Score,ColorHex\n";
        
        // Sort descending
        const sorted = [...allScores].sort((a, b) => b.score - a.score);
        sorted.forEach((player, idx) => {
            // Sanitize names for CSV (wrap in quotes if contains comma)
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
    link.setAttribute("download", `scoreboard_game_${state.activeGame}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// XSS Sanitizer Helper
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
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

// Calculate accumulated scores for the 4 colors across Game 1-4
function calculateColorTotals() {
    const totals = {
        '#00f0ff': 0, // Blue
        '#00ff66': 0, // Green
        '#ffd600': 0, // Yellow
        '#ff4b5c': 0  // Red
    };
    
    for (let g = 1; g <= 4; g++) {
        const gameScores = state.scores[g.toString()] || [];
        const isMatchupGame = g === 1 && (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_big');
        // sunday_small Game 1 uses standard score entries (not matchup)
        if (isMatchupGame) {
            gameScores.forEach(match => {
                if (totals[match.teamA] !== undefined) {
                    totals[match.teamA] += match.scoreA;
                }
                if (totals[match.teamB] !== undefined) {
                    totals[match.teamB] += match.scoreB;
                }
            });
        } else {
            gameScores.forEach(player => {
                if (totals[player.color] !== undefined) {
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
        '#00ff66': 'ทีมสีเขียว',
        '#ffd600': 'ทีมสีเหลือง',
        '#ff4b5c': 'ทีมสีแดง'
    };
    
    // Construct sorted array to find leading colors
    const sortedColors = Object.keys(totals).map(hex => ({
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
    
    // Winner buttons text and active classes
    const winABtn = document.getElementById('winner-team-a-btn');
    const winBBtn = document.getElementById('winner-team-b-btn');
    if (winABtn && winBBtn) {
        winABtn.textContent = `ทีมสี${HEX_TO_NAME[state.match.teamA]} ชนะ`;
        winBBtn.textContent = `ทีมสี${HEX_TO_NAME[state.match.teamB]} ชนะ`;
        
        winABtn.classList.toggle('active', state.match.winner === 'A');
        winBBtn.classList.toggle('active', state.match.winner === 'B');
    }
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
    
    // UI state change
    DOM.submitBtn.classList.add('btn-edit-mode');
    DOM.submitBtn.querySelector('span').textContent = 'บันทึกการแก้ไข';
    DOM.cancelEditBtn.style.display = 'block';
    
    DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
}

function syncMatchToGoogleSheet(match) {
    if (!state.sheetsUrl) return;
    
    const wA = match.weightA ? ` [น้ำหนัก: ${match.weightA} กก.]` : '';
    const wB = match.weightB ? ` [น้ำหนัก: ${match.weightB} กก.]` : '';
    
    const nameA = `ทีมสี${HEX_TO_NAME[match.teamA]} (${match.winner === 'A' ? 'ชนะ' : 'แพ้'})${wA}`;
    const nameB = `ทีมสี${HEX_TO_NAME[match.teamB]} (${match.winner === 'B' ? 'ชนะ' : 'แพ้'})${wB}`;
    
    syncToGoogleSheet("1", nameA, match.scoreA, HEX_TO_NAME[match.teamA]);
    setTimeout(() => {
        syncToGoogleSheet("1", nameB, match.scoreB, HEX_TO_NAME[match.teamB]);
    }, 1500);
}

const CATEGORY_NAMES = {
    'saturday': 'วันเสาร์',
    'sunday_small': 'วันอาทิตย์ เด็กเล็ก',
    'sunday_big': 'วันอาทิตย์ เด็กโต'
};

function selectCategory(categoryKey) {
    state.activeCategory = categoryKey;
    
    // Load scores for this category
    loadData();
    
    // Update Header Badge
    DOM.headerCategoryName.textContent = CATEGORY_NAMES[categoryKey] || categoryKey;
    
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
