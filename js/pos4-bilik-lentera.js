/* ============================================================
   LENTERA — pos4-bilik-lentera.js
   Pos 4: Bilik Lentera — Ruang Aman & Sistem Pelaporan
   ============================================================

   ALUR:
   1. Pemain mengetik laporan di textarea (opsional)
   2. Pilih kirim sebagai Anonim atau dengan Nama
   3. Klik "Kirim ke Guru BK" atau tombol Skip
   4. Simulasi pengiriman terenkripsi → toast konfirmasi
   5. Tandai pos4 selesai → navigasi ke hasil

   KEAMANAN DATA (simulasi):
   - Dalam implementasi nyata, data dikirim via HTTPS ke backend
   - Field nama hanya disertakan jika isAnonim = false
   - sessionId selalu disertakan untuk tracking admin
   - Payload disimulasikan dengan console.log (mock API call)
   ============================================================ */

'use strict';

const Pos4BilikLentera = (() => {

  // ── State internal ────────────────────────────────────────
  let isSubmitting = false;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    console.info('[Pos4] Inisialisasi Bilik Lentera');

    if (LenteraGame.state.posCompleted.pos4) {
      LenteraState.navigateTo('hasil');
      return;
    }

    // Restore isi laporan jika ada
    const savedLaporan = LenteraGame.state.laporan;
    if (savedLaporan.isi) {
      const textarea = document.getElementById('journal-text');
      if (textarea) textarea.value = savedLaporan.isi;
      _updateCharCount();
      _updateSubmitBtn();
    }

    _bindHandlers();
    _playAmbientEffect();
  }

  // ── Bind semua handler ────────────────────────────────────
  function _bindHandlers() {
    _bindTextarea();
    _bindAnonOptions();
    _bindKirimBtn();
    _bindSkipBtn();
  }

  // ── Textarea: live counter & enable button ────────────────
  function _bindTextarea() {
    const textarea = document.getElementById('journal-text');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      _updateCharCount();
      _updateSubmitBtn();
      LenteraGame.setLaporan(textarea.value, _getAnonValue());
    });

    // Autosave setiap 2 detik (debounce)
    let autosaveTimer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        LenteraGame.setLaporan(textarea.value, _getAnonValue());
        _showAutosaveIndicator();
      }, 2000);
    });
  }

  function _updateCharCount() {
    const textarea   = document.getElementById('journal-text');
    const countEl    = document.getElementById('journal-char-current');
    if (!textarea || !countEl) return;
    const len = textarea.value.length;
    countEl.textContent = len;
    countEl.style.color = len > 1800 ? 'var(--color-danger)' : '';
  }

  function _updateSubmitBtn() {
    const textarea = document.getElementById('journal-text');
    const btn      = document.getElementById('btn-kirim-laporan');
    if (!textarea || !btn) return;
    const hasContent = textarea.value.trim().length > 0;
    btn.disabled     = !hasContent || isSubmitting;
  }

  function _getAnonValue() {
    const checked = document.querySelector('input[name="anon"]:checked');
    return checked ? checked.value === 'anonim' : true;
  }

  function _showAutosaveIndicator() {
    const hint = document.getElementById('journal-hint');
    if (!hint) return;
    const originalText = hint.innerHTML;
    hint.innerHTML = '<span>💾</span> Tersimpan otomatis';
    hint.style.color = 'var(--color-success)';
    setTimeout(() => {
      hint.innerHTML = originalText;
      hint.style.color = '';
    }, 2000);
  }

  // ── Opsi Anonim ──────────────────────────────────────────
  function _bindAnonOptions() {
    document.querySelectorAll('input[name="anon"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const textarea = document.getElementById('journal-text');
        if (textarea) LenteraGame.setLaporan(textarea.value, _getAnonValue());
      });
    });
  }

  // ── Tombol Kirim ─────────────────────────────────────────
  function _bindKirimBtn() {
    const btn = document.getElementById('btn-kirim-laporan');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (isSubmitting) return;
      const textarea = document.getElementById('journal-text');
      const isi      = textarea?.value?.trim() || '';
      if (!isi) return;

      await _submitLaporan(isi, _getAnonValue());
    });
  }

  // ── Proses Pengiriman Laporan ─────────────────────────────
  async function _submitLaporan(isi, isAnonim) {
    isSubmitting = true;
    _setLoadingState(true);

    // Simpan ke game state
    LenteraGame.setLaporan(isi, isAnonim);

    // Buat payload
    const state   = LenteraGame.state;
    const payload = _buildPayload(state, isi, isAnonim);

    // Simulasi enkripsi & pengiriman (mock)
    console.info('[Pos4] 🔒 Mengirim laporan terenkripsi…', {
      sessionId : payload.sessionId,
      isAnonim  : payload.isAnonim,
      namaField : isAnonim ? '[ANONIM]' : payload.namaPemain,
      panjangIsi: isi.length,
      skor      : payload.skor,
      timestamp : payload.timestamp,
    });

    // Simulasi delay API
    await _sleep(1800);

    // Dalam implementasi nyata: fetch('https://api.sekolah.id/bk/laporan', { method:'POST', ... })
    _simulasiKirimKeBK(payload);

    // Berhasil
    isSubmitting = false;
    _setLoadingState(false);
    _showSuksesKirim(isAnonim);
  }

  function _buildPayload(state, isi, isAnonim) {
    return {
      sessionId   : state.sessionId,
      timestamp   : new Date().toISOString(),
      isAnonim    : isAnonim,
      namaPemain  : isAnonim ? null : state.player.nama,
      isiLaporan  : isi,
      skor: {
        resiliensi : state.skor.resiliensi,
        isolasi    : state.skor.isolasi,
        stresType  : state.skor.stresType,
        pos2       : state.skor.pos2Responses,
      },
      avatarConfig: state.player.avatarConfig,
    };
  }

  function _simulasiKirimKeBK(payload) {
    // Simpan ke localStorage sebagai simulasi "terkirim ke BK"
    // Dalam produksi: ini dikirim ke server backend
    const laporanKey = 'lentera_laporan_bk';
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(laporanKey) || '[]');
    } catch (e) { existing = []; }
    existing.push(payload);
    try {
      localStorage.setItem(laporanKey, JSON.stringify(existing));
    } catch (e) {
      console.warn('[Pos4] Gagal menyimpan laporan lokal:', e);
    }
    console.info('[Pos4] ✅ Laporan berhasil "dikirim" ke sistem BK');
  }

  // ── Tampilkan sukses kirim ────────────────────────────────
  function _showSuksesKirim(isAnonim) {
    const container = document.getElementById('journal-container');
    if (!container) return;

    const anonInfo = isAnonim
      ? 'Laporan dikirim secara <strong>anonim</strong> — Guru BK tidak tahu siapa kamu, tapi mereka tahu kamu butuh didengar.'
      : 'Laporan dikirim <strong>dengan namamu</strong> — Guru BK akan menghubungimu secara personal dalam waktu dekat.';

    // Ganti konten container dengan konfirmasi
    container.innerHTML = `
      <div class="kirim-sukses" role="status" aria-live="polite">
        <div class="sukses-icon" aria-hidden="true">📨</div>
        <h2 class="dialog-title" style="color: var(--color-text-inverse); text-align:center; margin-bottom:12px;">
          Bebanmu sudah sampai.
        </h2>
        <p style="color:rgba(253,250,244,0.7); text-align:center; font-size:15px; line-height:1.7; margin-bottom:20px;">
          ${anonInfo}
        </p>
        <p style="color:rgba(253,250,244,0.6); text-align:center; font-size:13px; margin-bottom:28px;">
          Butuh waktu untuk berani cerita itu besar sekali. Kamu sudah melakukan hal yang luar biasa hari ini. 🌿
        </p>
        <button class="btn btn--primary btn--lg" id="btn-lihat-hasil" style="width:100%;justify-content:center;">
          Lihat Kartu Lenteramu ✨
        </button>
      </div>
    `;

    // Styling sukses
    const style = document.createElement('style');
    style.textContent = `
      .kirim-sukses { text-align:center; }
      .sukses-icon {
        font-size: 3.5rem; margin-bottom: 16px;
        animation: float 2s ease-in-out infinite, pulse 2s ease-in-out infinite;
        display: block;
      }
    `;
    if (!document.getElementById('sukses-style')) {
      style.id = 'sukses-style';
      document.head.appendChild(style);
    }

    document.getElementById('btn-lihat-hasil')?.addEventListener('click', _finishPos4);

    showToast('📨 Laporan terkirim ke Guru BK. Kamu berani!', 'success', 4000);
  }

  // ── Tombol Skip ───────────────────────────────────────────
  function _bindSkipBtn() {
    const btn = document.getElementById('btn-skip-cerita');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      // Simpan sebagai skipped
      LenteraGame.setLaporan('', true);

      // Tampilkan pesan empati sebelum lanjut
      const container = document.getElementById('journal-container');
      if (container) {
        container.innerHTML = `
          <div class="kirim-sukses" role="status" aria-live="polite">
            <div class="sukses-icon" aria-hidden="true">🌿</div>
            <h2 class="dialog-title" style="color:var(--color-text-inverse);text-align:center;margin-bottom:12px;">
              Oke, tidak apa-apa.
            </h2>
            <p style="color:rgba(253,250,244,0.7);text-align:center;font-size:15px;line-height:1.7;margin-bottom:28px;">
              Bercerita itu butuh keberanian dan kesiapan. Kamu tidak harus melakukannya sekarang.
              Bilik Lentera ini akan selalu ada untukmu kapan pun kamu siap. 🌿
            </p>
            <button class="btn btn--primary btn--lg" id="btn-lihat-hasil" style="width:100%;justify-content:center;">
              Lihat Kartu Lenteramu ✨
            </button>
          </div>
        `;
        document.getElementById('btn-lihat-hasil')?.addEventListener('click', _finishPos4);
      }
    });
  }

  // ── Selesaikan Pos 4 ─────────────────────────────────────
  function _finishPos4() {
    LenteraNav.completePos('pos4');
    LenteraState.navigateTo('hasil', 'Menghitung perjalananmu… ✨');
  }

  // ── Loading state visual ──────────────────────────────────
  function _setLoadingState(loading) {
    const btn      = document.getElementById('btn-kirim-laporan');
    const textarea = document.getElementById('journal-text');
    if (btn) {
      btn.disabled  = loading;
      btn.innerHTML = loading
        ? '<span aria-hidden="true">📡</span> Mengirim...'
        : '<span aria-hidden="true">📨</span> Kirim ke Guru BK';
    }
    if (textarea) textarea.disabled = loading;
  }

  // ── Efek ambiance: suara gemericik air (simulasi) ─────────
  function _playAmbientEffect() {
    // Dalam implementasi nyata, mainkan audio ambiance
    // const audio = new Audio('assets/sounds/water-stream.mp3');
    // audio.loop = true; audio.volume = 0.2; audio.play().catch(() => {});
    console.info('[Pos4] 🎵 Ambient bilik lentera aktif (simulasi)');
  }

  function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Public API ────────────────────────────────────────────
  return { init };

})();

window.Pos4BilikLentera = Pos4BilikLentera;
console.info('[LENTERA] pos4-bilik-lentera.js dimuat ✓');
