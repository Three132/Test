const CONFIG = {
    storageKey: 'scoreboard_arena_scores',
    colorPresets: {
        blue: '#00f0ff',
        red: '#ff4b5c',
        green: '#00ff66',
        yellow: '#ffd600',
        purple: '#d600ff',
        orange: '#ff7b00'
    },
    // ใส่ข้อมูล Firebase Config ของคุณที่นี่เพื่อให้ทุกคนใช้งานซิงค์ร่วมกันโดยอัตโนมัติ
    firebaseConfig: {
        apiKey: "AIzaSyD7GME4n43Wc0pcjx5PJZwws_JdQHF_3MA",
        authDomain: "robosport-28bd5.firebaseapp.com",
        projectId: "robosport-28bd5",
        storageBucket: "robosport-28bd5.firebasestorage.app",
        messagingSenderId: "564334969959",
        appId: "1:564334969959:web:e25935d47cd564d461c0c2",
        measurementId: "G-89WJ65HPM9"
    }
};

let state = {
    scores: {
        "1": [],
        "2": [],
        "3": [],
        "4": []
    },
    fakeScores: {
        '#00f0ff': 0, // น้ำเงิน
        '#ff4b5c': 0, // แดง
        '#ffd600': 0, // เหลือง
        '#00ff66': 0  // เขียว
    },
    maesiChecklist: {},
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

// Firebase global variables
let firebaseApp = null;
let firestoreDb = null;
let firestoreUnsubscribe = null;
let isFirebaseConnected = false;

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
    initFirebase();
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
            sanitizeScores();
        } catch (e) {
            console.error('Error parsing stored scores, initializing empty state', e);
            resetScoresObject();
        }
    } else {
        resetScoresObject();
    }
    
    // Load fake scores (categorized by activeCategory)
    const fakeKey = `${CONFIG.storageKey}_${state.activeCategory}_fakeScores`;
    const savedFake = localStorage.getItem(fakeKey);
    if (savedFake) {
        try {
            state.fakeScores = JSON.parse(savedFake);
        } catch (e) {
            state.fakeScores = { '#00f0ff': 0, '#ff4b5c': 0, '#ffd600': 0, '#00ff66': 0 };
        }
    } else {
        state.fakeScores = { '#00f0ff': 0, '#ff4b5c': 0, '#ffd600': 0, '#00ff66': 0 };
    }

    // Load Maesi checklist (categorized by activeCategory)
    const maesiKey = `${CONFIG.storageKey}_${state.activeCategory}_maesi`;
    const savedMaesi = localStorage.getItem(maesiKey);
    if (savedMaesi) {
        try {
            state.maesiChecklist = JSON.parse(savedMaesi);
        } catch (e) {
            state.maesiChecklist = {};
        }
    } else {
        state.maesiChecklist = {};
    }
    
    // Load Sheets integration URL (global)
    state.sheetsUrl = localStorage.getItem('scoreboard_sheets_url') || "";
}

function resetScoresObject() {
    state.scores = { "1": [], "2": [], "3": [], "4": [] };
}

// Sanitize and verify structure has all games
function sanitizeScores() {
    if (!state.scores || typeof state.scores !== 'object' || Array.isArray(state.scores)) {
        state.scores = { "1": [], "2": [], "3": [], "4": [] };
    }
    for (let i = 1; i <= 4; i++) {
        if (!state.scores[i] || !Array.isArray(state.scores[i])) {
            state.scores[i] = [];
        } else {
            const gNum = i.toString();
            const gName = getActiveGameName(gNum);
            if (gName === 'Fishing') {
                state.scores[i] = state.scores[i].filter(item => item && item.isFishing);
            } else if (checkIfPoleGame(gNum, state.activeCategory)) {
                state.scores[i] = state.scores[i].filter(item => item && item.isPole);
            } else if (checkIfMatchupGame(gNum, state.activeCategory)) {
                state.scores[i] = state.scores[i].filter(item => item && item.teamA && !item.isPole);
            } else {
                state.scores[i] = state.scores[i].filter(item => item && item.name);
            }
        }
    }
    
    // Sanitize fakeScores to prevent array serialization issues
    if (!state.fakeScores || typeof state.fakeScores !== 'object' || Array.isArray(state.fakeScores)) {
        state.fakeScores = { '#00f0ff': 0, '#ff4b5c': 0, '#ffd600': 0, '#00ff66': 0 };
    }
}

// Save to LocalStorage
function saveData() {
    if (!state.activeCategory) return;
    const key = `${CONFIG.storageKey}_${state.activeCategory}`;
    localStorage.setItem(key, JSON.stringify(state.scores));
    
    const fakeKey = `${CONFIG.storageKey}_${state.activeCategory}_fakeScores`;
    localStorage.setItem(fakeKey, JSON.stringify(state.fakeScores));
    
    const maesiKey = `${CONFIG.storageKey}_${state.activeCategory}_maesi`;
    localStorage.setItem(maesiKey, JSON.stringify(state.maesiChecklist || {}));
    
    // Save to Firebase Firestore if connected
    saveDataToFirebase(state.activeCategory);
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

// Loose JSON parsing helper (supports single quotes, unquoted keys, trailing commas)
function parseLooseJSON(str) {
    str = str.trim();
    try {
        return JSON.parse(str);
    } catch (e) {}
    try {
        let normalized = str
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
            .replace(/'/g, '"')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(normalized);
    } catch (e) {
        try {
            const fn = new Function(`return (${str});`);
            const res = fn();
            if (res && typeof res === 'object') {
                return res;
            }
        } catch (err) {}
        throw new Error("Unable to parse config string");
    }
}

// Initialize Firebase App
function initFirebase() {
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }
    
    // Check if Firebase is disabled by the user on this device
    const isDisabled = localStorage.getItem('scoreboard_firebase_disabled') === 'true';
    if (isDisabled) {
        isFirebaseConnected = false;
        updateFirebaseStatusUI();
        return;
    }
    
    let config = null;
    const raw = localStorage.getItem('scoreboard_firebase_config');
    if (raw) {
        try {
            config = JSON.parse(raw);
            if (!config || !config.projectId) {
                config = null;
            }
        } catch (e) {
            console.error("Firebase config parse error from localStorage:", e);
        }
    }
    
    // Fallback to hardcoded CONFIG.firebaseConfig if projectId is defined
    if (!config && CONFIG.firebaseConfig && CONFIG.firebaseConfig.projectId) {
        config = CONFIG.firebaseConfig;
    }
    
    if (!config || !config.projectId) {
        isFirebaseConnected = false;
        updateFirebaseStatusUI();
        return;
    }
    
    try {
        if (firebase.apps.length > 0) {
            firebase.apps[0].delete().then(() => {
                initializeFirebaseApp(config);
            }).catch(err => {
                console.error("Error clearing Firebase instance:", err);
                showToast("ไม่สามารถรีเซ็ตการเชื่อมต่อ Firebase", "error");
            });
        } else {
            initializeFirebaseApp(config);
        }
    } catch (e) {
        console.error("Firebase initialization error:", e);
        isFirebaseConnected = false;
        updateFirebaseStatusUI();
    }
}

function initializeFirebaseApp(config) {
    try {
        firebaseApp = firebase.initializeApp(config);
        firestoreDb = firebaseApp.firestore();
        isFirebaseConnected = true;
        updateFirebaseStatusUI();
        
        if (state.activeCategory) {
            setupRealtimeSync(state.activeCategory);
        }
    } catch (e) {
        console.error("Firebase startup failed:", e);
        isFirebaseConnected = false;
        updateFirebaseStatusUI();
        showToast("เชื่อมต่อ Firebase ล้มเหลว: " + e.message, "error");
    }
}

// Update Firebase synchronization statuses
function updateFirebaseStatusUI() {
    const statusDot = document.getElementById('firebase-status-dot');
    const statusText = document.getElementById('firebase-status-text');
    const syncStatusText = document.getElementById('sync-status-text');
    
    const hasLocalConfig = !!localStorage.getItem('scoreboard_firebase_config');
    const isUsingDefault = isFirebaseConnected && !hasLocalConfig;
    
    if (isFirebaseConnected) {
        if (statusDot) {
            statusDot.style.background = 'var(--color-green)';
            statusDot.parentElement.style.background = 'rgba(0, 255, 102, 0.1)';
            statusDot.parentElement.style.color = 'var(--color-green)';
            statusDot.parentElement.style.borderColor = 'rgba(0, 255, 102, 0.2)';
        }
        if (statusText) {
            statusText.textContent = isUsingDefault 
                ? 'เชื่อมต่ออัตโนมัติ (ผ่านค่าเริ่มต้นในระบบ)' 
                : 'เชื่อมต่อแล้ว (ซิงค์เรียลไทม์)';
        }
        if (syncStatusText) syncStatusText.textContent = 'ซิงค์เรียลไทม์';
        
        if (DOM.sheetsConfigBtn) {
            DOM.sheetsConfigBtn.classList.add('connected');
            DOM.sheetsConfigBtn.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.3)';
        }
    } else {
        if (statusDot) {
            statusDot.style.background = 'var(--text-secondary)';
            statusDot.parentElement.style.background = 'rgba(144, 141, 158, 0.1)';
            statusDot.parentElement.style.color = 'var(--text-secondary)';
            statusDot.parentElement.style.borderColor = 'rgba(144, 141, 158, 0.2)';
        }
        if (statusText) statusText.textContent = 'ปิดใช้งาน (ใช้ข้อมูลในเครื่อง)';
        
        updateSheetsConnectionUI();
        if (DOM.sheetsConfigBtn && !state.sheetsUrl) {
            DOM.sheetsConfigBtn.style.boxShadow = '';
        }
    }
}

// Real-time listener for Firestore document
function setupRealtimeSync(categoryKey) {
    if (!isFirebaseConnected || !firestoreDb) return;
    
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }
    
    const docRef = firestoreDb.collection('arenas').doc(categoryKey);
    
    firestoreUnsubscribe = docRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            if (data.scores) {
                state.scores = data.scores;
                sanitizeScores();
            }
            if (data.fakeScores) state.fakeScores = data.fakeScores;
            if (data.maesiChecklist) state.maesiChecklist = data.maesiChecklist;
            
            // Mirror to LocalStorage cache
            const key = `${CONFIG.storageKey}_${categoryKey}`;
            localStorage.setItem(key, JSON.stringify(state.scores));
            
            const fakeKey = `${CONFIG.storageKey}_${categoryKey}_fakeScores`;
            localStorage.setItem(fakeKey, JSON.stringify(state.fakeScores));
            
            const maesiKey = `${CONFIG.storageKey}_${categoryKey}_maesi`;
            localStorage.setItem(maesiKey, JSON.stringify(state.maesiChecklist || {}));
            
            // Re-render interfaces
            renderStats();
            renderLeaderboard();
            if (state.activeGame === "summary") {
                renderSummaryChart();
            } else if (state.activeGame === "maesi") {
                renderMaesiPanel();
            }
            
            updatePlayerNameDropdown();
            updateMatchFormUI();
            updatePoleFormUI();
        } else {
            console.log(`Initializing cloud document for ${categoryKey}...`);
            saveDataToFirebase(categoryKey);
        }
    }, (error) => {
        console.error("Firestore onSnapshot error:", error);
    });
}

function saveDataToFirebase(categoryKey) {
    if (!isFirebaseConnected || !firestoreDb) return;
    
    // Clean all undefined values and sparse arrays to prevent Firestore validation errors
    const payload = JSON.parse(JSON.stringify({
        scores: state.scores,
        fakeScores: state.fakeScores,
        maesiChecklist: state.maesiChecklist,
        updatedAt: Date.now()
    }));
    
    firestoreDb.collection('arenas').doc(categoryKey).set(payload).then(() => {
        console.log(`Saved ${categoryKey} state to Firestore`);
    }).catch(err => {
        console.error("Firestore push error:", err);
        showToast("ไม่สามารถอัปเดตข้อมูลขึ้น Firebase", "error");
    });
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
        
        const passcodeEl = document.getElementById('clear-passcode-input');
        const errorEl = document.getElementById('clear-passcode-error');
        if (passcodeEl) passcodeEl.value = '';
        if (errorEl) errorEl.style.display = 'none';
        
        DOM.confirmDialog.classList.add('open');
        if (passcodeEl) setTimeout(() => passcodeEl.focus(), 100);
    });

    DOM.clearAllDataBtn.addEventListener('click', () => {
        clearMode = 'all_games';
        DOM.dialogTitle.textContent = 'ล้างคะแนนทั้งหมดทุกเกม?';
        DOM.dialogDesc.textContent = 'คุณแน่ใจหรือไม่ว่าต้องการล้างคะแนนของผู้เล่นในทุกเกม (Game 1 - 4)? ข้อมูลนี้ไม่สามารถกู้คืนได้';
        
        const passcodeEl = document.getElementById('clear-passcode-input');
        const errorEl = document.getElementById('clear-passcode-error');
        if (passcodeEl) passcodeEl.value = '';
        if (errorEl) errorEl.style.display = 'none';
        
        DOM.confirmDialog.classList.add('open');
        if (passcodeEl) setTimeout(() => passcodeEl.focus(), 100);
    });

    DOM.dialogCancelBtn.addEventListener('click', () => {
        DOM.confirmDialog.classList.remove('open');
    });

    DOM.dialogConfirmBtn.addEventListener('click', () => {
        const passcodeEl = document.getElementById('clear-passcode-input');
        const errorEl = document.getElementById('clear-passcode-error');
        
        if (passcodeEl && passcodeEl.value === '1234') {
            if (clearMode === 'active_game') {
                clearActiveGameScores();
            } else if (clearMode === 'all_games') {
                clearAllGamesScores();
            }
            DOM.confirmDialog.classList.remove('open');
        } else {
            if (errorEl) errorEl.style.display = 'block';
            showToast("รหัสผ่านไม่ถูกต้อง!", "error");
        }
    });

    const clearPasscodeEl = document.getElementById('clear-passcode-input');
    if (clearPasscodeEl) {
        clearPasscodeEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                DOM.dialogConfirmBtn.click();
            }
        });
    }

    // Connection Sync Config Modal Triggers
    DOM.sheetsConfigBtn.addEventListener('click', () => {
        const sheetsUrl = localStorage.getItem('scoreboard_sheets_url') || "";
        DOM.sheetsUrlInput.value = sheetsUrl;
        
        let firebaseRaw = localStorage.getItem('scoreboard_firebase_config') || "";
        // Pre-populate with hardcoded CONFIG.firebaseConfig if active and not explicitly disabled
        if (!firebaseRaw && CONFIG.firebaseConfig && CONFIG.firebaseConfig.projectId && localStorage.getItem('scoreboard_firebase_disabled') !== 'true') {
            firebaseRaw = JSON.stringify(CONFIG.firebaseConfig, null, 2);
        }
        
        const configTextarea = document.getElementById('firebase-config-json');
        if (configTextarea) {
            if (firebaseRaw) {
                try {
                    configTextarea.value = JSON.stringify(JSON.parse(firebaseRaw), null, 2);
                } catch(e) {
                    configTextarea.value = firebaseRaw;
                }
            } else {
                configTextarea.value = "";
            }
        }
        
        const btnTabFirebase = document.getElementById('btn-sync-tab-firebase');
        const btnTabSheets = document.getElementById('btn-sync-tab-sheets');
        const tabContentFirebase = document.getElementById('sync-tab-content-firebase');
        const tabContentSheets = document.getElementById('sync-tab-content-sheets');
        if (btnTabFirebase && btnTabSheets && tabContentFirebase && tabContentSheets) {
            btnTabFirebase.classList.add('active');
            btnTabSheets.classList.remove('active');
            tabContentFirebase.style.display = 'flex';
            tabContentSheets.style.display = 'none';
        }
        
        updateFirebaseStatusUI();
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
        const firebaseRaw = document.getElementById('firebase-config-json')?.value.trim() || "";
        
        // Validate and Save Sheets
        if (url === "") {
            state.sheetsUrl = "";
            localStorage.removeItem('scoreboard_sheets_url');
        } else if (url.startsWith('https://script.google.com/')) {
            state.sheetsUrl = url;
            localStorage.setItem('scoreboard_sheets_url', url);
        } else {
            showToast("URL เว็บแอป Google Sheets ไม่ถูกต้อง", "error");
            return;
        }
        
        // Validate and Save Firebase
        if (firebaseRaw === "") {
            localStorage.removeItem('scoreboard_firebase_config');
            localStorage.setItem('scoreboard_firebase_disabled', 'true'); // Explicitly disable Firebase sync
            if (isFirebaseConnected) {
                isFirebaseConnected = false;
                if (firestoreUnsubscribe) {
                    firestoreUnsubscribe();
                    firestoreUnsubscribe = null;
                }
                updateFirebaseStatusUI();
                showToast("ยกเลิกการเชื่อมต่อ Firebase", "info");
                loadData();
                renderStats();
                renderLeaderboard();
            }
        } else {
            try {
                const parsed = parseLooseJSON(firebaseRaw);
                if (!parsed || typeof parsed !== 'object' || !parsed.projectId) {
                    throw new Error("ต้องมี projectId ในการกำหนดค่า");
                }
                localStorage.setItem('scoreboard_firebase_config', JSON.stringify(parsed));
                localStorage.removeItem('scoreboard_firebase_disabled'); // Re-enable Firebase
                initFirebase();
            } catch (e) {
                showToast("รูปแบบ Firebase Config ไม่ถูกต้อง: " + e.message, "error");
                return;
            }
        }
        
        updateSheetsConnectionUI();
        DOM.sheetsModal.classList.remove('open');
    });

    // Portal Card Selectors
    DOM.portalCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryKey = card.getAttribute('data-category');
            if (categoryKey === 'final_score') {
                const modal = document.getElementById('final-score-modal');
                if (modal) modal.classList.add('open');
            } else {
                selectCategory(categoryKey);
            }
        });
    });

    // FinalScore Modal Control & Selection listeners
    const finalScoreModal = document.getElementById('final-score-modal');
    const finalModalClose = document.getElementById('final-modal-close');
    const finalModalCancel = document.getElementById('final-modal-cancel');
    
    const closeFinalModal = () => {
        if (finalScoreModal) finalScoreModal.classList.remove('open');
    };
    
    if (finalModalClose) finalModalClose.addEventListener('click', closeFinalModal);
    if (finalModalCancel) finalModalCancel.addEventListener('click', closeFinalModal);
    
    const handleFinalCategorySelect = (categoryKey) => {
        closeFinalModal();
        
        // 1. Select the category
        selectCategory(categoryKey);
        
        // 2. Set active game tab to "summary"
        setActiveGame('summary');
        
        // 3. Show the curtains overlay immediately
        const overlay = document.getElementById('curtain-overlay');
        if (overlay) {
            overlay.style.display = 'block';
            overlay.classList.remove('open');
        }
        const startRevealBtn = document.getElementById('start-reveal-btn');
        if (startRevealBtn) {
            startRevealBtn.disabled = false;
        }
        
        // 4. Request full screen automatically (Presentation Mode)
        setTimeout(() => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error("Error attempting to enable full-screen mode on Final Score select:", err);
                });
            }
        }, 100);
    };
    
    const finalSelectSat = document.getElementById('final-select-sat');
    const finalSelectSunSmall = document.getElementById('final-select-sun-small');
    const finalSelectSunBig = document.getElementById('final-select-sun-big');
    
    if (finalSelectSat) {
        finalSelectSat.addEventListener('click', () => handleFinalCategorySelect('saturday'));
    }
    if (finalSelectSunSmall) {
        finalSelectSunSmall.addEventListener('click', () => handleFinalCategorySelect('sunday_small'));
    }
    if (finalSelectSunBig) {
        finalSelectSunBig.addEventListener('click', () => handleFinalCategorySelect('sunday_big'));
    }

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

    // Final Mode (Suspense Reveal) triggers
    const finalModeBtn = document.getElementById('final-mode-btn');
    if (finalModeBtn) {
        finalModeBtn.addEventListener('click', () => {
            const overlay = document.getElementById('curtain-overlay');
            if (overlay) {
                overlay.style.display = 'block';
                overlay.classList.remove('open');
            }
            const startRevealBtn = document.getElementById('start-reveal-btn');
            if (startRevealBtn) {
                startRevealBtn.disabled = false;
            }
        });
    }

    const startRevealBtn = document.getElementById('start-reveal-btn');
    if (startRevealBtn) {
        startRevealBtn.addEventListener('click', () => {
            AudioFX.init();
            startFinalReveal();
        });
    }

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

    // Admin Login and Panel Listeners
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminAuthModal = document.getElementById('admin-auth-modal');
    const adminAuthClose = document.getElementById('admin-auth-close');
    const adminAuthCancelBtn = document.getElementById('admin-auth-cancel-btn');
    const adminAuthSubmitBtn = document.getElementById('admin-auth-submit-btn');
    const adminPasscodeInput = document.getElementById('admin-passcode');
    const adminAuthError = document.getElementById('admin-auth-error');

    const adminPanelModal = document.getElementById('admin-panel-modal');
    const adminPanelClose = document.getElementById('admin-panel-close');
    const adminPanelCloseBtn = document.getElementById('admin-panel-close-btn');
    const adminFakeAdjustment = document.getElementById('admin-fake-adjustment');
    const adminSaveFakeBtn = document.getElementById('admin-save-fake-btn');

    let selectedAdminColor = '#00f0ff';

    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            if (adminPasscodeInput) adminPasscodeInput.value = '';
            if (adminAuthError) adminAuthError.style.display = 'none';
            if (adminAuthModal) adminAuthModal.classList.add('open');
            if (adminPasscodeInput) adminPasscodeInput.focus();
        });
    }

    const closeAdminAuth = () => {
        if (adminAuthModal) adminAuthModal.classList.remove('open');
    };
    if (adminAuthClose) adminAuthClose.addEventListener('click', closeAdminAuth);
    if (adminAuthCancelBtn) adminAuthCancelBtn.addEventListener('click', closeAdminAuth);

    const submitAdminAuth = () => {
        if (!adminPasscodeInput) return;
        if (adminPasscodeInput.value === '1234') {
            closeAdminAuth();
            
            // Set default color selection to first available
            selectedAdminColor = '#00f0ff';
            document.querySelectorAll('#admin-color-selector .color-name-btn').forEach(btn => {
                const hex = btn.getAttribute('data-hex');
                btn.classList.toggle('selected', hex === selectedAdminColor);
            });
            if (adminFakeAdjustment) adminFakeAdjustment.value = '';

            // Hide green/yellow on Saturday
            const isSat = state.activeCategory === 'saturday';
            document.querySelectorAll('#admin-color-selector .color-name-btn').forEach(btn => {
                const hex = btn.getAttribute('data-hex');
                if (isSat && (hex === '#ffd600' || hex === '#00ff66')) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            });

            renderAdminScoresTable();
            if (adminPanelModal) adminPanelModal.classList.add('open');
        } else {
            if (adminAuthError) adminAuthError.style.display = 'block';
        }
    };

    if (adminAuthSubmitBtn) adminAuthSubmitBtn.addEventListener('click', submitAdminAuth);
    if (adminPasscodeInput) {
        adminPasscodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAdminAuth();
        });
    }

    const closeAdminPanel = () => {
        if (adminPanelModal) adminPanelModal.classList.remove('open');
    };
    if (adminPanelClose) adminPanelClose.addEventListener('click', closeAdminPanel);
    if (adminPanelCloseBtn) adminPanelCloseBtn.addEventListener('click', closeAdminPanel);

    // Color buttons inside Admin Panel
    document.querySelectorAll('#admin-color-selector .color-name-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#admin-color-selector .color-name-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAdminColor = btn.getAttribute('data-hex');
        });
    });

    if (adminSaveFakeBtn) {
        adminSaveFakeBtn.addEventListener('click', () => {
            if (!adminFakeAdjustment) return;
            const val = parseInt(adminFakeAdjustment.value) || 0;
            if (val === 0) {
                showToast("กรุณาระบุคะแนนที่ไม่ใช่ 0", "error");
                return;
            }
            
            if (!state.fakeScores) {
                state.fakeScores = { '#00f0ff': 0, '#ff4b5c': 0, '#ffd600': 0, '#00ff66': 0 };
            }
            
            // Add/Adjust fake score
            state.fakeScores[selectedAdminColor] = (state.fakeScores[selectedAdminColor] || 0) + val;
            saveData();
            
            adminFakeAdjustment.value = '';
            renderAdminScoresTable();
            renderSummaryChart();
            
            const colorName = HEX_TO_NAME[selectedAdminColor] || selectedAdminColor;
            showToast(`ปรับคะแนนหลอกทีมสี${colorName}สำเร็จ (${val > 0 ? '+' : ''}${val})`, "success");
        });
    }

    // Maesi Checklist Reset Listener
    const maesiResetBtn = document.getElementById('maesi-reset-btn');
    if (maesiResetBtn) {
        maesiResetBtn.addEventListener('click', () => {
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตการเช็คชื่อทั้งหมดของแม่สี?')) {
                state.maesiChecklist = {};
                saveData();
                renderMaesiPanel();
                showToast("รีเซ็ตการเช็คชื่อทั้งหมดแล้ว", "success");
            }
        });
    }

    // Checkbox Change delegation for Maesi Grid
    const maesiGrid = document.getElementById('maesi-grid-container');
    if (maesiGrid) {
        maesiGrid.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                const player = e.target.getAttribute('data-player');
                const game = e.target.getAttribute('data-game');
                const isChecked = e.target.checked;
                
                if (!state.maesiChecklist) {
                    state.maesiChecklist = {};
                }
                if (!state.maesiChecklist[player]) {
                    state.maesiChecklist[player] = {};
                }
                state.maesiChecklist[player][game] = isChecked;
                saveData();
            }
        });
    }

    // Tab switching inside Sync Settings Modal
    const btnTabFirebase = document.getElementById('btn-sync-tab-firebase');
    const btnTabSheets = document.getElementById('btn-sync-tab-sheets');
    const tabContentFirebase = document.getElementById('sync-tab-content-firebase');
    const tabContentSheets = document.getElementById('sync-tab-content-sheets');
    
    if (btnTabFirebase && btnTabSheets && tabContentFirebase && tabContentSheets) {
        btnTabFirebase.addEventListener('click', () => {
            btnTabFirebase.classList.add('active');
            btnTabSheets.classList.remove('active');
            tabContentFirebase.style.display = 'flex';
            tabContentSheets.style.display = 'none';
        });
        
        btnTabSheets.addEventListener('click', () => {
            btnTabSheets.classList.add('active');
            btnTabFirebase.classList.remove('active');
            tabContentSheets.style.display = 'flex';
            tabContentFirebase.style.display = 'none';
        });
    }

    // Firebase clear config action
    const firebaseClearBtn = document.getElementById('firebase-clear-btn');
    if (firebaseClearBtn) {
        firebaseClearBtn.addEventListener('click', () => {
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างการเชื่อมต่อ Firebase? ระบบจะกลับไปใช้ข้อมูลในเครื่องแทน')) {
                localStorage.removeItem('scoreboard_firebase_config');
                localStorage.setItem('scoreboard_firebase_disabled', 'true'); // Temporarily disable Firebase sync
                const configTextarea = document.getElementById('firebase-config-json');
                if (configTextarea) configTextarea.value = '';
                
                if (isFirebaseConnected) {
                    isFirebaseConnected = false;
                    if (firestoreUnsubscribe) {
                        firestoreUnsubscribe();
                        firestoreUnsubscribe = null;
                    }
                    updateFirebaseStatusUI();
                    showToast("ยกเลิกการเชื่อมต่อ Firebase เรียบร้อย", "info");
                    loadData();
                    renderStats();
                    renderLeaderboard();
                }
            }
        });
    }
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
        const maesiPanel = document.getElementById('maesi-panel');
        if (maesiPanel) maesiPanel.style.display = 'none';
        
        // Render standings chart
        renderSummaryChart();
    } else if (gameNum === "maesi") {
        // Toggle view containers
        DOM.mainDashboard.style.display = 'none';
        DOM.summaryPanel.style.display = 'none';
        const maesiPanel = document.getElementById('maesi-panel');
        if (maesiPanel) maesiPanel.style.display = 'flex';
        renderMaesiPanel();
    } else {
        // Toggle view containers
        DOM.summaryPanel.style.display = 'none';
        const maesiPanel = document.getElementById('maesi-panel');
        if (maesiPanel) maesiPanel.style.display = 'none';
        DOM.mainDashboard.style.display = 'grid';

        // Toggle standard/objects hit/matchup/pole form fields
        const isFishingGame = checkIfFishingGame(gameNum, state.activeCategory);
        const isMatchupGame = checkIfMatchupGame(gameNum, state.activeCategory);
        const isPoleGame = checkIfPoleGame(gameNum, state.activeCategory);
        
        if (isPoleGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'block';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `บันทึกผลการแข่ง ${getActiveGameName(gameNum)} (2 ทีม × 2 คน)`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกผลการแข่ง';
            updatePoleFormUI();
        } else if (isFishingGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'none';
            document.getElementById('fishing-form-fields').style.display = 'block';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.removeAttribute('required');
            DOM.formPanelSubtitle.textContent = `ระบุจำนวนปลาที่แต่ละสีตกได้ใน ${getActiveGameName(gameNum)}`;
            DOM.submitBtn.querySelector('span').textContent = state.editId !== null ? 'บันทึกการแก้ไข' : 'บันทึกคะแนนรอบนี้';
            updateFishingPlayerDropdowns();
        } else if (isMatchupGame) {
            document.getElementById('standard-form-fields').style.display = 'none';
            document.getElementById('match-form-fields').style.display = 'block';
            document.getElementById('fishing-form-fields').style.display = 'none';
            document.getElementById('pole-form-fields').style.display = 'none';
            DOM.playerNameInput.removeAttribute('required');
            const matchGameName = getActiveGameName(gameNum);
            const isWeightMatch = matchGameName === 'Pick and Place';
            
            // Update labels for weight (Pick and Place) vs points (Hockey, Sumo, Pole Fighting)
            const labelA = document.getElementById('match-label-a');
            const labelB = document.getElementById('match-label-b');
            const inputA = document.getElementById('match-weight-a');
            const inputB = document.getElementById('match-weight-b');
            const scoreGroupA = document.getElementById('match-score-a-group');
            const scoreGroupB = document.getElementById('match-score-b-group');
            
            if (scoreGroupA) scoreGroupA.style.display = 'block';
            if (scoreGroupB) scoreGroupB.style.display = 'block';
            
            if (labelA) labelA.textContent = isWeightMatch ? 'น้ำหนักทีมที่ 1 (กิโลกรัม)' : 'แต้มของทีมที่ 1';
            if (labelB) labelB.textContent = isWeightMatch ? 'น้ำหนักทีมที่ 2 (กิโลกรัม)' : 'แต้มของทีมที่ 2';
            if (inputA) inputA.placeholder = isWeightMatch ? 'ระบุน้ำหนักทีมที่ 1...' : 'ระบุแต้มของทีมที่ 1...';
            if (inputB) inputB.placeholder = isWeightMatch ? 'ระบุน้ำหนักทีมที่ 2...' : 'ระบุแต้มของทีมที่ 2...';
            if (inputA) inputA.step = isWeightMatch ? '0.01' : '1';
            if (inputB) inputB.step = isWeightMatch ? '0.01' : '1';
            
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
    // Pick and Place เป็นแมตช์ 1 ต่อ 1 (ใส่น้ำหนัก) ยกเว้นเด็กโตวันอาทิตย์ (เป็น 2v2)
    if (gameName === 'Pick and Place' && category !== 'sunday_big') return true;
    // Hockey เป็นแมตช์ 1 ต่อ 1 (ใส่แต้ม) เฉพาะวันเสาร์
    if (gameName === 'Hockey' && category === 'saturday') return true;
    // Pole Fighting เป็นแมตช์ 1 ต่อ 1 เฉพาะวันเสาร์
    if (gameName === 'Pole Fighting' && category === 'saturday') return true;
    return false;
}

function checkIfFishingGame(gameNum, category) {
    return gameNum === "3" && (category === 'sunday_small' || category === 'sunday_big');
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
                    state.scores[state.activeGame][index].matchId = state.activeMatchId || null;
                    syncMatchToGoogleSheet(state.scores[state.activeGame][index]);
                }
            } else {
                const newMatch = {
                    id: Date.now().toString(),
                    teamA, teamB, winner, scoreA, scoreB,
                    weightA, weightB, playerA, playerB,
                    matchId: state.activeMatchId || null,
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
        alert("ตรวจพบข้อผิดพลาด:\n" + e.message + "\n\nStack:\n" + e.stack);
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
    const isWeightMatch = gameNameNow === 'Pick and Place';
    const unitTxt = isWeightMatch ? '(กิโลกรัม)' : '(แต้ม)';
    const labelKind = isWeightMatch ? 'น้ำหนัก' : 'แต้ม';
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
    // Refresh รายชื่อตามสีที่เลือก (และคงค่าที่เลือกไว้เดิม)
    const selA = document.getElementById('match-player-a');
    const selB = document.getElementById('match-player-b');
    const valA = selA ? selA.value : null;
    const valB = selB ? selB.value : null;
    updateMatchPlayerDropdown('A', valA);
    updateMatchPlayerDropdown('B', valB);

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
    if (gameName === 'Pole Fighting' && category !== 'saturday') return true;
    // Hockey วันอาทิตย์ = 2 ทีม × 2 คน (ใช้ฟอร์มแบบ Pole Fighting)
    if (gameName === 'Hockey' && (category === 'sunday_small' || category === 'sunday_big')) return true;
    // Pick and Place เด็กโตวันอาทิตย์ = 2 ทีม × 2 คน (ใช้ฟอร์มแบบ Pole Fighting)
    if (gameName === 'Pick and Place' && category === 'sunday_big') return true;
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

    // Toggle 1v1 vs 2v2: Pole Fighting วันเสาร์ = 1v1, ที่เหลือ (วันอาทิตย์ + Hockey อาทิตย์) = 2v2
    const isSat = state.activeCategory === 'saturday';
    const wrapperA2 = document.getElementById('pole-player-a2-wrapper');
    const wrapperB2 = document.getElementById('pole-player-b2-wrapper');
    const gridA = document.getElementById('pole-team-a-players-grid');
    const gridB = document.getElementById('pole-team-b-players-grid');
    const labelA1 = document.getElementById('pole-label-a1');
    const labelB1 = document.getElementById('pole-label-b1');
    
    if (isSat) {
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

    // Refresh รายชื่อตามสีที่เลือก (และคงค่าที่เลือกไว้เดิม)
    const selA1 = document.getElementById('pole-player-a1');
    const selA2 = document.getElementById('pole-player-a2');
    const selB1 = document.getElementById('pole-player-b1');
    const selB2 = document.getElementById('pole-player-b2');
    const valA1 = selA1 ? selA1.value : null;
    const valA2 = selA2 ? selA2.value : null;
    const valB1 = selB1 ? selB1.value : null;
    const valB2 = selB2 ? selB2.value : null;
    updatePolePlayerDropdown('A', [valA1, valA2]);
    updatePolePlayerDropdown('B', [valB1, valB2]);
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

// Pre-configured matches for Saturday (วันเสาร์)
const SATURDAY_MATCHES = {
    "1": [
        { "id": 1, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "กรรณ", "teamB": "#00f0ff", "playerB": "เมทัล" },
        { "id": 2, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ธีร์", "teamB": "#00f0ff", "playerB": "เจเจ" },
        { "id": 3, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "เรสซิ่ง", "teamB": "#00f0ff", "playerB": "ดาวา" },
        { "id": 4, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ไดโน่", "teamB": "#00f0ff", "playerB": "อันดา" },
        { "id": 5, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ข้าวปั้น", "teamB": "#00f0ff", "playerB": "อายชิลด์" },
        { "id": 6, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ปกป้อง2", "teamB": "#00f0ff", "playerB": "เต็นท์" },
        
    ],
    "2": [
        { "id": 1, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ปกป้อง2", "teamB": "#00f0ff", "playerB": "เมทัล" },
        { "id": 2, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "กรรณ", "teamB": "#00f0ff", "playerB": "เจเจ" },
        { "id": 3, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ธีร์", "teamB": "#00f0ff", "playerB": "เต็นท์" },
        { "id": 4, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "กันย์", "teamB": "#00f0ff", "playerB": "ดาวา" },
        { "id": 5, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "เรสซิ่ง", "teamB": "#00f0ff", "playerB": "อายชิลด์" },
        { "id": 6, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ไดโน่", "teamB": "#00f0ff", "playerB": "อันดา" }
    ],
    "3": [
        { "id": 1, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ปกป้อง2", "teamB": "#00f0ff", "playerB": "เจเจ" },
        { "id": 2, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "กรรณ", "teamB": "#00f0ff", "playerB": "เต็นท์" },
        { "id": 3, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ข้าวปั้น", "teamB": "#00f0ff", "playerB": "ดาวา" },
        { "id": 4, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ธีร์", "teamB": "#00f0ff", "playerB": "เมทัล" },
        { "id": 5, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "กันย์", "teamB": "#00f0ff", "playerB": "อันดา" },
        { "id": 6, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "เรสซิ่ง", "teamB": "#00f0ff", "playerB": "อายชิลด์" }
    ],
    "4": [
        { "id": 1, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ปกป้อง2", "teamB": "#00f0ff", "playerB": "เมทัล" },
        { "id": 2, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "กรรณ", "teamB": "#00f0ff", "playerB": "เต็นท์" },
        { "id": 3, "round": 1, "type": "individual", "teamA": "#ff4b5c", "playerA": "ธีร์", "teamB": "#00f0ff", "playerB": "เจเจ" },
        { "id": 4, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ไดโน่", "teamB": "#00f0ff", "playerB": "ดาวา" },
        { "id": 5, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "ข้าวปั้น", "teamB": "#00f0ff", "playerB": "อันดา" },
        { "id": 6, "round": 2, "type": "individual", "teamA": "#ff4b5c", "playerA": "กันย์", "teamB": "#00f0ff", "playerB": "อายชิลด์" }
    ]
};

// Pre-configured matches for Sunday Small (วันอาทิตย์ เด็กเล็ก)
// ตารางแข่ง 4 เกม (ฉบับปรับแก้)
// กฎ: ไม่ลงรอบติดกัน (เว้นพักทุกคน) | รุ่นปนได้เฉพาะ 1,2 vs 1,2 | ทุกคนลงครบ 4 เกม | คิวไม่ชน
// หมายเหตุ: Game2 รอบ11 และ Game4 รอบ3 ยังเป็น 'รุ่นปนไม่สมดุล' (1,2 vs 1,1)
//   เพราะจำนวนสลॉตรุ่น2 ในแต่ละเกม = 23 (เลขคี่) จึงจับคู่ลงตัวทั้งหมดไม่ได้ (ดูคำอธิบายในแชท)
const SUNDAY_SMALL_MATCHES = {
    // Game 1 — Bowling (1v1 สีปะทะสี)  — รอบ 14 = รอบเก็บตก จับเพื่อนรุ่นเดียวกันมาช่วย
    "1": [
        { "id": 1, "round": 1, "type": "individual", "teamA": "#ffd600", "playerA": "คิน", "teamB": "#00ff66", "playerB": "นาคินทร์" },
        { "id": 2, "round": 1, "type": "individual", "teamA": "#ffd600", "playerA": "ดีเซล", "teamB": "#00ff66", "playerB": "อาเหยียน" },
        { "id": 3, "round": 2, "type": "individual", "teamA": "#00f0ff", "playerA": "ณคุณ", "teamB": "#ff4b5c", "playerB": "ภูผา" },
        { "id": 4, "round": 2, "type": "individual", "teamA": "#00f0ff", "playerA": "กราฟิก", "teamB": "#ff4b5c", "playerB": "ลอฟต์" },
        { "id": 5, "round": 3, "type": "individual", "teamA": "#ffd600", "playerA": "จินดา", "teamB": "#00ff66", "playerB": "ปุงปัง" },
        { "id": 6, "round": 3, "type": "individual", "teamA": "#ffd600", "playerA": "เซนต์", "teamB": "#00ff66", "playerB": "เลโก้" },
        { "id": 7, "round": 4, "type": "individual", "teamA": "#ffd600", "playerA": "ลูกแก้ว", "teamB": "#00f0ff", "playerB": "เอ็ดก้า" },
        { "id": 8, "round": 4, "type": "individual", "teamA": "#00ff66", "playerA": "ขอบคุณ", "teamB": "#ff4b5c", "playerB": "อคิณ" },
        { "id": 9, "round": 5, "type": "individual", "teamA": "#00f0ff", "playerA": "ไทเป", "teamB": "#ff4b5c", "playerB": "นาคิน" },
        { "id": 10, "round": 5, "type": "individual", "teamA": "#00ff66", "playerA": "ฟลินน์", "teamB": "#ff4b5c", "playerB": "แมนต้า" },
        { "id": 11, "round": 6, "type": "individual", "teamA": "#ffd600", "playerA": "Cani", "teamB": "#00f0ff", "playerB": "โปรดปราน" },
        { "id": 12, "round": 6, "type": "individual", "teamA": "#ffd600", "playerA": "ภาคิน", "teamB": "#00f0ff", "playerB": "อะตอมW" },
        { "id": 13, "round": 7, "type": "individual", "teamA": "#ffd600", "playerA": "ใบบุญ", "teamB": "#00ff66", "playerB": "ปุณณ์ W" },
        { "id": 14, "round": 7, "type": "individual", "teamA": "#ffd600", "playerA": "ก้าว", "teamB": "#00ff66", "playerB": "เชฟ" },
        { "id": 15, "round": 8, "type": "individual", "teamA": "#00f0ff", "playerA": "อุ่นใจ", "teamB": "#ff4b5c", "playerB": "พายุ" },
        { "id": 16, "round": 8, "type": "individual", "teamA": "#00f0ff", "playerA": "เชอริล", "teamB": "#ff4b5c", "playerB": "ตะวัน" },
        { "id": 17, "round": 9, "type": "individual", "teamA": "#00f0ff", "playerA": "ปราบ", "teamB": "#ff4b5c", "playerB": "ยูตะ" },
        { "id": 18, "round": 9, "type": "individual", "teamA": "#ffd600", "playerA": "พรีมพรีม", "teamB": "#00f0ff", "playerB": "ภูเขา" },
        { "id": 19, "round": 10, "type": "individual", "teamA": "#ffd600", "playerA": "อิงอิง", "teamB": "#00ff66", "playerB": "ปุณณ์ W" },
        { "id": 20, "round": 10, "type": "individual", "teamA": "#00f0ff", "playerA": "อินเวสต์", "teamB": "#ff4b5c", "playerB": "อาร์ชี่" },
        { "id": 21, "round": 11, "type": "individual", "teamA": "#ffd600", "playerA": "ไบรท์", "teamB": "#00f0ff", "playerB": "เท็นเท็น" },
        { "id": 22, "round": 11, "type": "individual", "teamA": "#00ff66", "playerA": "ภัฅ", "teamB": "#ff4b5c", "playerB": "ฟีนิกซ์" },
        { "id": 23, "round": 12, "type": "individual", "teamA": "#00ff66", "playerA": "ฟรานส์", "teamB": "#ff4b5c", "playerB": "ปุณณ์" },
        { "id": 24, "round": 12, "type": "individual", "teamA": "#00ff66", "playerA": "มีตังค์", "teamB": "#ff4b5c", "playerB": "TinTin" },
        { "id": 25, "round": 14, "type": "individual", "teamA": "#ff4b5c", "playerA": "ท้องฟ้า", "teamB": "#00ff66", "playerB": "Glad" }
    ],
    // Game 2 — Hockey (2v2 สีปะทะสี)  — รอบ 14 = รอบเก็บตก จับเพื่อนรุ่นเดียวกันมาช่วย
    "2": [
        { "id": 1, "round": 1, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ตะวัน", "playerA2": "TinTin", "playerB1": "Cani", "playerB2": "อิงอิง" },
        { "id": 2, "round": 2, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "โปรดปราน", "playerA2": "ภูเขา", "playerB1": "มีตังค์", "playerB2": "ขอบคุณ" },
        { "id": 3, "round": 3, "type": "pole", "teamA": "#ffd600", "teamB": "#00f0ff", "playerA1": "ใบบุญ", "playerA2": "ก้าว", "playerB1": "ปราบ", "playerB2": "เชอริล" },
        { "id": 4, "round": 4, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "เท็นเท็น", "playerA2": "อะตอมW", "playerB1": "ภัฅ", "playerB2": "ฟรานส์" },
        { "id": 5, "round": 5, "type": "pole", "teamA": "#ff4b5c", "teamB": "#00ff66", "playerA1": "พายุ", "playerA2": "ยูตะ", "playerB1": "ปุณณ์ W", "playerB2": "นาคินทร์" },
        { "id": 6, "round": 6, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ฟีนิกซ์", "playerA2": "ปุณณ์", "playerB1": "ไบรท์", "playerB2": "ลูกแก้ว" },
        { "id": 7, "round": 7, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "อาร์ชี่", "playerA2": "นาคิน", "playerB1": "เซนต์", "playerB2": "คิน" },
        { "id": 8, "round": 8, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "อินเวสต์", "playerA2": "ไทเป", "playerB1": "เลโก้", "playerB2": "ปุงปัง" },
        { "id": 9, "round": 9, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ท้องฟ้า", "playerA2": "ภูผา", "playerB1": "ดีเซล", "playerB2": "จินดา" },
        { "id": 10, "round": 10, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "อุ่นใจ", "playerA2": "ณคุณ", "playerB1": "เชฟ", "playerB2": "Glad" },
        { "id": 11, "round": 11, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ลอฟต์", "playerA2": "แมนต้า", "playerB1": "ภาคิน", "playerB2": "พรีมพรีม" },  // <== รุ่นปนไม่สมดุล (เลี่ยงไม่ได้)
        { "id": 12, "round": 12, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "กราฟิก", "playerA2": "เอ็ดก้า", "playerB1": "อาเหยียน", "playerB2": "ฟลินน์" },
        { "id": 13, "round": 14, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "อคิณ", "playerA2": "แมนต้า", "playerB1": "ลูกแก้ว", "playerB2": "ภาคิน" }
    ],
    // Game 3 — Fishing (4 สี สีละ 1 คน)  — รอบ 14 = รอบเก็บตก จับเพื่อนรุ่นเดียวกันมาช่วย
    "3": [
        { "id": 1, "round": 1, "type": "fishing", "playerYellow": "ใบบุญ", "playerGreen": "Glad", "playerBlue": "อุ่นใจ", "playerRed": "ยูตะ" },
        { "id": 2, "round": 2, "type": "fishing", "playerYellow": "ไบรท์", "playerGreen": "ภัฅ", "playerBlue": "เท็นเท็น", "playerRed": "แมนต้า" },
        { "id": 3, "round": 3, "type": "fishing", "playerYellow": "คิน", "playerGreen": "เชฟ", "playerBlue": "ไทเป", "playerRed": "นาคิน" },
        { "id": 4, "round": 4, "type": "fishing", "playerYellow": "พรีมพรีม", "playerGreen": "มีตังค์", "playerBlue": "ภูเขา", "playerRed": "TinTin" },
        { "id": 5, "round": 5, "type": "fishing", "playerYellow": "ก้าว", "playerGreen": "ปุงปัง", "playerBlue": "เชอริล", "playerRed": "ตะวัน" },
        { "id": 6, "round": 6, "type": "fishing", "playerYellow": "ดีเซล", "playerGreen": "เลโก้", "playerBlue": "อินเวสต์", "playerRed": "ภูผา" },
        { "id": 7, "round": 7, "type": "fishing", "playerYellow": "อิงอิง", "playerGreen": "อาเหยียน", "playerBlue": "ณคุณ", "playerRed": "ท้องฟ้า" },
        { "id": 8, "round": 8, "type": "fishing", "playerYellow": "ภาคิน", "playerGreen": "ฟรานส์", "playerBlue": "เอ็ดก้า", "playerRed": "ฟีนิกซ์" },
        { "id": 9, "round": 9, "type": "fishing", "playerYellow": "ใบบุญ", "playerGreen": "นาคินทร์", "playerBlue": "กราฟิก", "playerRed": "ลอฟต์" },
        { "id": 10, "round": 10, "type": "fishing", "playerYellow": "ลูกแก้ว", "playerGreen": "ฟลินน์", "playerBlue": "อะตอมW", "playerRed": "ปุณณ์" },
        { "id": 11, "round": 11, "type": "fishing", "playerYellow": "Cani", "playerGreen": "ขอบคุณ", "playerBlue": "โปรดปราน", "playerRed": "อคิณ" },
        { "id": 12, "round": 12, "type": "fishing", "playerYellow": "จินดา", "playerGreen": "ปุงปัง", "playerBlue": "เชอริล", "playerRed": "พายุ" },
        { "id": 13, "round": 14, "type": "fishing", "playerYellow": "เซนต์", "playerGreen": "ปุณณ์ W", "playerBlue": "ปราบ", "playerRed": "อาร์ชี่" }
    ],
    // Game 4 — Pole Fighting (2v2 สีปะทะสี)  — รอบ 14 = รอบเก็บตก จับเพื่อนรุ่นเดียวกันมาช่วย
    "4": [
        { "id": 1, "round": 1, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "เชอริล", "playerA2": "อะตอมW", "playerB1": "ฟรานส์", "playerB2": "ปุงปัง" },
        { "id": 2, "round": 2, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ฟีนิกซ์", "playerA2": "ปุณณ์", "playerB1": "ภาคิน", "playerB2": "ลูกแก้ว" },
        { "id": 3, "round": 3, "type": "pole", "teamA": "#ff4b5c", "teamB": "#00ff66", "playerA1": "อาร์ชี่", "playerA2": "ท้องฟ้า", "playerB1": "ปุณณ์ W", "playerB2": "ฟลินน์" },  // <== รุ่นปนไม่สมดุล (เลี่ยงไม่ได้)
        { "id": 4, "round": 4, "type": "pole", "teamA": "#ffd600", "teamB": "#00f0ff", "playerA1": "อิงอิง", "playerA2": "ดีเซล", "playerB1": "อินเวสต์", "playerB2": "อุ่นใจ" },
        { "id": 5, "round": 5, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "ปราบ", "playerA2": "กราฟิก", "playerB1": "Glad", "playerB2": "อาเหยียน" },
        { "id": 6, "round": 6, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "ภูเขา", "playerA2": "เอ็ดก้า", "playerB1": "ภัฅ", "playerB2": "ขอบคุณ" },
        { "id": 7, "round": 7, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "ลอฟต์", "playerA2": "อคิณ", "playerB1": "จินดา", "playerB2": "พรีมพรีม" },
        { "id": 8, "round": 8, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "โปรดปราน", "playerA2": "เท็นเท็น", "playerB1": "ฟลินน์", "playerB2": "มีตังค์" },
        { "id": 9, "round": 9, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "แมนต้า", "playerA2": "TinTin", "playerB1": "ไบรท์", "playerB2": "Cani" },
        { "id": 10, "round": 10, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "พายุ", "playerA2": "ตะวัน", "playerB1": "เซนต์", "playerB2": "คิน" },
        { "id": 11, "round": 11, "type": "pole", "teamA": "#ff4b5c", "teamB": "#ffd600", "playerA1": "นาคิน", "playerA2": "ยูตะ", "playerB1": "ก้าว", "playerB2": "ใบบุญ" },
        { "id": 12, "round": 13, "type": "pole", "teamA": "#00f0ff", "teamB": "#00ff66", "playerA1": "ณคุณ", "playerA2": "ไทเป", "playerB1": "เลโก้", "playerB2": "นาคินทร์" },
        { "id": 13, "round": 14, "type": "pole", "teamA": "#ff4b5c", "teamB": "#00ff66", "playerA1": "ภูผา", "playerA2": "ฟีนิกซ์", "playerB1": "เชฟ", "playerB2": "ภัฅ" }
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
            "playerB2": "ซอจุน"
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
            "playerRed": "ซอจุน"
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
            "playerB1": "ซอจุน",
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


// Player Name Auto-Suggestions Logic (Separated by Category and Color Hex)
const COLOR_SUGGESTIONS = {
    'saturday': {
        '#00f0ff': ['ดาวา', 'อันดา', 'อายชิลต์', 'เจเจ', 'เมทัล', 'เต็นท์'],
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

        '#ff4b5c': ['ลีโอ', 'ซอจุน', 'Onewon', 'Smith', 'ทีเค', 'แพงตอง', 'TottiWBB', 'ปอท่อ', 'ภูดิน', 'คามิน', 'ปุ๊บปั๊บ', 'ออนเซน']
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

    if (state.activeCategory === 'saturday' || state.activeCategory === 'sunday_small' || state.activeCategory === 'sunday_big') {
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
            const isWeightMatchup = currentGameName === 'Pick and Place';
            const suffixText = isWeightMatchup ? " กก." : " แต้ม";
            const suffixLabel = isWeightMatchup ? "น้ำหนัก" : "แต้ม";
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
    const dataset = state.activeCategory === 'sunday_big' 
        ? SUNDAY_BIG_MATCHES 
        : (state.activeCategory === 'saturday' ? SATURDAY_MATCHES : SUNDAY_SMALL_MATCHES);
    const activeMatches = dataset[state.activeGame] || [];
    
    // Filter matches based on search query
    const filtered = activeMatches.filter(match => {
        if (!searchQuery) return true;
        if (match.type === 'individual') {
            return [match.playerA, match.playerB].some(name => name && name.toLowerCase().includes(searchQuery));
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

    filtered.forEach(match => {
        const card = document.createElement('div');
        const isCurrentActive = state.activeMatchId === match.id.toString();
        card.className = `player-card match-card ${isCurrentActive ? 'active-match' : ''}`;
        
        let record = null;
        let isPlayed = false;

        const isMatchup = checkIfMatchupGame(state.activeGame, state.activeCategory);
        if (isMatchup) {
            record = allScores.find(p => p.matchId === match.id.toString() || 
                (!p.matchId && p.playerA === match.playerA && p.playerB === match.playerB) ||
                (!p.matchId && p.playerA === match.playerB && p.playerB === match.playerA));
            isPlayed = !!record;

            if (isPlayed) card.classList.add('played-match');
            card.style.background = `linear-gradient(90deg, ${match.teamA}0d 0%, ${match.teamB}0d 100%)`;
            card.style.borderLeft = `4px solid ${match.teamA}`;
            card.style.borderRight = `4px solid ${match.teamB}`;

            const nameAColor = HEX_TO_NAME[match.teamA] || '';
            const nameBColor = HEX_TO_NAME[match.teamB] || '';

            let resultHTML = '';
            if (isPlayed) {
                const isWinA = record.winner === 'A';
                const winLabelA = isWinA ? '🏆 ชนะ' : 'แพ้';
                const winLabelB = !isWinA ? '🏆 ชนะ' : 'แพ้';
                
                const currentGameName = getActiveGameName(state.activeGame);
                const isWeightMatchup = currentGameName === 'Pick and Place';
                const suffixText = isWeightMatchup ? " กก." : " แต้ม";
                const scoreLabelA = (record.weightA !== undefined && record.weightA !== '') ? `${record.weightA}${suffixText}` : `${record.scoreA || 0} แต้ม`;
                const scoreLabelB = (record.weightB !== undefined && record.weightB !== '') ? `${record.weightB}${suffixText}` : `${record.scoreB || 0} แต้ม`;

                resultHTML = `
                    <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; gap:1rem;">
                        <span style="color:${match.teamA}; font-weight:${isWinA ? '700' : 'normal'}">${winLabelA} (${scoreLabelA})</span>
                        <span style="color:var(--text-muted)">|</span>
                        <span style="color:${match.teamB}; font-weight:${!isWinA ? '700' : 'normal'}">${winLabelB} (${scoreLabelB})</span>
                    </div>
                `;
            } else {
                resultHTML = `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">สถานะ: ยังไม่ได้แข่ง</div>`;
            }

            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.85rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">รอบที่ ${match.id}</div>
                <div class="player-name" style="display:flex; flex-direction:column; gap:0.1rem; width: 100%; overflow: visible; white-space: normal;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; font-size: 1.05rem;">
                        <span style="color:${match.teamA}; font-weight:700;">น้อง${escapeHTML(match.playerA)} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(ทีมสี${nameAColor})</span></span>
                        <span style="color:var(--text-muted); font-size:0.8rem; font-weight:bold;">VS</span>
                        <span style="color:${match.teamB}; font-weight:700;">น้อง${escapeHTML(match.playerB)} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(ทีมสี${nameBColor})</span></span>
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
                    enterMatchEditMode(record);
                    state.activeMatchId = match.id.toString();
                    renderLeaderboard();
                });
                card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(record.id));
            } else {
                card.querySelector('.btn-play-match').addEventListener('click', () => {
                    state.activeMatchId = match.id.toString();
                    state.match.teamA = match.teamA;
                    state.match.teamB = match.teamB;
                    updateMatchFormUI();
                    updateMatchPlayerDropdown('A', match.playerA);
                    updateMatchPlayerDropdown('B', match.playerB);
                    
                    const wA = document.getElementById('match-weight-a');
                    const wB = document.getElementById('match-weight-b');
                    if (wA) wA.value = '';
                    if (wB) wB.value = '';
                    
                    DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                    renderLeaderboard();
                    showToast(`เตรียมตัวคู่ที่ ${match.id}: น้อง${match.playerA} vs น้อง${match.playerB}`, "info");
                });
            }
        }
        else if (match.type === 'individual') {
            const matchIdA = match.id.toString() + '-A';
            const matchIdB = match.id.toString() + '-B';
            const recordA = allScores.find(p => p.matchId === matchIdA || (!p.matchId && p.name === match.playerA));
            const recordB = allScores.find(p => p.matchId === matchIdB || (!p.matchId && p.name === match.playerB));
            const isPlayedA = !!recordA;
            const isPlayedB = !!recordB;
            isPlayed = isPlayedA && isPlayedB;

            if (isPlayed) card.classList.add('played-match');
            card.style.background = `linear-gradient(90deg, ${match.teamA}0d 0%, ${match.teamB}0d 100%)`;
            card.style.borderLeft = `4px solid ${match.teamA}`;
            card.style.borderRight = `4px solid ${match.teamB}`;

            const nameAColor = HEX_TO_NAME[match.teamA] || '';
            const nameBColor = HEX_TO_NAME[match.teamB] || '';

            const hitsLabel = (rec) => {
                if (!rec) return '';
                if (getActiveGameName(state.activeGame) !== 'Bowling') return '';
                if (rec.score === 100) return '[โดน 3 อัน]';
                if (rec.score === 60) return '[โดน 2 อัน]';
                if (rec.score === 30) return '[โดน 1 อัน]';
                return '[โดน 0 อัน]';
            };

            const playBtnHTML = `
                <button class="btn-primary btn-play-match" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: var(--accent); color: #000; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px var(--accent-glow);">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    เริ่มแข่ง
                </button>
            `;
            const editBtnHTML = (id) => `
                <button class="icon-btn btn-edit" title="แก้ไขคะแนน" data-id="${id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            `;

            card.innerHTML = `
                <div class="rank-badge" style="font-size: 0.85rem; width: auto; padding: 0 0.5rem; background: rgba(255,255,255,0.03); color: var(--text-secondary);">รอบที่ ${match.id}</div>
                <div class="player-name" style="display:flex; flex-direction:column; gap:0.4rem; width: 100%; overflow: visible; white-space: normal;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span class="color-dot" style="background-color: ${match.teamA}; box-shadow: 0 0 6px ${match.teamA}a0;"></span>
                            <span style="font-weight: 700; font-size:1.05rem;">น้อง${escapeHTML(match.playerA)}</span>
                            <span style="color: var(--text-muted); font-size:0.8rem;">(ทีมสี${nameAColor})</span>
                            ${isPlayedA ? `<span style="font-size:0.85rem; color:#00ff66; font-weight:600; text-shadow:0 0 8px #00ff6640;">คะแนน: ${formatNumber(recordA.score)} แต้ม ${hitsLabel(recordA)}</span>` : `<span style="font-size:0.85rem; color:var(--text-muted);">ยังไม่ได้แข่ง</span>`}
                        </div>
                        <div class="card-actions" style="margin:0;">${isPlayedA ? editBtnHTML(recordA.id) : playBtnHTML}</div>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span class="color-dot" style="background-color: ${match.teamB}; box-shadow: 0 0 6px ${match.teamB}a0;"></span>
                            <span style="font-weight: 700; font-size:1.05rem;">น้อง${escapeHTML(match.playerB)}</span>
                            <span style="color: var(--text-muted); font-size:0.8rem;">(ทีมสี${nameBColor})</span>
                            ${isPlayedB ? `<span style="font-size:0.85rem; color:#00ff66; font-weight:600; text-shadow:0 0 8px #00ff6640;">คะแนน: ${formatNumber(recordB.score)} แต้ม ${hitsLabel(recordB)}</span>` : `<span style="font-size:0.85rem; color:var(--text-muted);">ยังไม่ได้แข่ง</span>`}
                        </div>
                        <div class="card-actions" style="margin:0;">${isPlayedB ? editBtnHTML(recordB.id) : playBtnHTML}</div>
                    </div>
                </div>
                <div class="card-actions"></div>
            `;

            const startPlayer = (matchId, hex, name) => {
                selectColorByHex(hex);
                DOM.playerNameInput.value = name;
                state.activeMatchId = matchId;
                document.querySelectorAll('#objects-hit-group .objects-selector button').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-hits') === '0');
                });
                DOM.playerScoreInput.value = '0';
                DOM.scoreForm.scrollIntoView({ behavior: 'smooth' });
                renderLeaderboard();
                showToast(`เตรียมตัวคู่ที่ ${match.id}: น้อง${name}`, "info");
            };

            const rowAActionEl = card.querySelectorAll('.card-actions')[0];
            const rowBActionEl = card.querySelectorAll('.card-actions')[1];

            if (isPlayedA) {
                rowAActionEl.querySelector('.btn-edit').addEventListener('click', () => {
                    enterEditMode(recordA);
                    state.activeMatchId = matchIdA;
                    renderLeaderboard();
                });
            } else {
                rowAActionEl.querySelector('.btn-play-match').addEventListener('click', () => {
                    startPlayer(matchIdA, match.teamA, match.playerA);
                });
            }

            if (isPlayedB) {
                rowBActionEl.querySelector('.btn-edit').addEventListener('click', () => {
                    enterEditMode(recordB);
                    state.activeMatchId = matchIdB;
                    renderLeaderboard();
                });
            } else {
                rowBActionEl.querySelector('.btn-play-match').addEventListener('click', () => {
                    startPlayer(matchIdB, match.teamB, match.playerB);
                });
            }
        }
        else if (match.type === 'pole') {
            // Find score for Game 2 (Hockey) & Game 4 (Pole Fighting)
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
            // Find score for Game 3 (Fishing)
            record = allScores.find(p => p.matchId === match.id.toString() || (!p.matchId && p.nameYellow === match.playerYellow && p.nameGreen === match.playerGreen && p.nameBlue === match.playerBlue && p.nameRed === match.playerRed));
            isPlayed = !!record;

            if (isPlayed) card.classList.add('played-match');
            card.style.background = `rgba(255, 255, 255, 0.01)`;
            card.style.borderLeft = `4px solid #ffd600`;

            let resultHTML = '';
            if (isPlayed) {
                resultHTML = `
                    <div style="font-size:0.85rem; margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.5rem 0.8rem; overflow:visible;">
                        <span style="color: #ffd600; font-weight: 600;">🟡 ${escapeHTML(match.playerYellow)}: ${record.fishYellow} ตัว (${record.scoreYellow} แต้ม)</span>
                        <span style="color: #00ff66; font-weight: 600;">🟢 ${escapeHTML(match.playerGreen)}: ${record.fishGreen} ตัว (${record.scoreGreen} แต้ม)</span>
                        <span style="color: #00f0ff; font-weight: 600;">🔵 ${escapeHTML(match.playerBlue)}: ${record.fishBlue} ตัว (${record.scoreBlue} แต้ม)</span>
                        <span style="color: #ff4b5c; font-weight: 600;">🔴 ${escapeHTML(match.playerRed)}: ${record.fishRed} ตัว (${record.scoreRed} แต้ม)</span>
                    </div>
                `;
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
                    <div style="font-size: 0.95rem; font-weight:600;">การแข่งตกปลา 4 สี</div>
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
                    enterFishingEditMode(record);
                    state.activeMatchId = match.id.toString();
                    renderLeaderboard();
                });
                card.querySelector('.btn-delete').addEventListener('click', () => deletePlayer(record.id));
            } else {
                card.querySelector('.btn-play-match').addEventListener('click', () => {
                    state.activeMatchId = match.id.toString();
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
    
    if (isFishingGame) {
        csvContent = "Round,Yellow,Yellow Score,Green,Green Score,Blue,Blue Score,Red,Red Score\n";
        const sorted = [...allScores].sort((a, b) => a.timestamp - b.timestamp);
        sorted.forEach((round, idx) => {
            csvContent += `รอบที่ ${idx + 1},${round.fishYellow || 0},${round.scoreYellow || 0},${round.fishGreen || 0},${round.scoreGreen || 0},${round.fishBlue || 0},${round.scoreBlue || 0},${round.fishRed || 0},${round.scoreRed || 0}\n`;
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
function calculateColorTotals(includeFake = true) {
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
                if (player.isFishing) {
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
    
    if (includeFake && state.fakeScores) {
        Object.keys(state.fakeScores).forEach(color => {
            if (totals[color] !== undefined) {
                totals[color] += state.fakeScores[color] || 0;
            }
        });
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
            <div class="summary-score-value" style="color: ${color.hex};">0</div>
            <div class="summary-bar-track-vertical">
                <!-- Pulley wheel -->
                <div class="summary-pulley">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${color.hex}" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" fill="${color.hex}" />
                        <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
                    </svg>
                </div>
                
                <!-- Left rope (Load rope) -->
                <div class="summary-bar-rope-left" style="height: 100%;"></div>
                
                <!-- Bar fill -->
                <div class="summary-bar-fill-vertical" style="height: 0%; background-color: ${color.hex};">
                    <div class="summary-bar-hook">
                        <svg viewBox="0 0 24 24" fill="none" stroke="${color.hex}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="7" r="4" fill="rgba(0,0,0,0.6)" />
                            <path d="M12 11v8" />
                            <rect x="9" y="15" width="6" height="4" rx="1" fill="${color.hex}" />
                        </svg>
                    </div>
                </div>
                
                <!-- Right rope (Pull rope) -->
                <div class="summary-bar-rope-right" style="height: 20%;"></div>
                
                <!-- Worker/Person silhouette pulling the rope -->
                <div class="summary-puller" style="color: ${color.hex}80;">
                    <svg viewBox="0 0 64 64" fill="currentColor">
                        <circle cx="22" cy="14" r="4" />
                        <path d="M22 20c-3 0-5 5-4 10l5 15h4l-4-15c1-3 0-8-1-10z" />
                        <path d="M23 45l-8 15h5l7-12 1 12h5l-2-15z" />
                        <path d="M21 23l16 -6l1 2l-16 6z" />
                        <path d="M21 26l16 2l0-2l-16 -2z" />
                    </svg>
                </div>
            </div>
            <div class="summary-color-label">
                <span class="summary-color-dot" style="background-color: ${color.hex}; box-shadow: 0 0 10px ${color.hex}a0;"></span>
                <span>${color.name}</span>
            </div>
        `;
        
        DOM.summaryChartContainer.appendChild(column);
        
        // Trigger height transition and number count-up animation
        setTimeout(() => {
            const fill = column.querySelector('.summary-bar-fill-vertical');
            const ropeLeft = column.querySelector('.summary-bar-rope-left');
            const ropeRight = column.querySelector('.summary-bar-rope-right');
            const pulley = column.querySelector('.summary-pulley');
            const puller = column.querySelector('.summary-puller');
            
            const easing = 'height 3s cubic-bezier(0.15, 0.85, 0.3, 1)';
            
            if (fill) {
                fill.style.transition = easing;
                fill.style.height = `${percentage}%`;
            }
            if (ropeLeft) {
                ropeLeft.style.transition = easing;
                ropeLeft.style.height = `${100 - percentage}%`;
            }
            if (ropeRight) {
                ropeRight.style.transition = easing;
                ropeRight.style.height = `${20 + percentage * 0.8}%`;
            }
            if (pulley) {
                pulley.style.transform = `translateX(-50%) rotate(${percentage * 3.6}deg)`;
            }
            if (puller && percentage > 0) {
                puller.classList.add('pulling');
                setTimeout(() => {
                    puller.classList.remove('pulling');
                }, 3000);
            }
            
            const valEl = column.querySelector('.summary-score-value');
            if (valEl && color.score > 0) {
                animateNumber(valEl, 0, color.score, 3000);
            } else if (valEl) {
                valEl.textContent = '0';
            }
        }, 50);
    });
}

// Helper function to animate number counting up
function animateNumber(element, start, end, duration) {
    let startTime = null;
    
    function update(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Cubic ease out curve: matches the bar rising transition beautifully
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeProgress);
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatNumber(end);
        }
    }
    
    requestAnimationFrame(update);
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

function startFinalReveal() {
    const overlay = document.getElementById('curtain-overlay');
    if (!overlay) return;
    
    // Add open class to slide curtains left and right
    overlay.classList.add('open');
    
    // Disable click events on overlay button
    const startRevealBtn = document.getElementById('start-reveal-btn');
    if (startRevealBtn) startRevealBtn.disabled = true;
    
    const totals = calculateColorTotals();
    const hexToName = {
        '#00f0ff': 'ทีมสีน้ำเงิน',
        '#ff4b5c': 'ทีมสีแดง',
        '#ffd600': 'ทีมสีเหลือง',
        '#00ff66': 'ทีมสีเขียว'
    };
    
    const activeHexes = state.activeCategory === 'saturday'
        ? ['#00f0ff', '#ff4b5c']
        : ['#00f0ff', '#ff4b5c', '#ffd600', '#00ff66'];
        
    // Staggered reveal list: sorted from lowest score to highest score (ascending)
    const revealList = activeHexes.map(hex => ({
        hex: hex,
        name: hexToName[hex] || 'ทีมสีนิรนาม',
        score: totals[hex] || 0
    })).sort((a, b) => a.score - b.score);
    
    const maxScore = Math.max(...revealList.map(c => c.score));
    
    // Play suspense tick roll
    const totalRevealTime = 2000 + revealList.length * 2000;
    AudioFX.playSuspense(totalRevealTime);

    // Render columns in standard left-to-right order (Blue, Red, Yellow, Green)
    const defaultOrder = ['#00f0ff', '#ff4b5c', '#ffd600', '#00ff66'].filter(hex => activeHexes.includes(hex));
    
    DOM.summaryChartContainer.innerHTML = '';
    
    const colMap = {};
    
    defaultOrder.forEach(hex => {
        const score = totals[hex] || 0;
        const name = hexToName[hex] || 'ทีมสีนิรนาม';
        const column = document.createElement('div');
        column.className = 'summary-chart-column';
        column.innerHTML = `
            <div class="summary-score-value" style="color: ${hex};">0</div>
            <div class="summary-bar-track-vertical">
                <!-- Pulley wheel -->
                <div class="summary-pulley">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" fill="${hex}" />
                        <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
                    </svg>
                </div>
                
                <!-- Left rope (Load rope) -->
                <div class="summary-bar-rope-left" style="height: 100%;"></div>
                
                <!-- Bar fill -->
                <div class="summary-bar-fill-vertical" style="height: 0%; background-color: ${hex};">
                    <div class="summary-bar-hook">
                        <svg viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="7" r="4" fill="rgba(0,0,0,0.6)" />
                            <path d="M12 11v8" />
                            <rect x="9" y="15" width="6" height="4" rx="1" fill="${hex}" />
                        </svg>
                    </div>
                </div>
                
                <!-- Right rope (Pull rope) -->
                <div class="summary-bar-rope-right" style="height: 20%;"></div>
                
                <!-- Worker/Person silhouette pulling the rope -->
                <div class="summary-puller" style="color: ${hex}80;">
                    <svg viewBox="0 0 64 64" fill="currentColor">
                        <circle cx="22" cy="14" r="4" />
                        <path d="M22 20c-3 0-5 5-4 10l5 15h4l-4-15c1-3 0-8-1-10z" />
                        <path d="M23 45l-8 15h5l7-12 1 12h5l-2-15z" />
                        <path d="M21 23l16 -6l1 2l-16 6z" />
                        <path d="M21 26l16 2l0-2l-16 -2z" />
                    </svg>
                </div>
            </div>
            <div class="summary-color-label">
                <span class="summary-color-dot" style="background-color: ${hex}; box-shadow: 0 0 10px ${hex}a0;"></span>
                <span>${name}</span>
            </div>
        `;
        DOM.summaryChartContainer.appendChild(column);
        colMap[hex] = column;
    });
    
    // Wait for curtains to slide open (1.5 seconds)
    setTimeout(() => {
        // Start all ropes, pulleys, and numbers randomizing
        revealList.forEach((item, index) => {
            const column = colMap[item.hex];
            if (!column) return;
            
            const fill = column.querySelector('.summary-bar-fill-vertical');
            const ropeLeft = column.querySelector('.summary-bar-rope-left');
            const ropeRight = column.querySelector('.summary-bar-rope-right');
            const pulley = column.querySelector('.summary-pulley');
            const puller = column.querySelector('.summary-puller');
            const valEl = column.querySelector('.summary-score-value');
            
            // Start rapid randomization
            let interval = setInterval(() => {
                valEl.textContent = formatNumber(Math.floor(Math.random() * Math.max(item.score * 1.5, 50)));
            }, 50);
            
            if (puller) puller.classList.add('pulling');
            
            // Settle this column after a staggered delay
            const settleDelay = 2000 + index * 2000;
            
            setTimeout(() => {
                clearInterval(interval);
                
                const percentage = maxScore > 0 ? (item.score / maxScore) * 100 : 0;
                const easing = 'height 2.5s cubic-bezier(0.15, 0.85, 0.3, 1)';
                
                if (fill) {
                    fill.style.transition = easing;
                    fill.style.height = `${percentage}%`;
                }
                if (ropeLeft) {
                    ropeLeft.style.transition = easing;
                    ropeLeft.style.height = `${100 - percentage}%`;
                }
                if (ropeRight) {
                    ropeRight.style.transition = easing;
                    ropeRight.style.height = `${20 + percentage * 0.8}%`;
                }
                if (pulley) {
                    pulley.style.transform = `translateX(-50%) rotate(${percentage * 3.6}deg)`;
                }
                
                // Animate final numbers settling
                animateNumber(valEl, 0, item.score, 2500);
                
                // Trigger glow/bounce class on column
                column.classList.add('settled');
                
                // Play settle chime
                AudioFX.playSettle();
                
                // Winner revealed! Trigger fireworks & applause
                if (index === revealList.length - 1) {
                    setTimeout(() => {
                        Fireworks.start();
                        AudioFX.playApplause();
                        
                        setTimeout(() => {
                            Fireworks.stop();
                        }, 8000);
                    }, 1000);
                }
                
                setTimeout(() => {
                    if (puller) puller.classList.remove('pulling');
                }, 2500);
            }, settleDelay);
        });
        
        // Hide the curtain overlay completely after all reveals are finished
        const totalRevealDuration = 2000 + revealList.length * 2000 + 3000;
        setTimeout(() => {
            overlay.style.display = 'none';
        }, totalRevealDuration);
    }, 1500);
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
    
    // Toggle Maesi tab visibility
    const maesiTab = document.getElementById('tab-game-maesi');
    if (maesiTab) {
        maesiTab.style.display = (categoryKey === 'sunday_small' || categoryKey === 'sunday_big') ? 'flex' : 'none';
    }

    updateColorMode();
    // Load scores for this category
    loadData();
    
    // If Firebase is active, setup real-time listener
    if (isFirebaseConnected) {
        setupRealtimeSync(categoryKey);
    }
    
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
    
    // Unsubscribe from Firestore snapshot listener
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }
    
    // Toggle Maesi tab visibility
    const maesiTab = document.getElementById('tab-game-maesi');
    if (maesiTab) {
        maesiTab.style.display = 'none';
    }

    // Show/Hide Containers
    DOM.appContainer.style.display = 'none';
    DOM.portalContainer.style.display = 'flex';
    DOM.body.style.overflow = 'auto';
    
    // Exit edit mode if left open
    exitEditMode();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function updateColorMode() {
    const isSaturday = state.activeCategory === 'saturday';

    document.querySelectorAll('[data-hex="#ffd600"], [data-hex="#00ff66"]')
        .forEach(btn => {
            btn.style.display = isSaturday ? 'none' : '';
        });
}

function renderAdminScoresTable() {
    const tableBody = document.querySelector('#admin-scores-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const hexToName = {
        '#00f0ff': 'น้ำเงิน',
        '#ff4b5c': 'แดง',
        '#ffd600': 'เหลือง',
        '#00ff66': 'เขียว'
    };
    
    const activeHexes = state.activeCategory === 'saturday'
        ? ['#00f0ff', '#ff4b5c']
        : ['#00f0ff', '#ff4b5c', '#ffd600', '#00ff66'];
        
    const realTotals = calculateColorTotals(false);
    const displayTotals = calculateColorTotals(true);
    
    activeHexes.forEach(hex => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        
        const name = hexToName[hex] || hex;
        const real = realTotals[hex] || 0;
        const fake = state.fakeScores[hex] || 0;
        const total = displayTotals[hex] || 0;
        
        const fakeText = fake > 0 ? `+${fake}` : (fake < 0 ? `${fake}` : '0');
        const fakeColor = fake > 0 ? '#00ff66' : (fake < 0 ? '#ff4b5c' : 'var(--text-secondary)');
        
        tr.innerHTML = `
            <td style="padding: 0.6rem 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #fff;">
                <span class="color-dot-small" style="background-color: ${hex}; box-shadow: 0 0 6px ${hex}a0;"></span>
                ทีมสี${name}
            </td>
            <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 600; color: #fff;">${formatNumber(real)}</td>
            <td style="padding: 0.6rem 0.8rem; text-align: right; color: ${fakeColor}; font-weight: bold;">${fakeText}</td>
            <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 700; color: ${hex};">${formatNumber(total)}</td>
            <td style="padding: 0.6rem 0.8rem; text-align: center;">
                <button type="button" class="icon-btn btn-delete admin-delete-fake-btn" data-hex="${hex}" title="ลบคะแนนหลอก" style="margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        
        // Add delete listener
        tr.querySelector('.admin-delete-fake-btn').addEventListener('click', () => {
            state.fakeScores[hex] = 0;
            saveData();
            renderAdminScoresTable();
            renderSummaryChart();
            showToast(`ลบคะแนนหลอกของทีมสี${name}แล้ว`, "success");
        });
        
        tableBody.appendChild(tr);
    });
}

function renderMaesiPanel() {
    const grid = document.getElementById('maesi-grid-container');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (state.activeCategory !== 'sunday_small' && state.activeCategory !== 'sunday_big') {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p style="font-weight: 500; font-size: 1.1rem;">ระบบเช็คชื่อแม่สีเปิดใช้งานสำหรับหมวดหมู่วันอาทิตย์เท่านั้น</p></div>';
        return;
    }
    
    const cat = state.activeCategory;
    const colors = [
        { name: 'สีน้ำเงิน (ฟ้า)', hex: '#00f0ff', players: (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat]['#00f0ff']) || [] },
        { name: 'สีแดง', hex: '#ff4b5c', players: (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat]['#ff4b5c']) || [] },
        { name: 'สีเหลือง', hex: '#ffd600', players: (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat]['#ffd600']) || [] },
        { name: 'สีเขียว', hex: '#00ff66', players: (COLOR_SUGGESTIONS[cat] && COLOR_SUGGESTIONS[cat]['#00ff66']) || [] }
    ];
    
    colors.forEach(color => {
        const card = document.createElement('div');
        card.className = 'maesi-card';
        card.style.borderTop = `4px solid ${color.hex}`;
        
        let playerRowsHTML = '';
        if (color.players && color.players.length > 0) {
            color.players.forEach(player => {
                const checked1 = (state.maesiChecklist && state.maesiChecklist[player] && state.maesiChecklist[player]["1"]) ? 'checked' : '';
                const checked2 = (state.maesiChecklist && state.maesiChecklist[player] && state.maesiChecklist[player]["2"]) ? 'checked' : '';
                const checked3 = (state.maesiChecklist && state.maesiChecklist[player] && state.maesiChecklist[player]["3"]) ? 'checked' : '';
                const checked4 = (state.maesiChecklist && state.maesiChecklist[player] && state.maesiChecklist[player]["4"]) ? 'checked' : '';
                
                playerRowsHTML += `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                        <td style="padding: 0.6rem 0.25rem; font-weight: 600; color: #fff; white-space: nowrap;">น้อง${player}</td>
                        <td style="padding: 0.6rem 0.25rem; text-align: center;">
                            <input type="checkbox" class="maesi-checkbox-input" data-player="${player}" data-game="1" ${checked1}>
                        </td>
                        <td style="padding: 0.6rem 0.25rem; text-align: center;">
                            <input type="checkbox" class="maesi-checkbox-input" data-player="${player}" data-game="2" ${checked2}>
                        </td>
                        <td style="padding: 0.6rem 0.25rem; text-align: center;">
                            <input type="checkbox" class="maesi-checkbox-input" data-player="${player}" data-game="3" ${checked3}>
                        </td>
                        <td style="padding: 0.6rem 0.25rem; text-align: center;">
                            <input type="checkbox" class="maesi-checkbox-input" data-player="${player}" data-game="4" ${checked4}>
                        </td>
                    </tr>
                `;
            });
        } else {
            playerRowsHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text-muted);">ไม่มีรายชื่อผู้เล่น</td></tr>`;
        }
        
        card.innerHTML = `
            <h3 style="font-size: 1.15rem; font-weight: 800; color: ${color.hex}; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span class="color-dot-small" style="background-color: ${color.hex}; box-shadow: 0 0 8px ${color.hex}a0;"></span>
                ทีม${color.name}
            </h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                            <th style="padding: 0.5rem 0.25rem;">ชื่อน้อง</th>
                            <th style="padding: 0.5rem 0.25rem; text-align: center; font-size: 1.1rem;" title="Bowling">🎳</th>
                            <th style="padding: 0.5rem 0.25rem; text-align: center; font-size: 1.1rem;" title="Hockey">🏒</th>
                            <th style="padding: 0.5rem 0.25rem; text-align: center; font-size: 1.1rem;" title="Fishing">🐟</th>
                            <th style="padding: 0.5rem 0.25rem; text-align: center; font-size: 1.1rem;" title="Pole Fighting">🤺</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerRowsHTML}
                    </tbody>
                </table>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

/* ==========================================================================
   WEB AUDIO API SYNTHESIZED SOUND EFFECTS (Drumroll, Chimes, Explosions, Claps)
   ========================================================================== */
const AudioFX = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    // Play a suspenseful ticking/rumble sound
    playSuspense(durationMs) {
        this.init();
        const ctx = this.ctx;
        
        // Low rumble oscillator
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + durationMs / 1000);
        
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
        
        // Fast repeating ticks for tension
        let startTime = ctx.currentTime;
        let endTime = startTime + durationMs / 1000;
        let tickInterval = 0.15; // start with 150ms
        
        function scheduleTick(time, interval) {
            if (time >= endTime) return;
            
            const tickOsc = ctx.createOscillator();
            const tickGain = ctx.createGain();
            
            tickOsc.type = 'sine';
            tickOsc.frequency.setValueAtTime(800, time);
            tickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
            
            tickGain.gain.setValueAtTime(0.06, time);
            tickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            
            tickOsc.connect(tickGain);
            tickGain.connect(ctx.destination);
            
            tickOsc.start(time);
            tickOsc.stop(time + 0.06);
            
            // Speed up ticks as time progresses
            const progress = (time - startTime) / (endTime - startTime);
            const nextInterval = Math.max(0.035, interval * (1 - progress * 0.45));
            
            setTimeout(() => {
                scheduleTick(ctx.currentTime, nextInterval);
            }, nextInterval * 1000);
        }
        
        scheduleTick(startTime, tickInterval);
    },
    
    // Play a celebratory chime when a column settles
    playSettle() {
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // Chime sweep (major arpeggio notes)
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
            const time = now + index * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.4);
        });
    },
    
    // Play explosion sound for fireworks
    playExplosion() {
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // Create noise buffer
        const bufferSize = ctx.sampleRate * 1.5; // 1.5s duration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Filter the noise to sound like a low rumble explosion
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(10, now + 1.2);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start(now);
        
        // Crackle tail sound (sparks popping)
        for (let i = 0; i < 8; i++) {
            const crackleTime = now + 0.1 + Math.random() * 0.8;
            const osc = ctx.createOscillator();
            const cg = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(3000 + Math.random() * 2000, crackleTime);
            
            cg.gain.setValueAtTime(0.02, crackleTime);
            cg.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.05);
            
            osc.connect(cg);
            cg.connect(ctx.destination);
            osc.start(crackleTime);
            osc.stop(crackleTime + 0.06);
        }
    },
    
    // Play crowd applause and cheering
    playApplause() {
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        // Create noise buffer for applause
        const bufferSize = ctx.sampleRate * 5; // 5 seconds duration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate filtered clapping impulses
        for (let i = 0; i < bufferSize; i++) {
            let val = Math.random() * 2 - 1;
            const timeInSec = i / ctx.sampleRate;
            const clapDensity = Math.sin(timeInSec * Math.PI / 5); // envelope
            if (Math.random() < 0.12 * clapDensity) {
                val += (Math.random() * 2 - 1) * 2;
            }
            data[i] = val;
        }
        
        const applause = ctx.createBufferSource();
        applause.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.Q.setValueAtTime(1.5, now);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.12, now + 3.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 5.0);
        
        applause.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        applause.start(now);
        
        // Cheering synthesized tone
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(210, now + 0.8);
        osc.frequency.linearRampToValueAtTime(180, now + 2.5);
        
        const cheerFilter = ctx.createBiquadFilter();
        cheerFilter.type = 'lowpass';
        cheerFilter.frequency.setValueAtTime(400, now);
        
        oscGain.gain.setValueAtTime(0.01, now);
        oscGain.gain.linearRampToValueAtTime(0.03, now + 0.6);
        oscGain.gain.linearRampToValueAtTime(0.015, now + 3.0);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 4.8);
        
        osc.connect(cheerFilter);
        cheerFilter.connect(oscGain);
        oscGain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 5.0);
    }
};

/* ==========================================================================
   CANVAS FIREWORKS SYSTEM
   ========================================================================== */
const Fireworks = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,
    running: false,
    launchInterval: null,
    
    init() {
        this.canvas = document.getElementById('fireworks-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
    },
    
    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },
    
    start() {
        if (this.running) return;
        this.init();
        this.running = true;
        this.particles = [];
        this.loop();
        
        // Periodically launch fireworks
        this.launchInterval = setInterval(() => {
            if (this.running) {
                this.launch();
            }
        }, 850);
        
        // Launch initial ones immediately
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.launch(), i * 400);
        }
    },
    
    stop() {
        this.running = false;
        clearInterval(this.launchInterval);
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },
    
    launch() {
        if (!this.canvas) return;
        const startX = Math.random() * this.canvas.width;
        const startY = this.canvas.height;
        const targetX = Math.random() * this.canvas.width;
        const targetY = Math.random() * (this.canvas.height * 0.55); // Upper section
        
        this.particles.push(new Rocket(startX, startY, targetX, targetY));
    },
    
    loop() {
        if (!this.running) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Draw path trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.globalCompositeOperation = 'copy';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(ctx);
            if (p.isDead) {
                if (p.type === 'rocket') {
                    this.explode(p.x, p.y);
                }
                this.particles.splice(i, 1);
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.loop());
    },
    
    explode(x, y) {
        const colors = ['#00f0ff', '#ff4b5c', '#ffd600', '#00ff66', '#d600ff', '#ff7b00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const count = 50 + Math.floor(Math.random() * 30);
        
        for (let i = 0; i < count; i++) {
            this.particles.push(new Spark(x, y, color));
        }
        
        AudioFX.playExplosion();
    }
};

class Rocket {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.tx = targetX;
        this.ty = targetY;
        this.type = 'rocket';
        this.speed = 10 + Math.random() * 4;
        
        const angle = Math.atan2(targetY - startY, targetX - startX);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.isDead = false;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Gravity pull
        this.vy += 0.05;
        
        if (this.vy >= 0 || this.y <= this.ty) {
            this.isDead = true;
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}

class Spark {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.type = 'spark';
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.gravity = 0.08;
        this.alpha = 1;
        this.decay = 0.015 + Math.random() * 0.015;
        this.isDead = false;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.decay;
        
        if (this.alpha <= 0) {
            this.isDead = true;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}