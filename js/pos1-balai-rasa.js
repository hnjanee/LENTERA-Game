/* ============================================================
   CANDRANATA — pos1-balai-rasa.js
   Pos 1: Balai Rasa — Character Creation & Asesmen Terselubung
   
   ALUR LANGKAH:
   Step 0 (nama)    → Input nama pemain
   Step 1 (gender)  → Pilih gender / karakter avatar
   Step 2 (cuaca)   → Pilih Cuaca Hati (skor resiliensi +1/+2/+3)
   Step 3 (tas)     → Pilih Isi Tas (stres type)
   Step 4 (qte)     → QTE Tersenggol NPC (skor resiliensi +1/+2/+3)
   Step 5 (baterai) → Baterai Sosial (skor isolasi 1/2/3)
   ============================================================ */

'use strict';

const Pos1BalaiRasa = (() => {

  let currentStep = 'nama';
  const steps = ['nama', 'gender', 'cuaca', 'tas', 'qte', 'baterai'];

  // ── Init ──────────────────────────────────────────────────
  function init() {
    console.info('[Pos1] Inisialisasi Balai Rasa');

    if (LenteraGame.state.posCompleted.pos1) {
      LenteraState.navigateTo('pos2');
      return;
    }

    // Restore step dari sesi tersimpan
    const avatar = LenteraGame.state.player.avatarConfig;
    if (avatar.baterai)     currentStep = 'baterai';
    else if (avatar.qte)    currentStep = 'qte';
    else if (avatar.tas)    currentStep = 'tas';
    else if (avatar.cuaca)  currentStep = 'cuaca';
    else if (avatar.gender) currentStep = 'cuaca';
    else if (LenteraGame.state.player.nama) currentStep = 'gender';
    else currentStep = 'nama';

    _showStep(currentStep);
    _bindAllHandlers();
  }

  // ── Tampilkan step ────────────────────────────────────────
  function _showStep(stepName) {
    steps.forEach(s => {
      const el = document.getElementById(`pos1-step-${s}`);
      if (el) el.hidden = (s !== stepName);
    });
    currentStep = stepName;
    // Auto-focus ke input pertama
    const focusTarget = document.querySelector(`#pos1-step-${stepName} input, #pos1-step-${stepName} button.btn--primary`);
    setTimeout(() => focusTarget?.focus(), 100);
  }

  // ── Bind semua handler ────────────────────────────────────
  function _bindAllHandlers() {
    _bindNama();
    _bindGender();
    _bindCuaca();
    _bindTas();
    _bindQte();
    _bindBaterai();
  }

  // ── STEP 0: NAMA ──────────────────────────────────────────
  function _bindNama() {
    // Clone elemen untuk hapus event listener lama
    const oldInput  = document.getElementById('input-nama');
    const oldBtn    = document.getElementById('btn-nama-lanjut');
    if (!oldInput || !oldBtn) return;

    const input  = oldInput.cloneNode(true);
    const btn    = oldBtn.cloneNode(true);
    oldInput.parentNode.replaceChild(input, oldInput);
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    // Restore nilai tersimpan & set status tombol
    const savedNama = LenteraGame.state.player.nama || '';
    input.value    = savedNama;
    // PERBAIKAN BUG: tombol SELALU enabled saat init, validasi dilakukan saat klik
    // Kalau ada nama tersimpan langsung enable, kalau tidak disable sampai ada input
    btn.disabled   = savedNama.trim().length < 2;

    // Enable tombol saat input berubah
    input.addEventListener('input', () => {
      btn.disabled = input.value.trim().length < 2;
    });

    // Enter key submit
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim().length >= 2) {
        _submitNama(input.value);
      }
    });

    btn.addEventListener('click', () => _submitNama(input.value));
  }

  function _submitNama(rawValue) {
    const nama = rawValue.trim();
    if (nama.length < 2) {
      showToast('Nama minimal 2 karakter ya 😊', 'info');
      return;
    }
    LenteraGame.setNama(nama);
    _animateTransition(() => _showStep('gender'));
  }

  // ── STEP 1: GENDER ────────────────────────────────────────
  function _bindGender() {
    const group    = document.getElementById('gender-group');
    const btnBack  = document.getElementById('btn-gender-back');
    const btnLanjut= document.getElementById('btn-gender-lanjut');
    if (!group) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.gender;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    group.addEventListener('change', e => {
      if (e.target.type === 'radio' && btnLanjut) {
        btnLanjut.disabled = false;
      }
    });

    btnBack?.addEventListener('click', () => _animateTransition(() => _showStep('nama')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      LenteraGame.setGender(selected.value);
      LenteraGame.setAvatarConfig('gender', selected.value);
      _animateTransition(() => _showStep('cuaca'));
    });
  }

  // ── STEP 2: CUACA HATI ────────────────────────────────────
  function _bindCuaca() {
    const group    = document.getElementById('cuaca-group');
    const btnBack  = document.getElementById('btn-cuaca-back');
    const btnLanjut= document.getElementById('btn-cuaca-lanjut');
    if (!group) return;

    const saved = LenteraGame.state.player.avatarConfig.cuaca;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    group.addEventListener('change', e => {
      if (e.target.type === 'radio' && btnLanjut) {
        btnLanjut.disabled = false;
        _updateSceneWeather(e.target.value);
      }
    });

    btnBack?.addEventListener('click', () => _animateTransition(() => _showStep('gender')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      const card     = selected.closest('[data-score-resiliensi]');
      const skorResi = parseInt(card?.dataset.scoreResiliensi || '2', 10);
      LenteraGame.setAvatarConfig('cuaca', selected.value);
      LenteraGame.addResiliensi(skorResi);
      _animateTransition(() => _showStep('tas'));
    });
  }

  function _updateSceneWeather(cuaca) {
    const scene = document.querySelector('.pos-scene--balai');
    if (!scene) return;
    scene.classList.remove('weather--cerah', 'weather--kabut', 'weather--mendung');
    scene.classList.add(`weather--${cuaca}`);
  }

  // ── STEP 3: TAS RANSEL ────────────────────────────────────
  function _bindTas() {
    const group    = document.getElementById('tas-group');
    const btnBack  = document.getElementById('btn-tas-back');
    const btnLanjut= document.getElementById('btn-tas-lanjut');
    if (!group) return;

    const saved = LenteraGame.state.player.avatarConfig.tas;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    group.addEventListener('change', e => {
      if (e.target.type === 'radio' && btnLanjut) btnLanjut.disabled = false;
    });

    btnBack?.addEventListener('click', () => _animateTransition(() => _showStep('cuaca')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      const card = selected.closest('[data-stres-type]');
      LenteraGame.setAvatarConfig('tas', selected.value);
      LenteraGame.setStresType(card?.dataset.stresType || 'akademik');
      const emojis = { buku: '📚', hp: '📱', kaca: '🔍' };
      showToast(`${emojis[selected.value] || '📦'} Dimasukkan ke tas!`, 'success', 1200);
      setTimeout(() => _animateTransition(() => _showStep('qte')), 700);
    });
  }

  // ── STEP 4: QTE ───────────────────────────────────────────
  function _bindQte() {
    const group    = document.getElementById('qte-group');
    const btnBack  = document.getElementById('btn-qte-back');
    const btnLanjut= document.getElementById('btn-qte-lanjut');
    if (!group) return;

    const saved = LenteraGame.state.player.avatarConfig.qte;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    setTimeout(() => {
      const spark = document.getElementById('qte-spark');
      if (spark) spark.style.animation = 'pulse 0.4s ease-in-out 3';
    }, 400);

    group.addEventListener('change', e => {
      if (e.target.type === 'radio' && btnLanjut) btnLanjut.disabled = false;
    });

    btnBack?.addEventListener('click', () => _animateTransition(() => _showStep('tas')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      const card     = selected.closest('[data-score-resiliensi]');
      const skorResi = parseInt(card?.dataset.scoreResiliensi || '2', 10);
      LenteraGame.setAvatarConfig('qte', selected.value);
      LenteraGame.addResiliensi(skorResi);
      _animateTransition(() => _showStep('baterai'));
    });
  }

  // ── STEP 5: BATERAI SOSIAL ────────────────────────────────
  function _bindBaterai() {
    const group    = document.getElementById('baterai-group');
    const btnBack  = document.getElementById('btn-baterai-back');
    const btnLanjut= document.getElementById('btn-baterai-lanjut');
    const fillEl   = document.getElementById('energy-fill');
    const barEl    = document.getElementById('energy-bar');
    if (!group) return;

    const saved = LenteraGame.state.player.avatarConfig.baterai;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
      _setEnergyBar(saved, fillEl, barEl);
    }

    group.addEventListener('change', e => {
      if (e.target.type === 'radio') {
        if (btnLanjut) btnLanjut.disabled = false;
        _setEnergyBar(e.target.value, fillEl, barEl);
      }
    });

    btnBack?.addEventListener('click', () => _animateTransition(() => _showStep('qte')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      const card    = selected.closest('[data-score-isolasi]');
      const skorIso = parseInt(card?.dataset.scoreIsolasi || '1', 10);
      LenteraGame.setAvatarConfig('baterai', selected.value);
      LenteraGame.setIsolasi(skorIso);
      _finishPos1();
    });
  }

  function _setEnergyBar(val, fillEl, barEl) {
    if (!fillEl) return;
    const pct = { keramaian: 100, pojok: 55, pohon: 20 }[val] || 0;
    fillEl.style.width = `${pct}%`;
    if (barEl) barEl.setAttribute('aria-valuenow', pct);
  }

  // ── Selesaikan Pos 1 ──────────────────────────────────────
  async function _finishPos1() {
    showToast('✅ Avatar siap! Menuju Pasar Interaksi…', 'success', 2000);
    await _sleep(1000);
    LenteraNav.completePos('pos1');
    LenteraState.navigateTo('pos2', 'Memasuki Pasar Interaksi… 🏪');
  }

  // ── Utilities ─────────────────────────────────────────────
  function _animateTransition(callback) {
    const overlay = document.getElementById('pos1-overlay');
    if (overlay) {
      overlay.style.opacity    = '0';
      overlay.style.transform  = 'translateY(8px)';
      overlay.style.transition = 'opacity 180ms ease, transform 180ms ease';
      setTimeout(() => {
        callback();
        overlay.style.opacity   = '1';
        overlay.style.transform = 'translateY(0)';
      }, 200);
    } else {
      callback();
    }
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { init };

})();

window.Pos1BalaiRasa = Pos1BalaiRasa;
console.info('[CANDRANATA] pos1-balai-rasa.js dimuat ✓');
