/* ============================================================
   LENTERA — pos3-taman-urup.js
   Pos 3: Taman Urup — Seret Kalimat Afirmasi ke Drop Zone
   ============================================================

   MEKANISME:
   - 3 kalimat muncul di bank (1 afirmasi terbaik + 2 mengiyakan ejekan).
   - Pemain menyeret/mengklik 1 kalimat ke drop zone.
   - Klik "Cek Kalimat" untuk memvalidasi.
   - Jika benar: lampion menyala, bisa lanjut.
   - Jika salah: refleksi muncul, kalimat kembali ke bank, coba lagi.
   ============================================================ */

'use strict';

const Pos3TamanUrup = (() => {

  // ── Data Puzzle ───────────────────────────────────────────
  const PUZZLES = [
    {
      id      : 1,
      konteks : '💬 Kamu dibilang: "Kamu baper banget sih, lebay deh!"',
      instruksi: 'Seret kalimat yang paling menguatkan dirimu ke kotak di bawah:',
      pilihan : [
        { teks: 'Aku boleh merasa sedih. Perasaanku nyata dan valid.',    terbaik: true  },
        { teks: 'Iya, mungkin aku memang terlalu lebay dan sensitif.',     terbaik: false },
        { teks: 'Benar juga, aku harus berhenti baper dan lebih tegar.',  terbaik: false },
      ],
      lampionMsg  : 'Lampion menyala! Merasa sedih itu manusiawi, bukan kelemahan.',
      refleksiSalah: 'Mengikuti kata-kata itu hanya akan membuatmu makin jauh dari dirimu sendiri. Kamu boleh merasa sedih, itu bukan kelemahan.',
    },
    {
      id      : 2,
      konteks : '💬 Kamu dibilang: "Bagus sih, tapi paling cuma hoki doang."',
      instruksi: 'Seret kalimat yang paling menguatkan dirimu ke kotak di bawah:',
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
      instruksi: 'Seret kalimat yang paling menguatkan dirimu ke kotak di bawah:',
      pilihan : [
        { teks: 'Aku layak diterima dan kehadiranku berarti.',               terbaik: true  },
        { teks: 'Mungkin aku memang terlalu mengganggu, lebih baik minggir.', terbaik: false },
        { teks: 'Iya, kayaknya aku memang sering bikin suasana jadi canggung.', terbaik: false },
      ],
      lampionMsg  : 'Lampion menyala! Kamu berharga dan layak ada di sini.',
      refleksiSalah: 'Kamu tidak perlu membuktikan apa-apa. Kehadiranmu sendiri sudah bernilai.',
    },
  ];

  // ── State ─────────────────────────────────────────────────
  let currentPuzzleIndex = 0;
  let completedPuzzles   = 0;
  let droppedIndex       = null; // index pilihan yang ada di drop zone (null = kosong)

  // Drag state
  let draggedEl    = null;
  let draggedIdx   = null;
  let ghostEl      = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (LenteraGame.state.posCompleted.pos3) {
      LenteraState.navigateTo('pos4');
      return;
    }
    currentPuzzleIndex = 0;
    completedPuzzles   = 0;
    droppedIndex       = null;
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
    if (index >= PUZZLES.length) { _showComplete(); return; }

    const puzzle = PUZZLES[index];
    droppedIndex = null;

    // Counter
    document.getElementById('puzzle-current').textContent = index + 1;
    document.getElementById('puzzle-total').textContent   = PUZZLES.length;

    // Konteks
    const ctx = document.getElementById('puzzle-context');
    if (ctx) {
      ctx.innerHTML = `
        <div style="margin-bottom:6px;font-style:italic;color:rgba(253,250,244,0.65);font-size:13px;">
          ${puzzle.konteks}
        </div>
        <div style="font-size:15px;color:rgba(240,201,58,0.8);font-weight:600;">
          ${puzzle.instruksi}
        </div>`;
    }

    // Reset drop zone
    const dropZone    = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    dropZone.hidden   = false;
    dropZone.style.display = '';
    dropZone.innerHTML = '';
    dropZone.appendChild(placeholder);
    placeholder.hidden = false;

    // Reset feedback
    const feedback = document.getElementById('puzzle-feedback');
    if (feedback) feedback.hidden = true;

    // Tombol cek & reset
    const controls = document.querySelector('.puzzle-controls');
    if (controls) controls.hidden = false;
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = true;

    _renderBank(puzzle);
    _bindDropZone(puzzle);
    _bindControls(puzzle);
  }

  // ── Render bank kalimat ───────────────────────────────────
  function _renderBank(puzzle) {
    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';
    bank.style.flexDirection = 'column';

    const indices = [...puzzle.pilihan.keys()];
    _shuffle(indices);

    indices.forEach((i, order) => {
      const block = _createBlock(i, puzzle.pilihan[i].teks);
      block.style.animationDelay = `${order * 80}ms`;
      bank.appendChild(block);
    });
  }

  // ── Buat elemen kalimat block ─────────────────────────────
  function _createBlock(idx, teks) {
    const block = document.createElement('div');
    block.className = 'word-block kalimat-block';
    block.dataset.idx = String(idx);
    block.setAttribute('draggable', 'true');
    block.setAttribute('role', 'button');
    block.setAttribute('tabindex', '0');
    block.setAttribute('aria-label', `Kalimat: ${teks}`);
    block.textContent = teks;
    block.style.fontSize = '13px'; // sesuai ukuran normal

    // Mouse drag
    block.addEventListener('dragstart', _onDragStart);
    block.addEventListener('dragend',   _onDragEnd);

    // Touch
    block.addEventListener('touchstart', _onTouchStart, { passive: false });
    block.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    block.addEventListener('touchend',   _onTouchEnd);

    // Klik langsung (alternatif seret)
    block.addEventListener('click', () => {
      const fromBank = !!document.querySelector(`#word-bank [data-idx="${idx}"]`);
      if (fromBank) _moveToZone(idx);
      else          _moveToBank(idx);
    });

    // Keyboard
    block.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const fromBank = !!document.querySelector(`#word-bank [data-idx="${idx}"]`);
        if (fromBank) _moveToZone(idx);
        else          _moveToBank(idx);
      }
    });

    return block;
  }

  // ── Drop zone binding ─────────────────────────────────────
  function _bindDropZone(puzzle) {
    const dz = document.getElementById('drop-zone');
    // Ganti node agar listener lama tidak menumpuk
    const fresh = dz.cloneNode(false);
    while (dz.firstChild) fresh.appendChild(dz.firstChild);
    dz.parentNode.replaceChild(fresh, dz);

    fresh.addEventListener('dragover',  e => { e.preventDefault(); fresh.classList.add('drag-over'); });
    fresh.addEventListener('dragleave', () => fresh.classList.remove('drag-over'));
    fresh.addEventListener('drop',      e => {
      e.preventDefault();
      fresh.classList.remove('drag-over');
      if (draggedEl && draggedIdx !== null) _moveToZone(draggedIdx);
    });
  }

  // ── Controls binding ──────────────────────────────────────
  function _bindControls(puzzle) {
    const btnReset = document.getElementById('btn-puzzle-reset');
    if (btnReset) {
      const nb = btnReset.cloneNode(true);
      btnReset.parentNode.replaceChild(nb, btnReset);
      nb.addEventListener('click', () => { droppedIndex = null; _loadPuzzle(currentPuzzleIndex); });
    }

    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) {
      const nb = btnCheck.cloneNode(true);
      btnCheck.parentNode.replaceChild(nb, btnCheck);
      nb.disabled = true;
      nb.addEventListener('click', () => _cekJawaban(puzzle));
    }
  }

  // ── Pindah ke drop zone ───────────────────────────────────
  function _moveToZone(idx) {
    // Kalau sudah ada kalimat di zone, kembalikan dulu ke bank
    if (droppedIndex !== null && droppedIndex !== idx) {
      _moveToBank(droppedIndex);
    }
    if (droppedIndex === idx) return;

    droppedIndex = idx;

    // Hapus dari bank
    document.querySelector(`#word-bank [data-idx="${idx}"]`)?.remove();

    // Taruh di drop zone
    const puzzle = PUZZLES[currentPuzzleIndex];
    const block  = _createBlock(idx, puzzle.pilihan[idx].teks);
    block.classList.add('dropped');

    const dropZone    = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    if (placeholder) placeholder.hidden = true;
    dropZone.appendChild(block);

    // Aktifkan tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = false;
  }

  // ── Kembalikan ke bank ────────────────────────────────────
  function _moveToBank(idx) {
    if (droppedIndex === idx) droppedIndex = null;

    document.querySelector(`#drop-zone [data-idx="${idx}"]`)?.remove();

    const dropZone    = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    if (!document.querySelector('#drop-zone .kalimat-block') && placeholder) {
      placeholder.hidden = false;
    }

    const puzzle = PUZZLES[currentPuzzleIndex];
    const block  = _createBlock(idx, puzzle.pilihan[idx].teks);
    document.getElementById('word-bank').appendChild(block);

    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = droppedIndex === null;
  }

  // ── Cek jawaban ───────────────────────────────────────────
  function _cekJawaban(puzzle) {
    if (droppedIndex === null) return;
    const terbaik = puzzle.pilihan[droppedIndex].terbaik === true;
    _showFeedback(terbaik, puzzle);
    if (terbaik) {
      completedPuzzles++;
      _lightLantern(puzzle.id);
      _triggerLanternAnim();
    }
  }

  // ── Feedback ──────────────────────────────────────────────
  function _showFeedback(terbaik, puzzle) {
    const feedbackEl = document.getElementById('puzzle-feedback');
    const iconEl     = document.getElementById('feedback-icon');
    const textEl     = document.getElementById('feedback-text');
    const btnNext    = document.getElementById('btn-puzzle-next');

    feedbackEl.hidden = false;

    // Kunci semua block saat feedback tampil
    document.querySelectorAll('.kalimat-block').forEach(b => b.setAttribute('draggable', 'false'));
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = true;
    const btnReset = document.getElementById('btn-puzzle-reset');
    if (btnReset) btnReset.disabled = terbaik; // reset tetap aktif kalau salah

    if (terbaik) {
      iconEl.textContent = '🎉';
      textEl.textContent = puzzle.lampionMsg;
      feedbackEl.style.background = 'rgba(39,174,96,0.3)';

      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newBtn, btnNext);
      const isLast = currentPuzzleIndex >= PUZZLES.length - 1;
      newBtn.textContent = isLast ? 'Selesai ✨' : 'Kalimat Selanjutnya →';
      newBtn.hidden = false;
      newBtn.addEventListener('click', () => {
        currentPuzzleIndex++;
        _loadPuzzle(currentPuzzleIndex);
      });
    } else {
      iconEl.textContent = '🌱';
      textEl.textContent = puzzle.refleksiSalah;
      feedbackEl.style.background = 'rgba(243,156,18,0.2)';

      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newBtn, btnNext);
      newBtn.textContent = 'Coba Lagi →';
      newBtn.hidden = false;
      newBtn.addEventListener('click', () => {
        droppedIndex = null;
        _loadPuzzle(currentPuzzleIndex);
      });
    }
  }

  // ── Mouse drag events ─────────────────────────────────────
  function _onDragStart(e) {
    draggedEl  = e.currentTarget;
    draggedIdx = parseInt(draggedEl.dataset.idx, 10);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => draggedEl?.classList.add('dragging'), 0);
  }

  function _onDragEnd() {
    draggedEl?.classList.remove('dragging');
    draggedEl  = null;
    draggedIdx = null;
    document.getElementById('drop-zone')?.classList.remove('drag-over');
  }

  // ── Touch events ──────────────────────────────────────────
  function _onTouchStart(e) {
    const touch = e.touches[0];
    draggedEl  = e.currentTarget;
    draggedIdx = parseInt(draggedEl.dataset.idx, 10);

    ghostEl = draggedEl.cloneNode(true);
    ghostEl.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;opacity:0.85;
      transform:scale(1.03);width:${draggedEl.offsetWidth}px;
      left:${touch.clientX - draggedEl.offsetWidth / 2}px;
      top:${touch.clientY - 24}px;
    `;
    document.body.appendChild(ghostEl);
    draggedEl.classList.add('dragging');
  }

  function _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (ghostEl) {
      ghostEl.style.left = `${touch.clientX - parseInt(ghostEl.style.width) / 2}px`;
      ghostEl.style.top  = `${touch.clientY - 24}px`;
    }
    const dz   = document.getElementById('drop-zone');
    if (dz) {
      const r    = dz.getBoundingClientRect();
      const over = touch.clientX >= r.left && touch.clientX <= r.right &&
                   touch.clientY >= r.top  && touch.clientY <= r.bottom;
      dz.classList.toggle('drag-over', over);
    }
  }

  function _onTouchEnd(e) {
    const touch = e.changedTouches[0];
    ghostEl?.remove(); ghostEl = null;
    draggedEl?.classList.remove('dragging');
    document.getElementById('drop-zone')?.classList.remove('drag-over');

    const dz = document.getElementById('drop-zone');
    if (dz && draggedEl && draggedIdx !== null) {
      const r    = dz.getBoundingClientRect();
      const over = touch.clientX >= r.left && touch.clientX <= r.right &&
                   touch.clientY >= r.top  && touch.clientY <= r.bottom;
      if (over) _moveToZone(draggedIdx);
    }
    draggedEl  = null;
    draggedIdx = null;
  }

  // ── Lampion ───────────────────────────────────────────────
  function _lightLantern(puzzleId) {
    const slot = document.querySelector(`.lantern-slot[data-puzzle="${puzzleId}"]`);
    if (slot) {
      slot.classList.add('lit');
      slot.style.transform = 'scale(1.4)';
      setTimeout(() => {
        slot.style.transition = 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)';
        slot.style.transform  = 'scale(1)';
      }, 50);
    }
  }

  function _triggerLanternAnim() {
    document.querySelectorAll('.taman-lantern').forEach((l, i) => {
      setTimeout(() => { l.style.filter = 'brightness(2)'; setTimeout(() => { l.style.filter = ''; }, 600); }, i * 150);
    });
    document.querySelectorAll('.taman-flower').forEach((f, i) => {
      setTimeout(() => { f.style.transform = 'scale(1.3)'; setTimeout(() => { f.style.transform = ''; }, 400); }, i * 100);
    });
  }

  // ── Selesai ───────────────────────────────────────────────
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

  return { init };

})();

window.Pos3TamanUrup = Pos3TamanUrup;
