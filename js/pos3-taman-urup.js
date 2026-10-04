/* ============================================================
   LENTERA — pos3-taman-urup.js
   Pos 3: Taman Urup — Pilih Kalimat Afirmasi
   ============================================================

   MEKANISME:
   - Setiap ronde: pemain membaca situasi bullying, lalu memilih
     1 dari 4 kalimat afirmasi untuk menguatkan diri.
   - Ada 1 jawaban terbaik, 2 cukup baik, 1 tidak tepat.
   - Lampion menyala setelah memilih jawaban terbaik.
   - Pemain tetap bisa lanjut meski memilih yang bukan terbaik
     (setelah diberi refleksi singkat).
   ============================================================ */

'use strict';

const Pos3TamanUrup = (() => {

  // ── Data Puzzle ───────────────────────────────────────────
  // Setiap puzzle: 1 kalimat afirmasi terbaik + 2 kalimat yang mengiyakan ejekan
  const PUZZLES = [
    {
      id      : 1,
      konteks : '💬 Kamu dibilang: "Kamu baper banget sih, lebay deh!"',
      instruksi: 'Pilih kalimat yang paling menguatkan dirimu:',
      pilihan : [
        { teks: 'Aku boleh merasa sedih. Perasaanku nyata dan valid.',  terbaik: true  },
        { teks: 'Iya, mungkin aku memang terlalu lebay dan sensitif.',  terbaik: false },
        { teks: 'Benar juga, aku harus berhenti baper dan lebih tegar.', terbaik: false },
      ],
      lampionMsg  : 'Lampion menyala! Merasa sedih itu manusiawi, bukan kelemahan.',
      refleksiSalah: 'Perasaanmu nyata dan berhak diakui. Kamu tidak lebay — kamu manusia.',
    },
    {
      id      : 2,
      konteks : '💬 Kamu dibilang: "Bagus sih, tapi paling cuma hoki doang."',
      instruksi: 'Pilih kalimat yang paling menguatkan dirimu:',
      pilihan : [
        { teks: 'Usahaku nyata dan berharga, terlepas dari pendapat orang.', terbaik: true  },
        { teks: 'Mungkin benar, hasilku memang karena keberuntungan saja.',  terbaik: false },
        { teks: 'Iya, aku harus kerja lebih keras agar tidak dibilang hoki.', terbaik: false },
      ],
      lampionMsg  : 'Lampion menyala! Kerja kerasmu bukan kebetulan.',
      refleksiSalah: 'Nilaimu tidak ditentukan oleh pengakuan orang lain. Usahamu sudah nyata.',
    },
    {
      id      : 3,
      konteks : '💬 Kamu dibilang: "Kamu ga usah ikut, ntar ngerusak suasana."',
      instruksi: 'Pilih kalimat yang paling menguatkan dirimu:',
      pilihan : [
        { teks: 'Aku layak diterima dan kehadiranku berarti.',              terbaik: true  },
        { teks: 'Mungkin aku memang terlalu mengganggu, lebih baik minggir.', terbaik: false },
        { teks: 'Iya, kayaknya aku memang sering bikin suasana jadi canggung.', terbaik: false },
      ],
      lampionMsg  : 'Lampion menyala! Kamu berharga dan layak ada di sini.',
      refleksiSalah: 'Kamu tidak perlu membuktikan apa-apa. Kehadiranmu sendiri sudah bernilai.',
    },
  ];

  // ── State internal ────────────────────────────────────────
  let currentPuzzleIndex = 0;
  let completedPuzzles   = 0;
  let answered           = false;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (LenteraGame.state.posCompleted.pos3) {
      LenteraState.navigateTo('pos4');
      return;
    }

    currentPuzzleIndex = 0;
    completedPuzzles   = 0;
    answered           = false;

    _bindIntro();
  }

  function _bindIntro() {
    const btn = document.getElementById('btn-pos3-mulai');
    if (btn) btn.onclick = function() {
      document.getElementById('pos3-intro').hidden  = true;
      document.getElementById('puzzle-area').hidden = false;
      _loadPuzzle(0);
    };
  }

  // ── Muat puzzle ───────────────────────────────────────────
  function _loadPuzzle(index) {
    if (index >= PUZZLES.length) {
      _showComplete();
      return;
    }

    const puzzle = PUZZLES[index];
    answered = false;

    // Update counter
    document.getElementById('puzzle-current').textContent = index + 1;
    document.getElementById('puzzle-total').textContent   = PUZZLES.length;

    // Konteks
    const ctx = document.getElementById('puzzle-context');
    if (ctx) {
      ctx.innerHTML = `
        <div style="margin-bottom:6px;font-style:italic;color:rgba(253,250,244,0.65);font-size:13px;">
          ${puzzle.konteks}
        </div>
        <div style="font-size:12px;color:rgba(240,201,58,0.8);font-weight:600;">
          ${puzzle.instruksi}
        </div>`;
    }

    // Sembunyikan feedback lama
    const feedback = document.getElementById('puzzle-feedback');
    if (feedback) feedback.hidden = true;

    // Render pilihan kalimat (acak urutan)
    _renderPilihan(puzzle);
  }

  // ── Render pilihan kalimat ────────────────────────────────
  function _renderPilihan(puzzle) {
    // Sembunyikan drop-zone — tidak dipakai di mode pilih kalimat
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.hidden = true;
      dropZone.style.display = 'none';
    }
    const placeholder = document.getElementById('drop-placeholder');
    if (placeholder) placeholder.hidden = true;

    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';
    bank.style.flexDirection = 'column';

    // Acak urutan pilihan
    const indices = [...puzzle.pilihan.keys()];
    _shuffle(indices);

    indices.forEach((i, order) => {
      const pilihan = puzzle.pilihan[i];
      const btn     = document.createElement('button');
      btn.className = 'kalimat-pilihan';
      btn.textContent = pilihan.teks;
      btn.dataset.index   = String(i);
      btn.dataset.terbaik = pilihan.terbaik ? '1' : '0'; // simpan sebagai string '1'/'0'
      btn.style.animationDelay = `${order * 80}ms`;
      btn.setAttribute('draggable', 'false');             // non-draggable
      btn.setAttribute('aria-label', `Pilihan: ${pilihan.teks}`);

      btn.addEventListener('click', () => _pilihJawaban(puzzle, i, btn));
      bank.appendChild(btn);
    });

    // Sembunyikan tombol cek & reset
    const controls = document.querySelector('.puzzle-controls');
    if (controls) controls.hidden = true;
  }

  // ── Handle pilihan jawaban ────────────────────────────────
  function _pilihJawaban(puzzle, pilihanIndex, btnEl) {
    if (answered) return;
    answered = true;

    const pilihan = puzzle.pilihan[pilihanIndex];
    const terbaik = pilihan.terbaik === true; // pastikan boolean

    // Tandai semua tombol
    document.querySelectorAll('.kalimat-pilihan').forEach(b => {
      b.disabled = true;
      const idx  = parseInt(b.dataset.index, 10);
      if (puzzle.pilihan[idx].terbaik === true) {
        b.classList.add('kalimat-benar');
      } else if (idx === pilihanIndex) {
        b.classList.add('kalimat-salah');
      } else {
        b.classList.add('kalimat-redup');
      }
    });

    // Tampilkan feedback
    _showFeedback(terbaik, puzzle);

    if (terbaik) {
      completedPuzzles++;
      _lightLantern(puzzle.id);
      _triggerLanternAnim();
    }
  }

  // ── Tampilkan feedback ────────────────────────────────────
  function _showFeedback(terbaik, puzzle) {
    const feedbackEl = document.getElementById('puzzle-feedback');
    const iconEl     = document.getElementById('feedback-icon');
    const textEl     = document.getElementById('feedback-text');
    const btnNext    = document.getElementById('btn-puzzle-next');

    feedbackEl.hidden = false;

    if (terbaik) {
      iconEl.textContent = '🎉';
      textEl.textContent = puzzle.lampionMsg;
      feedbackEl.style.background = 'rgba(39,174,96,0.3)';
    } else {
      iconEl.textContent = '🌱';
      textEl.textContent = puzzle.refleksiSalah;
      feedbackEl.style.background = 'rgba(243,156,18,0.2)';
    }

    if (btnNext) {
      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newBtn, btnNext);

      const isLast = currentPuzzleIndex >= PUZZLES.length - 1;
      newBtn.textContent = isLast ? 'Selesai ✨' : 'Kalimat Selanjutnya →';
      newBtn.addEventListener('click', () => {
        currentPuzzleIndex++;
        _loadPuzzle(currentPuzzleIndex);
      });
    }
  }

  // ── Animasi lampion ───────────────────────────────────────
  function _lightLantern(puzzleId) {
    const slot = document.querySelector(`.lantern-slot[data-puzzle="${puzzleId}"]`);
    if (slot) {
      slot.classList.add('lit');
      slot.setAttribute('aria-label', `Lampion puzzle ${puzzleId} menyala`);
      slot.style.transform = 'scale(1.4)';
      setTimeout(() => {
        slot.style.transition = 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)';
        slot.style.transform  = 'scale(1)';
      }, 50);
    }
  }

  function _triggerLanternAnim() {
    document.querySelectorAll('.taman-lantern').forEach((l, i) => {
      setTimeout(() => {
        l.style.filter = 'brightness(2)';
        setTimeout(() => { l.style.filter = ''; }, 600);
      }, i * 150);
    });
    document.querySelectorAll('.taman-flower').forEach((f, i) => {
      setTimeout(() => {
        f.style.transform = 'scale(1.3)';
        setTimeout(() => { f.style.transform = ''; }, 400);
      }, i * 100);
    });
  }

  // ── Selesai semua ─────────────────────────────────────────
  function _showComplete() {
    document.getElementById('puzzle-area').hidden   = true;
    document.getElementById('pos3-complete').hidden = false;

    LenteraGame.setPos3Complete();

    const btn = document.getElementById('btn-goto-pos4');
    if (btn) btn.onclick = function() {
      LenteraNav.completePos('pos3');
      LenteraState.navigateTo('pos4', 'Menuju Bilik Cahaya');
    };
    showToast('Semua lampion menyala! ✨', 'success', 3000);
  }

  // ── Utility ───────────────────────────────────────────────
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Public API ────────────────────────────────────────────
  return { init };

})();

window.Pos3TamanUrup = Pos3TamanUrup;
