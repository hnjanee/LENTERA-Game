/* ============================================================
   LENTERA — hasil.js
   Kalkulasi Skor Mental & Render Kartu Profil Mental
   ============================================================

   ALGORITMA KALKULASI:
   ─────────────────────────────────────────────────────────
   INPUT:
     skor.resiliensi  → max 9 poin  (cuaca 1-3 + qte 1-3 + pos2 3×3=9... cap di 9)
     skor.isolasi     → 1-3 poin
     skor.stresType   → 'akademik' | 'sosial' | 'insecurity'
     skor.pos2        → array respons (tipe: asertif/reaktif/pasif/dll)
     laporan.submitted→ boolean

   TIPE KARTU:
   ─────────────────────────────────────────────────────────
   'ksatria'  → resiliensi >= 7  DAN isolasi <= 1
   'daun'     → resiliensi < 7   ATAU isolasi >= 2

   SPECIAL TRIGGER untuk tombol konseling:
   → tipe === 'daun' ATAU laporan.submitted === true
   ─────────────────────────────────────────────────────────
*/

'use strict';

const HasilKartu = (() => {

  // ── Data Tipe Kartu ────────────────────────────────────────
  const TIPE_DATA = {
    ksatria: {
      emblem    : '⚔️',
      label     : 'Tipe Mental',
      nama      : 'Ksatria Lentera',
      sub       : 'Tangguh, Asertif & Bercahaya',
      headerClass: 'kartu-header--ksatria',
      desc      : 'Kamu punya fondasi mental yang kuat. Kata-kata tajam tidak mudah menghancurkanmu — kamu punya kemampuan membalikkan narasi dan menjaga harga diri.',
      ctaTeks   : '💪 Jadilah pelindung bagi teman yang sedang kesulitan. Kepekaan dan kekuatanmu bisa jadi lentera bagi orang lain.',
      shareText : (nama) => `Aku adalah "${nama}" dengan tipe Ksatria Lentera ⚔️🏮 — tangguh dan asertif! Main LENTERA yuk!`,
    },
    daun: {
      emblem    : '🍃',
      label     : 'Tipe Mental',
      nama      : 'Daun Terduduk',
      sub       : 'Sedang Lelah, Tapi Masih Tumbuh',
      headerClass: 'kartu-header--daun',
      desc      : 'Kamu sedang membawa beban yang cukup berat. Itu tidak berarti kamu lemah — itu berarti kamu manusia. Daun yang terduduk tetap terhubung dengan akarnya.',
      ctaTeks   : '🌿 Kamu tidak harus menanggung ini sendiri. Ada Guru BK yang siap mendengarmu — tanpa menghakimi, tanpa syarat.',
      shareText : (nama) => `Aku adalah "${nama}" dengan tipe Daun Terduduk 🍃 — sedang tumbuh dari luka. Main LENTERA yuk!`,
    },
  };

  // ── Render utama ──────────────────────────────────────────
  function render() {
    console.info('[Hasil] Menghitung & merender Kartu Profil Mental');

    const state = LenteraGame.state;

    // Hitung kalau belum
    if (!state.hasil.kalkulasiDone) {
      _kalkulasi(state);
    }

    const tipe   = state.hasil.tipe;
    const tipeInfo = TIPE_DATA[tipe] || TIPE_DATA.daun;

    _renderKartu(state, tipeInfo);
    _renderActions(state, tipeInfo);

    // Konfeti / animasi selesai
    setTimeout(() => _playCompletionAnimation(tipe), 600);
  }

  // ── Algoritma kalkulasi ────────────────────────────────────
  function _kalkulasi(state) {
    const resiliensi = state.skor.resiliensi;
    const isolasi    = state.skor.isolasi;

    // Hitung total skor (0-100%)
    const maxResi  = 9;   // cuaca(3) + qte(3) + pos2 3 skenario × 3 = 9, tapi cap
    const maxIso   = 3;

    // Persentase resiliensi (kontribusi 70%) + kebalikan isolasi (30%)
    const pctResi  = (resiliensi / maxResi) * 70;
    const pctIso   = ((maxIso - isolasi + 1) / maxIso) * 30; // rendah isolasi = bagus
    const total    = Math.min(100, Math.round(pctResi + pctIso));

    // Tentukan tipe
    let tipe;
    if (resiliensi >= 7 && isolasi <= 1) {
      tipe = 'ksatria';
    } else {
      tipe = 'daun';
    }

    // Simpan ke state
    state.hasil.tipe          = tipe;
    state.hasil.totalSkor     = total;
    state.hasil.persentase    = total;
    state.hasil.kalkulasiDone = true;

    LenteraStore.save();
    console.info(`[Hasil] Tipe: ${tipe} | Resiliensi: ${resiliensi}/9 | Isolasi: ${isolasi}/3 | Total: ${total}%`);
  }

  // ── Render kartu HTML ──────────────────────────────────────
  function _renderKartu(state, tipeInfo) {
    const kartu    = document.getElementById('kartu-profil');
    if (!kartu) return;

    const nama     = state.player.nama || 'Petualang';
    const pctResi  = Math.round((state.skor.resiliensi / 9) * 100);
    const pctIso   = Math.round(((3 - state.skor.isolasi + 1) / 3) * 100);
    const pctStres = _getStresScore(state.skor.stresType);
    const asertifCount = state.skor.pos2Responses.filter(r => r.tipe === 'asertif').length;
    const pos2Label    = `${asertifCount}/3 Respons Asertif`;

    // Tanggal
    const tgl = new Intl.DateTimeFormat('id-ID', {
      day:'numeric', month:'long', year:'numeric'
    }).format(new Date());

    kartu.innerHTML = `
      <div class="kartu-header ${tipeInfo.headerClass}">
        <div class="kartu-ornament" aria-hidden="true"></div>
        <div class="kartu-emblem" aria-hidden="true">${tipeInfo.emblem}</div>
        <p class="kartu-tipe-label">${tipeInfo.label}</p>
        <h2 class="kartu-tipe-name" id="hasil-title">${tipeInfo.nama}</h2>
        <p class="kartu-tipe-sub">${tipeInfo.sub}</p>
      </div>

      <div class="kartu-body">
        <p class="kartu-player-name">
          <span aria-hidden="true">✨</span> ${_escapHtml(nama)} <span aria-hidden="true">✨</span>
        </p>

        <div class="kartu-scores" role="group" aria-label="Skor detail">
          <div class="score-item">
            <p class="score-label">Resiliensi</p>
            <div class="score-bar" role="progressbar" aria-label="Skor resiliensi ${pctResi}%" aria-valuenow="${pctResi}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--resiliensi" style="width:0%" data-target="${pctResi}"></div>
            </div>
            <p class="score-value">${pctResi}%</p>
          </div>
          <div class="score-item">
            <p class="score-label">Koneksi Sosial</p>
            <div class="score-bar" role="progressbar" aria-label="Skor koneksi sosial ${pctIso}%" aria-valuenow="${pctIso}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--isolasi" style="width:0%" data-target="${pctIso}"></div>
            </div>
            <p class="score-value">${pctIso}%</p>
          </div>
          <div class="score-item">
            <p class="score-label">Manajemen Stres</p>
            <div class="score-bar" role="progressbar" aria-label="Skor manajemen stres ${pctStres}%" aria-valuenow="${pctStres}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--stres" style="width:0%" data-target="${pctStres}"></div>
            </div>
            <p class="score-value">${_getStresLabel(state.skor.stresType)}</p>
          </div>
          <div class="score-item">
            <p class="score-label">Asertivitas</p>
            <div class="score-bar" role="progressbar" aria-label="Asertivitas ${pos2Label}" aria-valuenow="${asertifCount * 33}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--resiliensi" style="width:0%" data-target="${asertifCount * 33}"></div>
            </div>
            <p class="score-value">${pos2Label}</p>
          </div>
        </div>

        <p class="kartu-desc">${tipeInfo.desc}</p>

        <div class="kartu-cta-text">
          ${tipeInfo.ctaTeks}
        </div>
      </div>

      <div class="kartu-footer">
        LENTERA · Diterbitkan ${tgl} · Lathi to Urup 🏮
      </div>
    `;

    // Animasi score bars (setelah mount)
    setTimeout(() => {
      kartu.querySelectorAll('.score-fill[data-target]').forEach(bar => {
        const target = bar.dataset.target;
        bar.style.transition = 'width 1.2s cubic-bezier(0.25,0.46,0.45,0.94)';
        bar.style.width = `${target}%`;
      });
    }, 400);
  }

  // ── Render action buttons ─────────────────────────────────
  function _renderActions(state, tipeInfo) {
    const actionsEl = document.getElementById('hasil-actions');
    if (!actionsEl) return;
    actionsEl.style.opacity = '1'; // override CSS animation

    // Tombol share
    const shareBtn = document.getElementById('btn-share-kartu');
    if (shareBtn) {
      const nama      = state.player.nama || 'Petualang';
      const shareText = tipeInfo.shareText(nama);
      shareBtn.addEventListener('click', () => _handleShare(shareText));
    }

    // Tombol konseling (hanya untuk tipe 'daun' atau yang mengisi laporan)
    const konselingBtn = document.getElementById('btn-konseling');
    const showKonseling = state.hasil.tipe === 'daun' || state.laporan.submitted;
    if (konselingBtn) {
      konselingBtn.hidden = !showKonseling;
      if (showKonseling) {
        konselingBtn.addEventListener('click', _openKonselingLink);
        // Tambahkan animasi perhatian
        konselingBtn.classList.add('btn--konseling');
        setTimeout(() => {
          konselingBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 1000);
      }
    }
  }

  // ── Share handler ─────────────────────────────────────────
  async function _handleShare(text) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kartu Profil LENTERA',
          text : text,
          url  : window.location.origin,
        });
        showToast('✅ Berhasil dibagikan!', 'success');
      } catch (e) {
        if (e.name !== 'AbortError') _fallbackShare(text);
      }
    } else {
      _fallbackShare(text);
    }
  }

  function _fallbackShare(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Teks disalin! Paste di sosmedmu ya.', 'success', 3000);
      }).catch(() => showToast('Teks: ' + text, 'info', 5000));
    } else {
      showToast('Teks: ' + text, 'info', 6000);
    }
  }

  // ── Link konseling BK ─────────────────────────────────────
  function _openKonselingLink() {
    // Dalam implementasi nyata: mengarah ke booking system BK
    // Contoh: window.open('https://bk.sekolah.id/jadwal', '_blank');
    showToast('🗓️ Membuka sistem jadwal konseling BK… (demo)', 'info', 3000);
    console.info('[Hasil] Redirect ke sistem konseling BK');
    // Simulasi buka tab baru
    setTimeout(() => {
      alert('Demo: Di sini akan terbuka halaman penjadwalan sesi konseling dengan Guru BK melalui Zoom/Chat. Semua percakapan bersifat rahasia dan profesional. 💛');
    }, 500);
  }

  // ── Animasi completion ────────────────────────────────────
  function _playCompletionAnimation(tipe) {
    // Animasi partikel di background
    const bgParticles = document.querySelector('.hasil-particles');
    if (bgParticles) {
      bgParticles.style.opacity  = '0.25';
      bgParticles.style.fontSize = '3rem';
      bgParticles.style.gap      = '60px';
    }

    if (tipe === 'ksatria') {
      showToast('⚔️ Ksatria Lentera! Kamu tangguh dan bercahaya.', 'success', 4000);
    } else {
      showToast('🌱 Kamu sudah jauh. Daun pun butuh waktu untuk mekar.', 'info', 4000);
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function _getStresScore(stresType) {
    const map = { akademik: 60, sosial: 50, insecurity: 45, null: 55 };
    return map[stresType] ?? 55;
  }

  function _getStresLabel(stresType) {
    const map = {
      akademik   : '📚 Akademik',
      sosial     : '📱 Sosial',
      insecurity : '🔍 Insecurity',
    };
    return map[stresType] || '—';
  }

  function _escapHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Public API ────────────────────────────────────────────
  return { render };

})();

window.HasilKartu = HasilKartu;
console.info('[LENTERA] hasil.js dimuat ✓');
