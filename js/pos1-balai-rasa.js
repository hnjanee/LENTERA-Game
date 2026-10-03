/* ============================================================
   LATHI — pos1-balai-rasa.js  (versi ultra-simpel)
   Tidak ada cloneNode, tidak ada handler tracking.
   Setiap kali init() dipanggil, semua tombol langsung
   di-assign via .onclick = function() {...}
   ============================================================ */
'use strict';

const Pos1BalaiRasa = (() => {

  const STEPS = ['nama', 'gender', 'cuaca', 'tas', 'qte', 'baterai'];

  /* ── Tampilkan step tertentu ── */
  function show(step) {
    STEPS.forEach(s => {
      const el = document.getElementById('pos1-step-' + s);
      if (el) el.hidden = (s !== step);
    });
  }

  /* ── Init ── */
  function init() {
    if (LenteraGame.state.posCompleted.pos1) {
      LenteraState.navigateTo('pos2');
      return;
    }

    // Tentukan step awal
    const a = LenteraGame.state.player.avatarConfig;
    let start = 'nama';
    if      (a.baterai)                        start = 'baterai';
    else if (a.qte)                            start = 'qte';
    else if (a.tas)                            start = 'tas';
    else if (a.cuaca)                          start = 'cuaca';
    else if (a.gender)                         start = 'cuaca';
    else if (LenteraGame.state.player.nama)    start = 'gender';

    show(start);
    _setupNama();
    _setupGender();

    // Render karakter sesuai gender tersimpan
    if (a.gender && typeof _renderWeatherChars === 'function') {
      _renderWeatherChars();
    }
    _setupCuaca();
    _setupTas();
    _setupQte();
    _setupBaterai();
  }

  /* ══════════════════════════════════════════════════════════
     STEP 0: NAMA & SEKOLAH
  ══════════════════════════════════════════════════════════ */
  function _setupNama() {
    const inp = document.getElementById('input-nama');
    const sel = document.getElementById('input-sekolah');
    const btn = document.getElementById('btn-nama-lanjut');
    if (!inp || !btn) return;

    // Restore nilai tersimpan
    inp.value = LenteraGame.state.player.nama || '';
    if (sel) sel.value = LenteraGame.state.player.sekolah || '';

    // Fungsi cek validitas
    function cek() {
      const ok = inp.value.trim().length >= 2 && (!sel || sel.value !== '');
      btn.disabled = !ok;
    }
    cek();

    // Pasang listener via .oninput / .onchange (auto-overwrite, tidak duplikat)
    inp.oninput   = cek;
    inp.onkeydown = e => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
    if (sel) sel.onchange = cek;

    btn.onclick = function() {
      const nama    = inp.value.trim();
      const sekolah = sel ? sel.value : '';
      if (nama.length < 2) { showToast('Masukkan namamu ya.', 'info'); return; }
      if (sel && !sekolah)  { showToast('Pilih sekolahmu dulu.', 'info'); return; }
      LenteraGame.setNama(nama);
      if (typeof LenteraGame.setSekolah === 'function') LenteraGame.setSekolah(sekolah);
      show('gender');
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 1: GENDER
  ══════════════════════════════════════════════════════════ */
  function _setupGender() {
    const btn = document.getElementById('btn-gender-lanjut');
    const bak = document.getElementById('btn-gender-back');
    if (!btn) return;

    // Restore pilihan tersimpan
    const saved = LenteraGame.state.player.avatarConfig.gender;
    if (saved) {
      const el = document.querySelector(`#gender-group input[value="${saved}"]`);
      if (el) {
        el.checked = true;
        const card = el.closest('.gender-card');
        if (card) card.classList.add('selected');
      }
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }

    // Setiap radio di gender-group di-klik, enable tombol
    const grp = document.getElementById('gender-group');
    if (grp) {
      grp.onchange = function() {
        btn.disabled = false;
      };
      // Tambahkan juga langsung ke setiap radio untuk keamanan
      grp.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.onchange = function() {
          btn.disabled = false;
          // Update visual card selected state
          grp.querySelectorAll('.gender-card').forEach(c => c.classList.remove('selected'));
          const card = radio.closest('.gender-card');
          if (card) card.classList.add('selected');
        };
      });
      // Klik pada card langsung trigger radio
      grp.querySelectorAll('.gender-card').forEach(card => {
        card.onclick = function() {
          const radio = card.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };
      });
    }

    bak && (bak.onclick = function() { show('nama'); });

    btn.onclick = function() {
      const checked = document.querySelector('#gender-group input[type="radio"]:checked');
      if (!checked) {
        showToast('Pilih karaktermu dulu.', 'info');
        return;
      }
      LenteraGame.setGender(checked.value);
      LenteraGame.setAvatarConfig('gender', checked.value);
      // Render karakter di weather preview jika fungsi tersedia
      if (typeof _renderWeatherChars === 'function') _renderWeatherChars();
      show('cuaca');
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 2: CUACA HATI
  ══════════════════════════════════════════════════════════ */
  function _setupCuaca() {
    const btn = document.getElementById('btn-cuaca-lanjut');
    const bak = document.getElementById('btn-cuaca-back');
    if (!btn) return;

    const saved = LenteraGame.state.player.avatarConfig.cuaca;
    if (saved) {
      const el = document.querySelector(`#cuaca-group input[value="${saved}"]`);
      if (el) el.checked = true;
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }

    const grp = document.getElementById('cuaca-group');
    if (grp) grp.onchange = function() { btn.disabled = false; };

    bak && (bak.onclick = function() { show('gender'); });

    btn.onclick = function() {
      const checked = document.querySelector('#cuaca-group input[type="radio"]:checked');
      if (!checked) return;
      const card = checked.closest('[data-score-resiliensi]');
      LenteraGame.setAvatarConfig('cuaca', checked.value);
      LenteraGame.addResiliensi(parseInt(card?.dataset.scoreResiliensi || '2', 10));
      show('tas');
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 3: TAS RANSEL
  ══════════════════════════════════════════════════════════ */
  function _setupTas() {
    const btn = document.getElementById('btn-tas-lanjut');
    const bak = document.getElementById('btn-tas-back');
    if (!btn) return;

    const saved = LenteraGame.state.player.avatarConfig.tas;
    if (saved) {
      const el = document.querySelector(`#tas-group input[value="${saved}"]`);
      if (el) el.checked = true;
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }

    const grp = document.getElementById('tas-group');
    if (grp) grp.onchange = function() { btn.disabled = false; };

    bak && (bak.onclick = function() { show('cuaca'); });

    btn.onclick = function() {
      const checked = document.querySelector('#tas-group input[type="radio"]:checked');
      if (!checked) return;
      const card = checked.closest('[data-stres-type]');
      LenteraGame.setAvatarConfig('tas', checked.value);
      LenteraGame.setStresType(card?.dataset.stresType || 'akademik');
      const emojis = { buku: '📚', hp: '📱', kaca: '🔍' };
      showToast((emojis[checked.value] || '📦') + ' Sudah masuk tas!', 'success', 1200);
      setTimeout(function() { show('qte'); }, 700);
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 4: QTE
  ══════════════════════════════════════════════════════════ */
  function _setupQte() {
    const btn = document.getElementById('btn-qte-lanjut');
    const bak = document.getElementById('btn-qte-back');
    if (!btn) return;

    const saved = LenteraGame.state.player.avatarConfig.qte;
    if (saved) {
      const el = document.querySelector(`#qte-group input[value="${saved}"]`);
      if (el) el.checked = true;
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }

    const grp = document.getElementById('qte-group');
    if (grp) grp.onchange = function() { btn.disabled = false; };

    setTimeout(function() {
      const spark = document.getElementById('qte-spark');
      if (spark) spark.style.animation = 'pulse 0.4s ease-in-out 3';
    }, 400);

    bak && (bak.onclick = function() { show('tas'); });

    btn.onclick = function() {
      const checked = document.querySelector('#qte-group input[type="radio"]:checked');
      if (!checked) return;
      const card = checked.closest('[data-score-resiliensi]');
      LenteraGame.setAvatarConfig('qte', checked.value);
      LenteraGame.addResiliensi(parseInt(card?.dataset.scoreResiliensi || '2', 10));
      show('baterai');
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 5: BATERAI SOSIAL
  ══════════════════════════════════════════════════════════ */
  function _setupBaterai() {
    const btn   = document.getElementById('btn-baterai-lanjut');
    const bak   = document.getElementById('btn-baterai-back');
    const fill  = document.getElementById('energy-fill');
    const bar   = document.getElementById('energy-bar');
    if (!btn) return;

    function setBar(val) {
      if (!fill) return;
      const pct = { keramaian: 100, pojok: 55, pohon: 20 }[val] || 0;
      fill.style.width = pct + '%';
      if (bar) bar.setAttribute('aria-valuenow', pct);
    }

    const saved = LenteraGame.state.player.avatarConfig.baterai;
    if (saved) {
      const el = document.querySelector(`#baterai-group input[value="${saved}"]`);
      if (el) el.checked = true;
      btn.disabled = false;
      setBar(saved);
    } else {
      btn.disabled = true;
    }

    const grp = document.getElementById('baterai-group');
    if (grp) {
      grp.onchange = function(e) {
        btn.disabled = false;
        setBar(e.target.value);
      };
    }

    bak && (bak.onclick = function() { show('qte'); });

    btn.onclick = async function() {
      const checked = document.querySelector('#baterai-group input[type="radio"]:checked');
      if (!checked) return;
      const card = checked.closest('[data-score-isolasi]');
      LenteraGame.setAvatarConfig('baterai', checked.value);
      LenteraGame.setIsolasi(parseInt(card?.dataset.scoreIsolasi || '1', 10));
      showToast('Siap! Menuju Pasar Interaksi.', 'success', 2000);
      await new Promise(r => setTimeout(r, 900));
      LenteraNav.completePos('pos1');
      LenteraState.navigateTo('pos2', 'Menuju Pasar Interaksi...');
    };
  }

  return { init };
})();

window.Pos1BalaiRasa = Pos1BalaiRasa;
