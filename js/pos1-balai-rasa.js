/* ============================================================
   LENTERA — pos1-balai-rasa.js
   Pos 1: Balai Rasa — Character Creation & Asesmen Terselubung
   ============================================================

   ALUR LANGKAH:
   Step 0 (nama)     → Input nama pemain
   Step 1 (cuaca)    → Pilih Cuaca Hati (skor resiliensi +1/+2/+3)
   Step 2 (tas)      → Pilih Isi Tas (stres type: akademik/sosial/insecurity)
   Step 3 (qte)      → Animasi Tersenggol NPC (skor resiliensi +1/+2/+3)
   Step 4 (baterai)  → Isi Baterai Sosial (skor isolasi 1/2/3)
   → Selesai: tandai pos1 complete, navigasi ke pos2
   ============================================================ */

'use strict';

const Pos1BalaiRasa = (() => {

  // ── State internal pos1 ──
  let currentStep = 'nama';
  const steps = ['nama', 'cuaca', 'tas', 'qte', 'baterai'];

  // ── Init ─────────────────────────────────────────────────
  function init() {
    console.info('[Pos1] Inisialisasi Balai Rasa');
    currentStep = 'nama';

    // Jika sudah selesai pos1, lanjut langsung
    if (LenteraGame.state.posCompleted.pos1) {
      console.info('[Pos1] Sudah selesai, skip ke Pos2');
      LenteraState.navigateTo('pos2');
      return;
    }

    // Restore step jika sesi disimpan
    const avatar = LenteraGame.state.player.avatarConfig;
    if (avatar.baterai)       currentStep = 'baterai';
    else if (avatar.qte)      currentStep = 'qte';
    else if (avatar.tas)      currentStep = 'tas';
    else if (avatar.cuaca)    currentStep = 'cuaca';
    else if (LenteraGame.state.player.nama) currentStep = 'cuaca';

    _showStep(currentStep);
    _bindAllHandlers();
  }

  // ── Tampilkan step tertentu ───────────────────────────────
  function _showStep(stepName) {
    steps.forEach(s => {
      const el = document.getElementById(`pos1-step-${s}`);
      if (el) el.hidden = (s !== stepName);
    });
    currentStep = stepName;

    // Focus management
    const panel = document.querySelector(`#pos1-step-${stepName} .dialog-panel`);
    if (panel) panel.focus?.() || panel.querySelector('input, button')?.focus();
  }

  // ── Bind semua event handlers ─────────────────────────────
  function _bindAllHandlers() {
    _bindNama();
    _bindCuaca();
    _bindTas();
    _bindQte();
    _bindBaterai();
  }

  // ── STEP 0: NAMA ──────────────────────────────────────────
  function _bindNama() {
    const input  = document.getElementById('input-nama');
    const btnLanjut = document.getElementById('btn-nama-lanjut');
    if (!input || !btnLanjut) return;

    // Restore nilai tersimpan
    if (LenteraGame.state.player.nama) {
      input.value = LenteraGame.state.player.nama;
      btnLanjut.disabled = false;
    }

    const onInput = () => {
      const val = input.value.trim();
      btnLanjut.disabled = val.length < 2;
    };

    // Remove old listeners (jika re-init)
    input.replaceWith(input.cloneNode(true));
    btnLanjut.replaceWith(btnLanjut.cloneNode(true));

    const freshInput  = document.getElementById('input-nama');
    const freshBtn    = document.getElementById('btn-nama-lanjut');

    freshInput.addEventListener('input', onInput);
    freshInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && freshInput.value.trim().length >= 2) {
        _submitNama(freshInput.value);
      }
    });

    if (LenteraGame.state.player.nama) {
      freshInput.value = LenteraGame.state.player.nama;
      freshBtn.disabled = false;
    }

    freshBtn.addEventListener('click', () => {
      _submitNama(freshInput.value);
    });
  }

  function _submitNama(rawValue) {
    const nama = rawValue.trim();
    if (nama.length < 2) {
      showToast('Nama minimal 2 karakter ya 😊', 'info');
      return;
    }
    LenteraGame.setNama(nama);
    _animateStepTransition(() => _showStep('cuaca'));
  }

  // ── STEP 1: CUACA HATI ─────────────────────────────────
  function _bindCuaca() {
    const group    = document.getElementById('cuaca-group');
    const btnBack  = document.getElementById('btn-cuaca-back');
    const btnLanjut= document.getElementById('btn-cuaca-lanjut');
    if (!group) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.cuaca;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) {
        savedInput.checked = true;
        savedInput.closest('.choice-card').classList.add('selected');
      }
      if (btnLanjut) btnLanjut.disabled = false;
    }

    group.addEventListener('change', (e) => {
      if (e.target.type === 'radio' && btnLanjut) {
        btnLanjut.disabled = false;
        _updateSceneWeather(e.target.value);
      }
    });

    btnBack?.addEventListener('click', () => _animateStepTransition(() => _showStep('nama')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;

      const card        = selected.closest('[data-score-resiliensi]');
      const skorResi    = parseInt(card?.dataset.scoreResiliensi || '2', 10);
      const cuacaValue  = selected.value;

      LenteraGame.setAvatarConfig('cuaca', cuacaValue);
      LenteraGame.addResiliensi(skorResi);

      _animateStepTransition(() => _showStep('tas'));
    });
  }

  function _updateSceneWeather(cuaca) {
    const scene = document.querySelector('.pos-scene--balai');
    if (!scene) return;
    scene.classList.remove('weather--cerah', 'weather--kabut', 'weather--mendung');
    scene.classList.add(`weather--${cuaca}`);
  }

  // ── STEP 2: TAS RANSEL ────────────────────────────────────
  function _bindTas() {
    const group    = document.getElementById('tas-group');
    const btnBack  = document.getElementById('btn-tas-back');
    const btnLanjut= document.getElementById('btn-tas-lanjut');
    if (!group) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.tas;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    group.addEventListener('change', (e) => {
      if (e.target.type === 'radio' && btnLanjut) {
        btnLanjut.disabled = false;
      }
    });

    btnBack?.addEventListener('click', () => _animateStepTransition(() => _showStep('cuaca')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;

      const card      = selected.closest('[data-stres-type]');
      const stresType = card?.dataset.stresType || 'akademik';
      const tasValue  = selected.value;

      LenteraGame.setAvatarConfig('tas', tasValue);
      LenteraGame.setStresType(stresType);

      // Animasi memasukkan item ke inventory
      _playItemPickupAnimation(tasValue, () => {
        _animateStepTransition(() => _showStep('qte'));
      });
    });
  }

  function _playItemPickupAnimation(item, callback) {
    const emojis = { buku: '📚', hp: '📱', kaca: '🔍' };
    const toast  = emojis[item] || '📦';
    showToast(`${toast} Dimasukkan ke tas!`, 'success', 1200);
    setTimeout(callback, 700);
  }

  // ── STEP 3: QTE (Quick Time Event) ───────────────────────
  function _bindQte() {
    const group    = document.getElementById('qte-group');
    const btnBack  = document.getElementById('btn-qte-back');
    const btnLanjut= document.getElementById('btn-qte-lanjut');
    if (!group) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.qte;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
    }

    // Trigger animasi senggolan saat masuk step
    setTimeout(() => _playCollisionAnimation(), 400);

    group.addEventListener('change', (e) => {
      if (e.target.type === 'radio' && btnLanjut) {
        btnLanjut.disabled = false;
      }
    });

    btnBack?.addEventListener('click', () => _animateStepTransition(() => _showStep('tas')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;

      const card     = selected.closest('[data-score-resiliensi]');
      const skorResi = parseInt(card?.dataset.scoreResiliensi || '2', 10);
      const qteValue = selected.value;

      LenteraGame.setAvatarConfig('qte', qteValue);
      LenteraGame.addResiliensi(skorResi);

      _animateStepTransition(() => _showStep('baterai'));
    });
  }

  function _playCollisionAnimation() {
    const spark = document.getElementById('qte-spark');
    const npc   = document.getElementById('qte-npc');
    if (spark) {
      spark.style.animation = 'pulse 0.4s ease-in-out 3';
    }
    if (npc) {
      npc.querySelector('.npc-display')?.classList.add('npc-display--rush');
    }
  }

  // ── STEP 4: BATERAI SOSIAL ────────────────────────────────
  function _bindBaterai() {
    const group    = document.getElementById('baterai-group');
    const btnBack  = document.getElementById('btn-baterai-back');
    const btnLanjut= document.getElementById('btn-baterai-lanjut');
    const energyFill = document.getElementById('energy-fill');
    const energyBar  = document.getElementById('energy-bar');
    if (!group) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.baterai;
    if (saved) {
      const savedInput = group.querySelector(`input[value="${saved}"]`);
      if (savedInput) savedInput.checked = true;
      if (btnLanjut) btnLanjut.disabled = false;
      _updateEnergyBar(saved, energyFill, energyBar);
    }

    group.addEventListener('change', (e) => {
      if (e.target.type === 'radio') {
        if (btnLanjut) btnLanjut.disabled = false;
        _updateEnergyBar(e.target.value, energyFill, energyBar);
      }
    });

    btnBack?.addEventListener('click', () => _animateStepTransition(() => _showStep('qte')));

    btnLanjut?.addEventListener('click', () => {
      const selected = group.querySelector('input[type="radio"]:checked');
      if (!selected) return;

      const card      = selected.closest('[data-score-isolasi]');
      const skorIso   = parseInt(card?.dataset.scoreIsolasi || '1', 10);
      const batValue  = selected.value;

      LenteraGame.setAvatarConfig('baterai', batValue);
      LenteraGame.setIsolasi(skorIso);

      // Pos 1 selesai!
      _finishPos1();
    });
  }

  function _updateEnergyBar(bateraiValue, fillEl, barEl) {
    if (!fillEl) return;
    // keramaian = penuh (100%), pojok = 55%, pohon = 20%
    const pctMap = { keramaian: 100, pojok: 55, pohon: 20 };
    const pct    = pctMap[bateraiValue] || 0;
    fillEl.style.width = `${pct}%`;
    if (barEl) barEl.setAttribute('aria-valuenow', pct);
  }

  // ── Selesaikan Pos 1 ─────────────────────────────────────
  async function _finishPos1() {
    // Tampilkan animasi ringkasan
    showToast('✅ Avatar siap! Menuju Pasar Interaksi…', 'success', 2000);

    // Delay kecil supaya pemain bisa membaca toast
    await _sleep(1000);

    // Tandai selesai
    LenteraNav.completePos('pos1');

    // Navigasi ke pos2
    LenteraState.navigateTo('pos2', 'Menuju Pasar Interaksi… 🏪');
  }

  // ── Utility ──────────────────────────────────────────────
  function _animateStepTransition(callback) {
    const overlay = document.getElementById('pos1-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transform = 'translateY(10px)';
      overlay.style.transition = 'opacity 180ms ease, transform 180ms ease';
      setTimeout(() => {
        callback();
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
      }, 200);
    } else {
      callback();
    }
  }

  function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Public API ────────────────────────────────────────────
  return { init };

})();

window.Pos1BalaiRasa = Pos1BalaiRasa;
console.info('[LENTERA] pos1-balai-rasa.js dimuat ✓');
