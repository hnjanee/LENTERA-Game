/* ============================================================
   LATHI � pos4-bilik-lentera.js
   Pos 4: Bilik Cahaya � Ruang Aman & Sistem Pelaporan

   Laporan selalu dikirim dengan nama pemain (tidak ada anonim).
   Data tersimpan di localStorage dengan key lathi_laporan_bk.
   ============================================================ */

'use strict';

const Pos4BilikLentera = (() => {

  let isSubmitting = false;

  function init() {
    if (LenteraGame.state.posCompleted.pos4) {
      LenteraState.navigateTo('hasil');
      return;
    }

    // Restore isi laporan jika ada
    const savedLaporan = LenteraGame.state.laporan;
    if (savedLaporan.isi) {
      const textarea = document.getElementById('journal-text');
      if (textarea) {
        textarea.value = savedLaporan.isi;
        _updateCharCount();
        _updateSubmitBtn();
      }
    }

    // Tampilkan nama pemain di header jurnal
    const namaEl = document.getElementById('journal-nama-pemain');
    if (namaEl) {
      namaEl.textContent = LenteraGame.state.player.nama || '';
    }

    _bindHandlers();
  }

  function _bindHandlers() {
    _bindTextarea();
    _bindKirimBtn();
    _bindSkipBtn();
  }

  // -- Textarea ----------------------------------------------
  function _bindTextarea() {
    const textarea = document.getElementById('journal-text');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      _updateCharCount();
      _updateSubmitBtn();
    });

    // Autosave
    let timer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        LenteraGame.setLaporan(textarea.value);
        _showAutosaveIndicator();
      }, 2000);
    });
  }

  function _updateCharCount() {
    const textarea = document.getElementById('journal-text');
    const countEl  = document.getElementById('journal-char-current');
    if (!textarea || !countEl) return;
    const len = textarea.value.length;
    countEl.textContent = len;
    countEl.style.color = len > 1800 ? 'var(--color-danger)' : '';
  }

  function _updateSubmitBtn() {
    const textarea = document.getElementById('journal-text');
    const btn      = document.getElementById('btn-kirim-laporan');
    if (!textarea || !btn) return;
    btn.disabled = textarea.value.trim().length === 0 || isSubmitting;
  }

  function _showAutosaveIndicator() {
    const hint = document.getElementById('journal-hint');
    if (!hint) return;
    const orig = hint.innerHTML;
    hint.innerHTML = '<span>✅</span> Tersimpan otomatis';
    hint.style.color = 'var(--color-success)';
    setTimeout(() => { hint.innerHTML = orig; hint.style.color = ''; }, 2000);
  }

  // -- Kirim Laporan -----------------------------------------
  function _bindKirimBtn() {
    const btn = document.getElementById('btn-kirim-laporan');
    if (btn) btn.onclick = async function() {
      if (isSubmitting) return;
      const textarea = document.getElementById('journal-text');
      const isi = textarea?.value?.trim() || '';
      if (!isi) return;
      await _submitLaporan(isi);
    };
  }

  async function _submitLaporan(isi) {
    isSubmitting = true;
    _setLoadingState(true);

    LenteraGame.setLaporan(isi);

    const state   = LenteraGame.state;
    const payload = {
      sessionId  : state.sessionId,
      timestamp  : new Date().toISOString(),
      isAnonim   : false,
      namaPemain : state.player.nama,
      sekolah    : state.player.sekolah || '',
      gender     : state.player.avatarConfig?.gender || '',
      isiLaporan : isi,
      skor: {
        resiliensi : state.skor.resiliensi,
        isolasi    : state.skor.isolasi,
        stresType  : state.skor.stresType,
        pos2       : state.skor.pos2Responses,
      },
    };
    await _sleep(1500);

    // Simpan ke localStorage
    try {
      const key      = 'lathi_laporan_bk';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const idxDuplikat = existing.findIndex(
        l => l.sessionId === payload.sessionId && l.jenisLaporan !== 'konseling'
      );
      if (idxDuplikat >= 0) {
        existing[idxDuplikat] = { ...existing[idxDuplikat], ...payload };
      } else {
        existing.push(payload);
      }
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.warn('[Pos4] Gagal simpan laporan lokal:', e);
    }

    // Kirim ke Google Sheets
    _kirimKeSheets({ ...payload, type: 'laporan', _urgensi: _hitungUrgensiLokal(isi) });

    isSubmitting = false;
    _setLoadingState(false);
    _showSuksesKirim();
  }

  function _showSuksesKirim() {
    const container = document.getElementById('journal-container');
    if (!container) return;

    const nama = LenteraGame.state.player.nama;

    container.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:3rem;margin-bottom:16px;
          animation:float 2s ease-in-out infinite,pulse 2s ease-in-out infinite;">📨</div>
        <h2 style="color:#1A0A0A;margin-bottom:12px;font-size:1rem;font-weight:800;">
          Pesanmu sudah sampai, ${_esc(nama)}.
        </h2>
        <p style="color:#3A1A0A;font-size:11px;line-height:1.9;margin-bottom:10px;">
          Guru BK akan membaca ceritamu dan menghubungimu secara personal.
        </p>
        <p style="color:#5A3A1A;font-size:10px;line-height:1.8;margin-bottom:28px;">
          Butuh keberanian untuk cerita. Kamu sudah berani hari ini.
        </p>
        <button class="btn btn--primary btn--lg" id="btn-lihat-hasil"
          style="width:100%;justify-content:center;">
          Lihat Kartu LATHI-mu
        </button>
      </div>`;

    document.getElementById('btn-lihat-hasil')?.addEventListener('click', _finishPos4);
    showToast('Laporan terkirim ke Guru BK!', 'success', 4000);
  }

  // -- Skip -------------------------------------------------
  function _bindSkipBtn() {
    const btn = document.getElementById('btn-skip-cerita');
    if (btn) btn.onclick = function() {
      LenteraGame.setLaporan('');

      // Simpan ke dashboard meski tidak ada isi laporan
      try {
        const state   = LenteraGame.state;
        const payload = {
          sessionId   : state.sessionId,
          timestamp   : new Date().toISOString(),
          isAnonim    : false,
          namaPemain  : state.player.nama,
          sekolah     : state.player.sekolah || '',
          gender      : state.player.avatarConfig?.gender || '',
          jenisLaporan: 'skip',
          isiLaporan  : '',
          skor: {
            resiliensi : state.skor.resiliensi,
            isolasi    : state.skor.isolasi,
            stresType  : state.skor.stresType,
            pos2       : state.skor.pos2Responses,
          },
        };
        const key      = 'lathi_laporan_bk';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const idx      = existing.findIndex(l => l.sessionId === payload.sessionId && l.jenisLaporan !== 'konseling');
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...payload };
        } else {
          existing.push(payload);
        }
        localStorage.setItem(key, JSON.stringify(existing));
      } catch(e) {
        console.warn('[Pos4] Gagal simpan skip:', e);
      }
      const container = document.getElementById('journal-container');
      if (container) {
        container.innerHTML = `
          <div style="text-align:center;">
            <div style="font-size:3rem;margin-bottom:16px;animation:float 2s ease-in-out infinite;">🌿</div>
            <h2 style="color:#1A0A0A;margin-bottom:12px;font-size:1rem;font-weight:800;">
              Tidak apa-apa.
            </h2>
            <p style="color:#3A1A0A;font-size:10px;line-height:1.8;margin-bottom:28px;">
              Cerita butuh waktu dan kesiapan. Kamu bisa kembali kapan saja ketika sudah siap.
            </p>
            <button class="btn btn--primary btn--lg" id="btn-lihat-hasil"
              style="width:100%;justify-content:center;">
              Lihat Kartu LATHI-mu
            </button>
          </div>`;
        document.getElementById('btn-lihat-hasil').onclick = _finishPos4;
      }
    };
  }

  function _finishPos4() {
    LenteraNav.completePos('pos4');
    LenteraState.navigateTo('hasil', 'Menghitung perjalananmu...');
  }

  function _setLoadingState(loading) {
    const btn      = document.getElementById('btn-kirim-laporan');
    const textarea = document.getElementById('journal-text');
    if (btn) {
      btn.disabled  = loading;
      btn.innerHTML = loading
        ? '<span>⏳</span> Mengirim...'
        : '<span>📨</span> Kirim ke Guru BK';
    }
    if (textarea) textarea.disabled = loading;
  }

  function _esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Kirim ke Google Sheets ────────────────────────────────
  const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxR2OsfuO1QiL8n8DpedpD1sKcggm_g-DriXz52fYYBgPPklfIoRXDP_vCRGo8x8W7Teg/exec';

  function _kirimKeSheets(data) {
    try {
      fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(e => console.warn('[LATHI] Gagal kirim ke Sheets:', e));
    } catch(e) {
      console.warn('[LATHI] Gagal kirim ke Sheets:', e);
    }
  }

  function _hitungUrgensiLokal(isi) {
    const s = (isi || '').toLowerCase();
    if (['mati','bunuh diri','tidak mau hidup','dipukul','kekerasan'].some(k => s.includes(k))) return 'kritis';
    if (['takut sekolah','dikucilkan','dibully','malu sekali'].some(k => s.includes(k))) return 'tinggi';
    if (s.length > 100) return 'sedang';
    return 'normal';
  }

  return { init };

})();

window.Pos4BilikLentera = Pos4BilikLentera;
