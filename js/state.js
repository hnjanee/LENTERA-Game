/* ============================================================
   LENTERA — state.js
   Core State Management, Navigation Guard, & Utility Functions
   ============================================================

   ARSITEKTUR STATE:
   ─────────────────
   LenteraState       → Objek utama: init, navigate, reset
   LenteraGame.state  → Snapshot data pemain & skor
   LenteraNav         → Guard navigasi antar pos (no-skip enforcement)
   LenteraUI          → Utility: toast, transition, HUD update
   LenteraStore       → Persistence ke localStorage

   SKEMA SKOR MENTAL:
   ─────────────────
   skor.resiliensi  (0–9)  : Gabungan pos1 (cuaca+qte) + pos2 (pilihan respons)
   skor.isolasi     (0–3)  : Dari pos1 (baterai sosial)
   skor.stres       string : Tipe stres dari pilihan tas (akademik/sosial/insecurity)
   skor.pos2        []     : Array pilihan per skenario {tipe: 'asertif'|'pasif'|'reaktif'}

   TIPE HASIL:
   ─────────────────
   'ksatria'  → total resiliensi >= 7, isolasi <= 2
   'daun'     → total resiliensi < 7  atau isolasi >= 3
   ============================================================ */

'use strict';

// ── Konstanta ──────────────────────────────────────────────
const STORAGE_KEY   = 'lentera_session_v1';
const POS_ORDER     = ['loading', 'pos1', 'pos2', 'pos3', 'pos4', 'hasil'];
const MAX_POS_INDEX = POS_ORDER.indexOf('hasil');

// ── State Awal ────────────────────────────────────────────
function createInitialState() {
  return {
    // Meta sesi
    sessionId   : _generateId(),
    startedAt   : new Date().toISOString(),
    completedAt : null,
    currentScreen: 'loading',
    currentPosIndex: 0,

    // Data pemain
    player: {
      nama     : '',
      avatarConfig: {
        cuaca : null,   // 'cerah' | 'kabut' | 'mendung'
        tas   : null,   // 'buku' | 'hp' | 'kaca'
        baterai: null,  // 'keramaian' | 'pojok' | 'pohon'
        qte   : null,   // 'menunduk' | 'panik' | 'senyum'
      },
    },

    // Skor asesmen
    skor: {
      resiliensi    : 0,   // akumulasi dari cuaca(1-3) + qte(1-3) + pos2(1-3 per skenario)
      isolasi       : 0,   // dari baterai sosial (1-3)
      stresType     : null,// 'akademik' | 'sosial' | 'insecurity'
      pos2Responses : [],  // [{skenario: 1, pilihan: 'A', tipe: 'asertif', skor: 3}]
      pos3Complete  : false,
    },

    // Laporan pos4
    laporan: {
      isi       : '',
      isAnonim  : true,
      submitted : false,
      skipped   : false,
    },

    // Hasil akhir
    hasil: {
      tipe       : null,   // 'ksatria' | 'daun'
      totalSkor  : 0,
      persentase : 0,
      kalkulasiDone: false,
    },

    // Progress guard
    posCompleted: {
      pos1: false,
      pos2: false,
      pos3: false,
      pos4: false,
    },
  };
}

// ── State singleton ───────────────────────────────────────
let _state = createInitialState();

// ── LenteraStore: localStorage persistence ────────────────
const LenteraStore = {
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('[LENTERA] Gagal menyimpan state:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Validasi: session tidak boleh lebih dari 24 jam
      const start = new Date(parsed.startedAt).getTime();
      const now   = Date.now();
      if (now - start > 86400000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      console.warn('[LENTERA] Gagal memuat state:', e);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

// ── LenteraNav: Guard navigasi ────────────────────────────
const LenteraNav = {
  /**
   * Cek apakah pemain boleh pergi ke screen target.
   * Pos harus diselesaikan secara berurutan.
   * @param {string} targetScreen
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canNavigateTo(targetScreen) {
    const targetIndex = POS_ORDER.indexOf(targetScreen);
    if (targetIndex === -1) return { allowed: false, reason: 'Screen tidak dikenal.' };

    // Selalu boleh ke loading
    if (targetScreen === 'loading') return { allowed: true };

    // Cek apakah pos sebelumnya sudah selesai
    const currentIndex = POS_ORDER.indexOf(_state.currentScreen);

    // Boleh mundur hanya ke pos1
    if (targetIndex < currentIndex && targetScreen !== 'pos1') {
      return { allowed: false, reason: 'Tidak bisa kembali ke pos yang sudah dilewati.' };
    }

    // Guard: pos2 butuh pos1 selesai
    if (targetScreen === 'pos2' && !_state.posCompleted.pos1) {
      return { allowed: false, reason: 'Selesaikan Pos 1 (Balai Rasa) terlebih dahulu.' };
    }
    if (targetScreen === 'pos3' && !_state.posCompleted.pos2) {
      return { allowed: false, reason: 'Selesaikan Pos 2 (Pasar Interaksi) terlebih dahulu.' };
    }
    if (targetScreen === 'pos4' && !_state.posCompleted.pos3) {
      return { allowed: false, reason: 'Selesaikan Pos 3 (Taman Urup) terlebih dahulu.' };
    }
    if (targetScreen === 'hasil' && !_state.posCompleted.pos4) {
      return { allowed: false, reason: 'Selesaikan Pos 4 (Bilik Lentera) terlebih dahulu.' };
    }

    return { allowed: true };
  },

  /**
   * Tandai pos sebagai selesai.
   * @param {'pos1'|'pos2'|'pos3'|'pos4'} pos
   */
  completePos(pos) {
    if (_state.posCompleted.hasOwnProperty(pos)) {
      _state.posCompleted[pos] = true;
      LenteraStore.save();
      LenteraUI.updateHUD();
      console.info(`[LENTERA] ${pos} selesai ✓`);
    }
  },
};

// ── LenteraUI: Utility UI ─────────────────────────────────
const LenteraUI = {
  /**
   * Tampilkan toast notifikasi.
   * @param {string} message
   * @param {'info'|'success'|'danger'} type
   * @param {number} duration ms
   */
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

  /**
   * Transisi sinematik antar screen.
   * @param {string} newScreenId  ID elemen screen tujuan
   * @param {string} label        Teks yang tampil saat transisi
   * @param {number} delay        Durasi transisi (ms)
   * @returns {Promise<void>}
   */
  transition(newScreenId, label = 'Memuat…', delay = 900) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('scene-transition');
      const textEl  = document.getElementById('transition-text');
      if (!overlay) { resolve(); return; }

      if (textEl) textEl.textContent = label;
      overlay.classList.add('active');

      setTimeout(() => {
        // Sembunyikan semua screen
        document.querySelectorAll('.game-screen').forEach(s => { s.hidden = true; });

        // Tampilkan screen tujuan
        const target = document.getElementById(newScreenId);
        if (target) {
          target.hidden = false;
          target.classList.add('screen-enter');
          setTimeout(() => target.classList.remove('screen-enter'), 500);
        }

        // Tutup overlay transisi
        setTimeout(() => {
          overlay.classList.remove('active');
          resolve();
        }, 300);
      }, delay);
    });
  },

  /** Update HUD: nama pemain, pos tracker, avatar preview */
  updateHUD() {
    // Nama pemain
    const nameEl = document.getElementById('hud-player-name');
    if (nameEl) nameEl.textContent = _state.player.nama || '—';

    // Pos tracker nodes
    const nodes = document.querySelectorAll('.pos-node');
    nodes.forEach(node => {
      const posNum = node.dataset.pos;
      const posKey = `pos${posNum}`;
      node.classList.remove('pos-node--active', 'pos-node--complete', 'pos-node--locked');

      if (_state.posCompleted[posKey]) {
        node.classList.add('pos-node--complete');
        node.querySelector('.pos-icon').setAttribute('aria-label', `Pos ${posNum} selesai`);
      } else if (_state.currentScreen === posKey) {
        node.classList.add('pos-node--active');
        node.setAttribute('aria-current', 'step');
      } else {
        node.classList.add('pos-node--locked');
        node.removeAttribute('aria-current');
      }
    });

    // Avatar mini (cuaca aura)
    const miniAvatar = document.getElementById('mini-avatar');
    if (miniAvatar && _state.player.avatarConfig.cuaca) {
      const cuaca = _state.player.avatarConfig.cuaca;
      const colors = { cerah: '#87CEEB', kabut: '#B0BEC5', mendung: '#546E7A' };
      miniAvatar.style.background = `radial-gradient(circle, ${colors[cuaca]}33 0%, transparent 70%)`;
    }
  },

  /** Update loading bar progress */
  setLoadingProgress(percent) {
    const fill = document.getElementById('loading-fill');
    const bar  = document.querySelector('.loading-bar');
    if (fill) fill.style.width = `${percent}%`;
    if (bar)  bar.setAttribute('aria-valuenow', percent);
  },
};

// ── LenteraGame: API Utama ────────────────────────────────
const LenteraGame = {
  /** Akses baca state (read-only dari luar) */
  get state() { return _state; },

  /**
   * Update skor resiliensi (akumulatif)
   * @param {number} delta nilai tambah (1-3)
   */
  addResiliensi(delta) {
    _state.skor.resiliensi = Math.min(9, _state.skor.resiliensi + delta);
    LenteraStore.save();
  },

  /**
   * Set skor isolasi
   * @param {number} value 1-3
   */
  setIsolasi(value) {
    _state.skor.isolasi = value;
    LenteraStore.save();
  },

  /**
   * Set tipe stres
   * @param {'akademik'|'sosial'|'insecurity'} type
   */
  setStresType(type) {
    _state.skor.stresType = type;
    LenteraStore.save();
  },

  /**
   * Rekam respons Pos 2
   * @param {number} skenario 1-3
   * @param {string} pilihan  'A'|'B'|'C'
   * @param {string} tipe     'pasif'|'reaktif'|'asertif'
   * @param {number} skor     1-3
   */
  recordPos2Response(skenario, pilihan, tipe, skor) {
    _state.skor.pos2Responses.push({ skenario, pilihan, tipe, skor });
    _state.skor.resiliensi = Math.min(9, _state.skor.resiliensi + skor);
    LenteraStore.save();
  },

  /** Set nama pemain */
  setNama(nama) {
    _state.player.nama = nama.trim();
    LenteraStore.save();
    LenteraUI.updateHUD();
  },

  /** Simpan konfigurasi avatar pos1 */
  setAvatarConfig(key, value) {
    if (_state.player.avatarConfig.hasOwnProperty(key)) {
      _state.player.avatarConfig[key] = value;
      LenteraStore.save();
    }
  },

  /** Tandai pos3 selesai */
  setPos3Complete() {
    _state.skor.pos3Complete = true;
    LenteraStore.save();
  },

  /** Simpan data laporan pos4 */
  setLaporan(isi, isAnonim) {
    _state.laporan.isi      = isi;
    _state.laporan.isAnonim = isAnonim;
    _state.laporan.submitted = isi.trim().length > 0;
    _state.laporan.skipped   = isi.trim().length === 0;
    _state.completedAt = new Date().toISOString();
    LenteraStore.save();
  },
};

// ── LenteraState: Bootstrap & Navigation ─────────────────
const LenteraState = {
  /**
   * Inisialisasi game — muat state tersimpan atau mulai baru,
   * lalu tampilkan loading screen sebelum masuk pos1.
   */
  async init() {
    // Coba muat sesi tersimpan
    const saved = LenteraStore.load();
    if (saved) {
      _state = saved;
      LenteraUI.toast('Sesi tersimpan dimuat kembali 🏮', 'info');
    }

    LenteraUI.updateHUD();

    // Animasi loading bar
    const steps = [10, 30, 55, 75, 95, 100];
    for (const pct of steps) {
      LenteraUI.setLoadingProgress(pct);
      await _sleep(220);
    }

    // Masuk ke screen yang tersimpan, atau pos1 jika sesi baru
    const target = (saved && saved.currentScreen !== 'loading')
      ? saved.currentScreen
      : 'pos1';

    await LenteraUI.transition(`screen-${target}`, 'Menyalakan Lentera…', 600);
    _state.currentScreen = target;
    LenteraStore.save();
    LenteraUI.updateHUD();

    // Aktifkan modul pos
    this._bootModule(target);
  },

  /**
   * Navigasi ke screen/pos berikutnya dengan guard keamanan.
   * @param {string} screen  'pos1'|'pos2'|'pos3'|'pos4'|'hasil'
   * @param {string} label   Teks transisi
   */
  async navigateTo(screen, label) {
    const guard = LenteraNav.canNavigateTo(screen);
    if (!guard.allowed) {
      LenteraUI.toast(`⛔ ${guard.reason}`, 'danger');
      console.warn('[LENTERA] Navigasi ditolak:', guard.reason);
      return;
    }

    const transLabel = label || _getTransitionLabel(screen);
    await LenteraUI.transition(`screen-${screen}`, transLabel);
    _state.currentScreen = screen;
    LenteraStore.save();
    LenteraUI.updateHUD();
    this._bootModule(screen);
  },

  /** Reset total — hapus state dan reload */
  reset() {
    LenteraStore.clear();
    _state = createInitialState();
    console.info('[LENTERA] State direset.');
  },

  /** Panggil modul init yang relevan setelah navigasi */
  _bootModule(screen) {
    try {
      switch (screen) {
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
      console.error('[LENTERA] Error booting module:', screen, e);
    }
  },
};

// ── Helper Functions ──────────────────────────────────────
function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _generateId() {
  return `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function _getTransitionLabel(screen) {
  const labels = {
    pos1  : 'Menuju Balai Rasa… 🏛️',
    pos2  : 'Memasuki Pasar Interaksi… 🏪',
    pos3  : 'Berjalan ke Taman Urup… 🏮',
    pos4  : 'Menemukan Bilik Lentera… 📖',
    hasil : 'Menghitung Perjalananmu… ✨',
  };
  return labels[screen] || 'Memuat…';
}

/**
 * Helper global: tampilkan toast dari mana saja
 * @param {string} msg
 * @param {'info'|'success'|'danger'} type
 */
function showToast(msg, type = 'info') {
  LenteraUI.toast(msg, type);
}

// Expose ke global scope untuk dipakai modul lain
window.LenteraState   = LenteraState;
window.LenteraGame    = LenteraGame;
window.LenteraNav     = LenteraNav;
window.LenteraUI      = LenteraUI;
window.LenteraStore   = LenteraStore;
window.showToast      = showToast;

console.info('[LENTERA] state.js dimuat ✓');
