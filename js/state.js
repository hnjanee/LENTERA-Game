/* ============================================================
   LATHI — state.js
   Core State Management, Navigation Guard, & Utility Functions
   Cipta Agung Nuntun Dharmaning Raga Aning Nalar Agung Tetep Asisih
   ============================================================ */

'use strict';

const STORAGE_KEY = 'lathi_session_v1';
const POS_ORDER   = ['loading', 'intro-bullying', 'pos1', 'pos2', 'pos3', 'pos4', 'hasil'];

function createInitialState() {
  return {
    sessionId      : _generateId(),
    startedAt      : new Date().toISOString(),
    completedAt    : null,
    currentScreen  : 'loading',
    currentPosIndex: 0,

    player: {
      nama        : '',
      sekolah     : '',   // 'SMA Al-Maahira IIBS Malang' | 'SMAN 3 Malang' | 'SMAN 4 Malang'
      gender      : null,
      avatarConfig: {
        gender  : null,
        cuaca   : null,
        tas     : null,
        baterai : null,
        qte     : null,
      },
    },

    skor: {
      resiliensi   : 0,
      isolasi      : 0,
      stresType    : null,
      pos2Responses: [],
      pos3Complete : false,
    },

    laporan: {
      isi      : '',
      isAnonim : false,  // selalu false — wajib pakai nama
      submitted: false,
      skipped  : false,
    },

    hasil: {
      tipe         : null,
      totalSkor    : 0,
      persentase   : 0,
      kalkulasiDone: false,
    },

    posCompleted: {
      'intro-bullying': false,
      pos1: false,
      pos2: false,
      pos3: false,
      pos4: false,
    },
  };
}

let _state = createInitialState();

// ── Bersihkan storage key lama saat pertama kali dimuat ──
(function _cleanOldKeys() {
  const oldKeys = [
    'lentera_session_v1',
    'candranata_session_v1',
    'sadarin_session_v1',
    'lentera_laporan_bk',
    'candranata_laporan_bk',
    'sadarin_laporan_bk',
    'cn_session', 'ln_session'
  ];
  oldKeys.forEach(k => {
    try { localStorage.removeItem(k); } catch(e) {}
  });
})();

// ── Store ──────────────────────────────────────────────────
const LathiStore = {
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
    catch (e) { console.warn('[LATHI] Gagal menyimpan state:', e); }
  },
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Validasi struktur minimum
      if (!parsed || !parsed.sessionId || !parsed.player || !parsed.posCompleted) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      // Expired check (24 jam)
      if (Date.now() - new Date(parsed.startedAt).getTime() > 86400000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  clear() { localStorage.removeItem(STORAGE_KEY); },
};

// Aliases agar file lama tetap kompatibel
const LenteraStore = LathiStore;

// ── Navigation Guard ───────────────────────────────────────
const LathiNav = {
  canNavigateTo(targetScreen) {
    if (!POS_ORDER.includes(targetScreen)) return { allowed: false, reason: 'Screen tidak dikenal.' };
    if (targetScreen === 'loading') return { allowed: true };
    if (targetScreen === 'pos2' && !_state.posCompleted.pos1)
      return { allowed: false, reason: 'Selesaikan Pos 1 (Balai Rasa) terlebih dahulu.' };
    if (targetScreen === 'pos3' && !_state.posCompleted.pos2)
      return { allowed: false, reason: 'Selesaikan Pos 2 (Pasar Interaksi) terlebih dahulu.' };
    if (targetScreen === 'pos4' && !_state.posCompleted.pos3)
      return { allowed: false, reason: 'Selesaikan Pos 3 (Taman Urup) terlebih dahulu.' };
    if (targetScreen === 'hasil' && !_state.posCompleted.pos4)
      return { allowed: false, reason: 'Selesaikan Pos 4 (Bilik Cahaya) terlebih dahulu.' };
    return { allowed: true };
  },

  completePos(pos) {
    if (Object.prototype.hasOwnProperty.call(_state.posCompleted, pos)) {
      _state.posCompleted[pos] = true;
      LathiStore.save();
      LathiUI.updateHUD();
    }
  },
};

// Alias
const LenteraNav = LathiNav;

// ── UI Utilities ───────────────────────────────────────────
const LathiUI = {
  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity 300ms, transform 300ms';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  transition(newScreenId, label = 'Memuat…', delay = 900) {
    return new Promise(resolve => {
      const overlay = document.getElementById('scene-transition');
      const textEl  = document.getElementById('transition-text');
      if (!overlay) { resolve(); return; }
      if (textEl) textEl.textContent = label;
      overlay.classList.add('active');
      setTimeout(() => {
        document.querySelectorAll('.game-screen').forEach(s => { s.hidden = true; });
        const target = document.getElementById(newScreenId);
        if (target) {
          target.hidden = false;
          target.classList.add('screen-enter');
          setTimeout(() => target.classList.remove('screen-enter'), 500);
        }
        setTimeout(() => { overlay.classList.remove('active'); resolve(); }, 300);
      }, delay);
    });
  },

  updateHUD() {
    const nameEl = document.getElementById('hud-player-name');
    if (nameEl) nameEl.textContent = _state.player.nama || '—';

    // Update mini avatar gender
    _renderMiniAvatar();

    // Pos tracker
    const nodes = document.querySelectorAll('.pos-node');
    nodes.forEach(node => {
      const posNum = node.dataset.pos;
      const posKey = `pos${posNum}`;
      node.classList.remove('pos-node--active', 'pos-node--complete', 'pos-node--locked');
      if (_state.posCompleted[posKey]) {
        node.classList.add('pos-node--complete');
      } else if (_state.currentScreen === posKey) {
        node.classList.add('pos-node--active');
        node.setAttribute('aria-current', 'step');
      } else {
        node.classList.add('pos-node--locked');
        node.removeAttribute('aria-current');
      }
    });
  },

  setLoadingProgress(percent) {
    const fill = document.getElementById('loading-fill');
    const bar  = document.querySelector('.loading-bar');
    if (fill) fill.style.width = `${percent}%`;
    if (bar)  bar.setAttribute('aria-valuenow', percent);
  },
};

// Alias
const LenteraUI = LathiUI;

// ── Mini Avatar Renderer ───────────────────────────────────
function _renderMiniAvatar() {
  const miniEl = document.getElementById('mini-avatar');
  if (!miniEl) return;
  const gender = _state.player.avatarConfig.gender || _state.player.gender;
  if (!gender) return;
  const src = gender === 'perempuan'
    ? 'assets/images/char-perempuan.png'
    : 'assets/images/char-laki.png';
  miniEl.innerHTML = `
    <img src="${src}" alt="Avatar"
      style="height:36px;width:auto;image-rendering:pixelated;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));display:block;" />`;
}

// Render karakter di weather preview cards
function _renderWeatherChars() {
  const gender = _state.player.avatarConfig.gender || 'laki';
  const src = gender === 'perempuan'
    ? 'assets/images/char-perempuan.png'
    : 'assets/images/char-laki.png';

  // Cuaca preview — pakai gambar kecil
  ['cerah','kabut','mendung'].forEach(cuaca => {
    const el = document.getElementById(`weather-char-${cuaca}`);
    if (!el) return;
    // Filter CSS untuk beri efek mood
    const filterMap = {
      cerah  : 'brightness(1.1) drop-shadow(0 0 4px rgba(240,201,58,0.5))',
      kabut  : 'brightness(0.85) saturate(0.7)',
      mendung: 'brightness(0.7) saturate(0.5)',
    };
    el.innerHTML = `
      <img src="${src}" alt="Karakter ${cuaca}"
        style="height:52px;width:auto;image-rendering:pixelated;
        filter:${filterMap[cuaca]};display:block;margin:0 auto;" />`;
  });

  // QTE player char — pakai gambar sesuai gender
  const qteChar = document.getElementById('qte-char-player');
  if (qteChar) {
    qteChar.innerHTML = `
      <img src="${src}" alt="Karakter pemain"
        style="height:90px;width:auto;image-rendering:pixelated;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));" />`;
  }
}

// ── Game API ───────────────────────────────────────────────
const LathiGame = {
  get state() { return _state; },

  setNama(nama) {
    _state.player.nama = nama.trim();
    LathiStore.save();
    LathiUI.updateHUD();
  },

  setSekolah(sekolah) {
    _state.player.sekolah = sekolah.trim();
    LathiStore.save();
  },

  setGender(gender) {
    _state.player.gender = gender;
    _state.player.avatarConfig.gender = gender;
    LathiStore.save();
    LathiUI.updateHUD();
    _renderWeatherChars();
  },

  setAvatarConfig(key, value) {
    if (Object.prototype.hasOwnProperty.call(_state.player.avatarConfig, key)) {
      _state.player.avatarConfig[key] = value;
      LathiStore.save();
    }
  },

  addResiliensi(delta) {
    _state.skor.resiliensi = Math.min(15, _state.skor.resiliensi + delta);
    LathiStore.save();
  },

  setIsolasi(value) {
    _state.skor.isolasi = value;
    LathiStore.save();
  },

  setStresType(type) {
    _state.skor.stresType = type;
    LathiStore.save();
  },

  recordPos2Response(skenario, pilihan, tipe, skor) {
    _state.skor.pos2Responses.push({ skenario, pilihan, tipe, skor });
    _state.skor.resiliensi = Math.min(15, _state.skor.resiliensi + skor);
    LathiStore.save();
  },

  setPos3Complete() {
    _state.skor.pos3Complete = true;
    LathiStore.save();
  },

  setLaporan(isi) {
    _state.laporan.isi       = isi;
    _state.laporan.isAnonim  = false;
    _state.laporan.submitted = isi.trim().length > 0;
    _state.laporan.skipped   = isi.trim().length === 0;
    _state.completedAt       = new Date().toISOString();
    LathiStore.save();
  },
};

// Aliases untuk kompatibilitas file lama
const LenteraGame = LathiGame;

// ── Main State Controller ──────────────────────────────────
const LathiState = {
  async init() {
    try {
      const saved = LathiStore.load();
      if (saved) {
        _state = saved;
      }
      LathiUI.updateHUD();

      // Render karakter sesuai gender tersimpan
      if (_state.player.avatarConfig.gender) {
        _renderWeatherChars();
      }

      // Loading bar animation
      for (const pct of [10, 30, 55, 75, 95, 100]) {
        LathiUI.setLoadingProgress(pct);
        await _sleep(200);
      }

      // Tentukan target screen
      let target = 'intro-bullying';
      if (saved && saved.currentScreen && saved.currentScreen !== 'loading') {
        target = saved.currentScreen;
      }

      await LathiUI.transition(`screen-${target}`, 'Memuat LATHI…', 600);
      _state.currentScreen = target;
      LathiStore.save();
      LathiUI.updateHUD();
      this._bootModule(target);
    } catch(err) {
      console.error('[LATHI] init error:', err);
      // Reset paksa dan coba lagi dari awal
      LathiStore.clear();
      _state = createInitialState();
      await LathiUI.transition('screen-intro-bullying', 'Memuat…', 400);
      _state.currentScreen = 'intro-bullying';
      this._bootModule('intro-bullying');
    }
  },

  async navigateTo(screen, label) {
    // Izinkan navigasi ke intro-bullying tanpa guard
    if (screen !== 'intro-bullying') {
      const guard = LathiNav.canNavigateTo(screen);
      if (!guard.allowed) {
        LathiUI.toast(`⛔ ${guard.reason}`, 'danger');
        return;
      }
    }
    const transLabel = label || _getTransitionLabel(screen);
    await LathiUI.transition(`screen-${screen}`, transLabel);
    _state.currentScreen = screen;
    LathiStore.save();
    LathiUI.updateHUD();

    // Kirim data sesi ke Google Sheets saat sampai di hasil
    if (screen === 'hasil') {
      _kirimSesiKeSheets();
    }

    this._bootModule(screen);
  },

  reset() {
    LathiStore.clear();
    _state = createInitialState();
  },

  _bootModule(screen) {
    try {
      switch (screen) {
        case 'intro-bullying':
          // Handled inline in game.html script
          break;
        case 'pos1':
          if (typeof Pos1BalaiRasa !== 'undefined') Pos1BalaiRasa.init();
          break;
        case 'pos2':
          if (typeof Pos2PasarInteraksi !== 'undefined') Pos2PasarInteraksi.init();
          break;
        case 'pos3':
          if (typeof Pos3TamanUrup !== 'undefined') Pos3TamanUrup.init();
          break;
        case 'pos4':
          if (typeof Pos4BilikLentera !== 'undefined') Pos4BilikLentera.init();
          break;
        case 'hasil':
          if (typeof HasilKartu !== 'undefined') HasilKartu.render();
          break;
      }
    } catch (e) {
      console.error('[LATHI] Error booting module:', screen, e);
    }
  },
};

// Alias
const LenteraState = LathiState;

// ── Helpers ────────────────────────────────────────────────
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _generateId() {
  return `cn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _getTransitionLabel(screen) {
  return {
    'intro-bullying': 'Mempersiapkan perjalanan… 🌙',
    pos1   : 'Menuju Balai Rasa… 🏛️',
    pos2   : 'Memasuki Pasar Interaksi… 🏪',
    pos3   : 'Berjalan ke Taman Urup… 🌙',
    pos4   : 'Menemukan Bilik Cahaya… 📖',
    hasil  : 'Menghitung perjalananmu… ✨',
  }[screen] || 'Memuat…';
}

function showToast(msg, type = 'info') { LathiUI.toast(msg, type); }

// ── Kirim sesi ke Google Sheets ───────────────────────────
const _SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxR2OsfuO1QiL8n8DpedpD1sKcggm_g-DriXz52fYYBgPPklfIoRXDP_vCRGo8x8W7Teg/exec';

function _kirimSesiKeSheets() {
  try {
    const s = _state;
    // Hitung tipe dan skor
    const resiliensi = s.skor.resiliensi;
    const isolasi    = s.skor.isolasi;
    const pctResi    = (resiliensi / 9) * 70;
    const pctIso     = ((3 - isolasi + 1) / 3) * 30;
    const totalSkor  = Math.min(100, Math.round(pctResi + pctIso));
    const tipe = s.hasil?.tipe || _hitungTipe(resiliensi, isolasi, s.skor);

    const payload = {
      type    : 'sesi',
      id      : s.sessionId,
      mulai   : s.startedAt,
      nama    : s.player.nama,
      sekolah : s.player.sekolah || '',
      tipe    : tipe,
      skor    : totalSkor,
      stres   : s.skor.stresType || '',
      laporan : s.laporan.submitted,
    };

    fetch(_SHEETS_URL, {
      method : 'POST',
      mode   : 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    }).catch(e => console.warn('[LATHI] Gagal kirim sesi:', e));
  } catch(e) {
    console.warn('[LATHI] Gagal kirim sesi:', e);
  }
}

// Expose globals
window.LathiState = LathiState;
window.LathiGame  = LathiGame;
window.LathiNav   = LathiNav;
window.LathiUI    = LathiUI;
window.LathiStore = LathiStore;
// Aliases untuk file JS lama
window.LenteraState = LenteraState;
window.LenteraGame  = LenteraGame;
window.LenteraNav   = LenteraNav;
window.LenteraUI    = LenteraUI;
window.LenteraStore = LenteraStore;
window.showToast    = showToast;
