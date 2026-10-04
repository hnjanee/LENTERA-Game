/* ============================================================
   LATHI — hasil.js
   Kalkulasi Skor & Render Kartu LATHI
   ============================================================

   ALGORITMA KALKULASI:
   ─────────────────────────────────────────────────────────
   INPUT:
     skor.resiliensi  → max 15 poin (Pos 1)
     skor.isolasi     → 1-3 poin (Pos 1)
     skor.pos2Responses → array respons asertif/reaktif/pasif (Pos 2)
     laporan.submitted  → boolean (Pos 4)

   SISTEM POIN GABUNGAN (Pos 1-2):
     Pos 1 Resiliensi  → 1-5 poin (berdasarkan nilai resiliensi)
     Pos 1 Isolasi     → 1-3 poin (isolasi rendah = poin tinggi)
     Pos 2 Asertivitas → (asertif × 2) - (reaktif × 1), max 6
     Total max         → ~14 poin

   TIPE KARTU:
   ─────────────────────────────────────────────────────────
   'air-mengalir'  → totalPoin >= 13
   'bambu-lentur'  → totalPoin >= 9
   'duri-perisai'  → reaktif dominan
   'daun-terduduk' → default (pasif/isolasi tinggi)
   ─────────────────────────────────────────────────────────
*/

'use strict';

const HasilKartu = (() => {

  // ── Data Tipe Kartu ────────────────────────────────────────
  const TIPE_DATA = {
    'daun-terduduk': {
      emblem      : '🍂',
      label       : 'Kartu LATHI',
      nama        : 'Daun Terduduk',
      sub         : 'Lembut, Damai, Sedang Bertumbuh',
      headerClass : 'kartu-header--daun-terduduk',
      tagline     : 'Laksana daun yang gugur perlahan, kamu memilih mengalah dan mengikuti arus demi menjaga kedamaian.',
      karakteristik: 'Kamu sosok yang lembut, menyukai ketenangan, dan tidak suka memperpanjang masalah. Namun, kamu sering menyimpan beban emosional sendirian demi menghindari konflik.',
      refleksi    : 'Terlalu sering diam dan menunduk bisa membuat orang lain lupa bahwa kamu juga punya batas rasa. Mengalah tidak selalu berarti lemah, tetapi menyuarakan kebenaran adalah bentuk penghargaan atas dirimu sendiri.',
      pesan       : 'Lathi-mu (ucapanmu) berharga. Jangan takut untuk berkata tidak atau meminta bantuan saat kamu terluka.',
      shareText   : (nama) => `Aku adalah "${nama}" dengan kartu LATHI 🍂 Daun Terduduk. Yuk main LATHI!`,
    },
    'duri-perisai': {
      emblem      : '🏜️',
      label       : 'Kartu LATHI',
      nama        : 'Duri Perisai',
      sub         : 'Pemberani, Tegas, Berapi-api',
      headerClass : 'kartu-header--duri-perisai',
      tagline     : 'Laksana duri yang tajam, kamu langsung memasang perisai keras agar tidak ada seorang pun yang bisa merendahkanmu.',
      karakteristik: 'Kamu sosok yang pemberani, tegas, dan punya benteng diri yang kuat. Kamu tidak akan tinggal diam jika ada yang mengganggu ketenanganmu.',
      refleksi    : 'Keberanianmu membela diri adalah hal hebat. Namun, ketajaman lathi (ucapan) yang dibalas dengan api terkadang bisa memperbesar konflik dan melukai hubungan sosialmu sendiri.',
      pesan       : 'Kekuatan sejati bukan tentang seberapa keras kamu membalas, melainkan seberapa bijak kamu mengendalikan emosi tanpa harus melukai balik.',
      shareText   : (nama) => `Aku adalah "${nama}" dengan kartu LATHI 🏜️ Duri Perisai. Yuk main LATHI!`,
    },
    'bambu-lentur': {
      emblem      : '🎋',
      label       : 'Kartu LATHI',
      nama        : 'Bambu Lentur',
      sub         : 'Tenang, Asertif & Bercahaya',
      headerClass : 'kartu-header--bambu-lentur',
      tagline     : 'Laksana bambu yang meliuk ditiup angin kencang, kamu tidak patah oleh tekanan dan tetap berdiri kokoh.',
      karakteristik: 'Kamu memiliki kecerdasan emosional yang tinggi dan ketenangan luar biasa. Kamu mampu menetapkan batasan tanpa perlu terpancing emosi.',
      refleksi    : 'Kamu paham betul bahwa lathi (ucapan) negatif orang lain tidak menentukan nilai dirimu. Kamu mampu mematikan niat buruk orang lain dengan kebaikan dan ketegasan yang elegan.',
      pesan       : 'Pertahankan ketenangan ini. Jadilah inspirasi dan pelindung bagi orang-orang di sekitarmu yang belum menemukan keberanian mereka.',
      shareText   : (nama) => `Aku adalah "${nama}" dengan kartu LATHI 🎋 Bambu Lentur. Yuk main LATHI!`,
    },
    'air-mengalir': {
      emblem      : '🌊',
      label       : 'Kartu LATHI',
      nama        : 'Air Mengalir',
      sub         : 'Empati Tinggi, Pembela Kebaikan',
      headerClass : 'kartu-header--air-mengalir',
      tagline     : 'Laksana air murni yang membersihkan dan menenangkan, kehadiranmu membawa rasa aman bagi siapapun di sekitarmu.',
      karakteristik: 'Kamu memiliki empati yang sangat kuat dan keberanian moral (moral courage). Kamu tidak bisa diam melihat ketidakadilan terjadi pada orang lain.',
      refleksi    : 'Sikapmu yang berani bersuara untuk membela sesama membuat dunia di sekitarmu menjadi tempat yang lebih aman.',
      pesan       : 'Dunia membutuhkan lebih banyak suara (lathi) seperti milikmu. Tetaplah menjadi pembela kebaikan.',
      shareText   : (nama) => `Aku adalah "${nama}" dengan kartu LATHI 🌊 Air Mengalir. Yuk main LATHI!`,
    },
  };

  // ── Render utama ──────────────────────────────────────────
  function render() {
    const state = LenteraGame.state;

    // Hitung kalau belum
    if (!state.hasil.kalkulasiDone) {
      _kalkulasi(state);
    }

    // Simpan sesi ke list permanen supaya dashboard bisa baca
    _simpanSesi(state);

    const tipe   = state.hasil.tipe;
    const tipeInfo = TIPE_DATA[tipe] || TIPE_DATA['daun-terduduk'];

    _renderKartu(state, tipeInfo);
    _renderActions(state, tipeInfo);

    // Konfeti / animasi selesai
    setTimeout(() => _playCompletionAnimation(tipe), 600);
  }

  // ── Simpan sesi ke list permanen ──────────────────────────
  function _simpanSesi(state) {
    try {
      const key      = 'lathi_sesi_list';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const idx      = existing.findIndex(s => s.sessionId === state.sessionId);
      const entry = {
        sessionId : state.sessionId,
        startedAt : state.startedAt,
        completedAt: new Date().toISOString(),
        nama      : state.player.nama,
        sekolah   : state.player.sekolah || '',
        gender    : state.player.avatarConfig?.gender || '',
        tipe      : state.hasil.tipe,
        skor      : state.hasil.totalSkor || 0,
        skorDetail: {
          resiliensi: state.skor.resiliensi,
          isolasi   : state.skor.isolasi,
          stresType : state.skor.stresType,
          pos2      : state.skor.pos2Responses,
        },
        stres     : state.skor.stresType || null,
        laporan   : state.laporan.submitted || false,
      };
      if (idx >= 0) {
        existing[idx] = entry;
      } else {
        existing.push(entry);
      }
      localStorage.setItem(key, JSON.stringify(existing));
    } catch(e) {
      console.warn('[LATHI] Gagal simpan sesi:', e);
    }
  }

  // ── Algoritma kalkulasi ────────────────────────────────────
  function _kalkulasi(state) {
    const resiliensi = state.skor.resiliensi;
    const isolasi    = state.skor.isolasi;
    const responses  = state.skor.pos2Responses;

    // Hitung total skor (0-100%)
    // Resiliensi (50%) + Koneksi Sosial (25%) + Asertivitas Pos 2 (25%)
    const maxResi  = 15;
    const maxIso   = 3;

    // Hitung jumlah per kelompok respons (Pos 2) — harus sebelum pctPos2
    const asertifCount = responses.filter(r => r.tipe === 'asertif').length;
    const reaktifCount = responses.filter(r => r.tipe === 'reaktif').length;
    const pasifCount   = responses.filter(
      r => r.tipe === 'pasif' || r.tipe === 'internalisasi' || r.tipe === 'menarikdiri'
    ).length;

    const pctResi  = (resiliensi / maxResi) * 50;
    const pctIso   = ((maxIso - isolasi + 1) / maxIso) * 25;
    const pctPos2  = (asertifCount / 3) * 25;
    const total    = Math.min(100, Math.round(pctResi + pctIso + pctPos2));

    // ── Sistem poin gabungan semua pos ──────────────────────
    // Pos 1 — Resiliensi (0-5 poin): tinggi = resilien
    const poinResi = resiliensi >= 12 ? 5 : resiliensi >= 8 ? 4 : resiliensi >= 5 ? 3 : resiliensi >= 3 ? 2 : 1;
    // Pos 1 — Isolasi (0-3 poin): isolasi rendah = positif
    const poinIso  = isolasi === 1 ? 3 : isolasi === 2 ? 2 : 1;
    // Pos 2 — Asertivitas (0-6 poin): 2 poin per respons asertif
    const poinPos2 = (asertifCount * 2) - (reaktifCount * 1);
    // Pos 4 — tidak dihitung dalam tipe mental
    const poinLaporan = 0;

    const totalPoin = poinResi + poinIso + poinPos2; // max ~14

    // Tentukan tipe kartu dari poin gabungan
    let tipe;
    if (totalPoin >= 13) {
      tipe = 'air-mengalir';
    } else if (totalPoin >= 9) {
      tipe = 'bambu-lentur';
    } else if (reaktifCount > asertifCount && reaktifCount >= pasifCount) {
      tipe = 'duri-perisai';
    } else {
      tipe = 'daun-terduduk';
    }

    state.hasil.tipe          = tipe;
    state.hasil.totalSkor     = total;
    state.hasil.persentase    = total;
    state.hasil.kalkulasiDone = true;

    LenteraStore.save();
  }

  // ── Render kartu HTML ──────────────────────────────────────
  function _renderKartu(state, tipeInfo) {
    const kartu    = document.getElementById('kartu-profil');
    if (!kartu) return;

    const tipe     = state.hasil.tipe;
    const nama     = state.player.nama || 'Petualang';
    const pctResi  = Math.round((state.skor.resiliensi / 15) * 100);
    const pctIso   = Math.round(((3 - state.skor.isolasi + 1) / 3) * 100);
    const asertifCount = state.skor.pos2Responses.filter(r => r.tipe === 'asertif').length;
    const pos2Label    = `${asertifCount}/3 Respons Asertif`;
    // Kepedulian Sosial: asertif (maks 3 × 28 = 84%) + laporan submitted (16%)
    const pctPeduli = Math.min(100, Math.round((asertifCount / 3) * 84) + (state.laporan.submitted ? 16 : 0));
    const peduliLabel = pctPeduli >= 80 ? 'Sangat Tinggi' : pctPeduli >= 50 ? 'Tinggi' : pctPeduli >= 28 ? 'Sedang' : 'Perlu Ditumbuhkan';

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

        <div class="kartu-tagline">${tipeInfo.tagline}</div>

        <div class="kartu-karakteristik">
          <p class="kartu-karak-label">Karakteristik</p>
          <p class="kartu-karak-text">${tipeInfo.karakteristik}</p>
        </div>

        <div class="kartu-refleksi">
          <p class="kartu-refleksi-label">Refleksi LATHI</p>
          <p class="kartu-refleksi-text">${tipeInfo.refleksi}</p>
        </div>

        <div class="kartu-pesan">
          <p class="kartu-pesan-text">${tipeInfo.pesan}</p>
        </div>

        <div class="kartu-scores" role="group" aria-label="Skor detail">
          <div class="score-item">
            <p class="score-label">Resiliensi</p>
            <div class="score-bar" role="progressbar" aria-label="Skor resiliensi ${pctResi}%" aria-valuenow="${pctResi}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--${tipe}" style="width:0%" data-target="${pctResi}"></div>
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
            <p class="score-label">Kepedulian Sosial</p>
            <div class="score-bar" role="progressbar" aria-label="Kepedulian sosial ${pctPeduli}%" aria-valuenow="${pctPeduli}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--peduli" style="width:0%" data-target="${pctPeduli}"></div>
            </div>
            <p class="score-value">${peduliLabel}</p>
          </div>
          <div class="score-item">
            <p class="score-label">Asertivitas</p>
            <div class="score-bar" role="progressbar" aria-label="Asertivitas ${pos2Label}" aria-valuenow="${asertifCount * 33}" aria-valuemin="0" aria-valuemax="100">
              <div class="score-fill score-fill--${tipe}" style="width:0%" data-target="${asertifCount * 33}"></div>
            </div>
            <p class="score-value">${pos2Label}</p>
          </div>
        </div>
      </div>

      <div class="kartu-footer">
        LATHI · Diterbitkan ${tgl} · Lathi to Urup 🌙
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

    // Tombol konseling (untuk tipe 'daun-terduduk' atau yang mengisi laporan)
    const konselingBtn = document.getElementById('btn-konseling');
    const showKonseling = state.hasil.tipe === 'daun-terduduk' || state.laporan.submitted;
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
          title: 'Kartu Profil LATHI',
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

  // ── Link konseling BK, kirim pesan, tampilkan konfirmasi di halaman ──
  function _openKonselingLink() {
    const state = LenteraGame.state;

    try {
      const konselingKey = 'lathi_laporan_bk';
      const existing = JSON.parse(localStorage.getItem(konselingKey) || '[]');

      // Konseling selalu buat entri baru yang terpisah dari laporan Pos 4
      // Cek hanya apakah sudah ada entri konseling sebelumnya untuk session ini
      const sudahKonseling = existing.some(
        l => l.sessionId === state.sessionId && l.jenisLaporan === 'konseling'
      );

      if (!sudahKonseling) {
        existing.push({
          sessionId   : state.sessionId,
          timestamp   : new Date().toISOString(),
          isAnonim    : false,
          namaPemain  : state.player.nama,
          sekolah     : state.player.sekolah || '',
          gender      : state.player.avatarConfig?.gender || '',
          jenisLaporan: 'konseling',
          isiLaporan  : `${state.player.nama} dari ${state.player.sekolah || 'sekolah tidak diketahui'} meminta sesi ngobrol dengan Guru BK.`,
          skor: {
            resiliensi : state.skor.resiliensi,
            isolasi    : state.skor.isolasi,
            stresType  : state.skor.stresType,
            pos2       : state.skor.pos2Responses,
          },
          _status : 'belum_dibaca',
          _urgensi: state.hasil.tipe === 'daun-terduduk' ? 'tinggi' : 'sedang',
        });
        localStorage.setItem(konselingKey, JSON.stringify(existing));
      }
    } catch(e) {}

    // Tampilkan konfirmasi di halaman (bukan redirect)
    const konselingBtn = document.getElementById('btn-konseling');
    if (konselingBtn) {
      konselingBtn.disabled   = true;
      konselingBtn.innerHTML  = '✅ Permintaan Terkirim ke Guru BK!';
      konselingBtn.style.background = '#2D7A4F';
      konselingBtn.style.animation  = 'none';
    }

    // Tampilkan pesan konfirmasi di bawah kartu
    const actions = document.getElementById('hasil-actions');
    if (actions && !document.getElementById('konseling-confirm-msg')) {
      const msg = document.createElement('div');
      msg.id = 'konseling-confirm-msg';
      msg.style.cssText = `
        background: rgba(45,122,79,0.15);
        border: 1.5px solid rgba(45,122,79,0.4);
        border-radius: 12px;
        padding: 14px 18px;
        text-align: center;
        color: #7ED4A0;
        font-size: 14px;
        line-height: 1.65;
        width: 100%;
        animation: slideInUp 300ms ease forwards;
      `;
      msg.innerHTML = `
        <div style="font-size:1.6rem;margin-bottom:8px;">✅</div>
        <strong style="color:#A0E8C0;display:block;margin-bottom:6px;">
          Permintaan konseling berhasil dikirim!
        </strong>
        Guru BK di <strong>${LenteraGame.state.player.sekolah || 'sekolahmu'}</strong>
        akan segera menghubungimu untuk menjadwalkan sesi ngobrol santai.
        Kamu sudah berani melangkah maju.
      `;
      actions.appendChild(msg);
    }
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

    const toastMap = {
      'air-mengalir' : '🌊 Air Mengalir! Kamu adalah suara kebaikan.',
      'bambu-lentur' : '🎋 Bambu Lentur! Tenang, asertif, dan bercahaya.',
      'duri-perisai' : '🏜️ Duri Perisai! Pemberani dan berapi-api.',
      'daun-terduduk': '🍂 Daun Terduduk. Kamu sedang bertumbuh.',
    };
    showToast(toastMap[tipe] || '✨ Perjalananmu selesai!', 'success', 4000);
  }

  // ── Helpers ───────────────────────────────────────────────
  function _escapHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Public API ────────────────────────────────────────────
  return { render };

})();

window.HasilKartu = HasilKartu;
