/* ============================================================
   LENTERA — pos3-taman-urup.js
   Pos 3: Taman Urup — Mini-Game Puzzle Kata Drag & Drop
   ============================================================

   MEKANISME:
   - Setiap puzzle: blok kata di "Word Bank" harus diseret ke "Drop Zone"
     untuk membentuk kalimat afirmasi yang benar.
   - Pemain bisa seret balik dari drop zone ke word bank.
   - "Cek Kalimat" memvalidasi susunan.
   - Lampion menyala saat puzzle berhasil.
   - Mendukung mouse (drag/drop) dan touch (touchstart/touchmove/touchend).

   DATA PUZZLE:
   3 puzzle, dicontoh dari konteks skenario Pos 2.
   correct[] = urutan index kata yang benar dari wordBank[].
   ============================================================ */

'use strict';

const Pos3TamanUrup = (() => {

  // ── Data Puzzle — DIPERMUDAH ─────────────────────────────
  // Setiap puzzle: hanya 5-6 kata total, 1-2 kata pengecoh (decoy)
  // Kata afirmasi disusun pendek agar urutan mudah dipahami
  // Petunjuk arah diberikan lewat konteks yang jelas
  const PUZZLES = [
    {
      id      : 1,
      konteks : '💬 Kamu dibilang: "Kamu baper banget sih, lebay deh!"',
      hint    : 'Susun kata berikut jadi kalimat yang menguatkan dirimu:',
      // Jawaban: AKU BOLEH MERASA SEDIH
      kata    : ['AKU', 'BOLEH', 'MERASA', 'SEDIH', 'LEBAY', 'BAPER'],
      correct : [0, 1, 2, 3],
      afirmasi: 'AKU BOLEH MERASA SEDIH',
      lampionMsg: 'Lampion menyala! Merasa sedih itu manusiawi, bukan kelemahan.',
    },
    {
      id      : 2,
      konteks : '💬 Kamu dibilang: "Bagus sih, tapi paling cuma hoki doang."',
      hint    : 'Susun kata berikut jadi kalimat yang menguatkan dirimu:',
      // Jawaban: USAHAKU NYATA DAN BERHARGA
      kata    : ['USAHAKU', 'NYATA', 'DAN', 'BERHARGA', 'HOKI', 'KEBETULAN'],
      correct : [0, 1, 2, 3],
      afirmasi: 'USAHAKU NYATA DAN BERHARGA',
      lampionMsg: 'Lampion menyala! Kerja kerasmu bukan kebetulan.',
    },
    {
      id      : 3,
      konteks : '💬 Kamu dibilang: "Kamu ga usah ikut, ntar ngerusak suasana."',
      hint    : 'Susun kata berikut jadi kalimat yang menguatkan dirimu:',
      // Jawaban: AKU LAYAK DITERIMA
      kata    : ['AKU', 'LAYAK', 'DITERIMA', 'GANGGU', 'NGERUSAK'],
      correct : [0, 1, 2],
      afirmasi: 'AKU LAYAK DITERIMA',
      lampionMsg: 'Lampion menyala! Kamu berharga dan layak ada di sini.',
    },
  ];

  // ── State internal ────────────────────────────────────────
  let currentPuzzleIndex  = 0;
  let droppedWords        = [];  // array index kata yang sudah di drop zone
  let completedPuzzles    = 0;

  // Drag state
  let draggedBlock    = null;
  let dragSource      = null; // 'bank' | 'zone'
  let touchStartX     = 0;
  let touchStartY     = 0;
  let ghostEl         = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (LenteraGame.state.posCompleted.pos3) {
      LenteraState.navigateTo('pos4');
      return;
    }

    currentPuzzleIndex = 0;
    droppedWords       = [];
    completedPuzzles   = 0;

    _bindIntro();
  }

  function _bindIntro() {
    const btn = document.getElementById('btn-pos3-mulai');
    if (btn) btn.onclick = function() {
      document.getElementById('pos3-intro').hidden = true;
      document.getElementById('puzzle-area').hidden = false;
      _loadPuzzle(currentPuzzleIndex);
    };
  }

  // ── Muat puzzle ───────────────────────────────────────────
  function _loadPuzzle(index) {
    if (index >= PUZZLES.length) {
      _showComplete();
      return;
    }

    const puzzle = PUZZLES[index];
    droppedWords = [];

    document.getElementById('puzzle-current').textContent = index + 1;
    document.getElementById('puzzle-total').textContent   = PUZZLES.length;

    // Tampilkan konteks + hint
    const ctx = document.getElementById('puzzle-context');
    if (ctx) {
      ctx.innerHTML = `
        <div style="margin-bottom:6px;font-style:italic;color:rgba(253,250,244,0.65);font-size:13px;">
          ${puzzle.konteks}
        </div>
        <div style="font-size:12px;color:rgba(240,201,58,0.8);font-weight:600;">
          ${puzzle.hint || 'Susun kata berikut menjadi kalimat yang menguatkan:'}
        </div>`;
    }

    const dropZone    = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    dropZone.innerHTML = '';
    dropZone.appendChild(placeholder);
    placeholder.hidden = false;

    const feedback = document.getElementById('puzzle-feedback');
    feedback.hidden = true;

    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = true;

    _renderWordBank(puzzle);
    _bindPuzzleButtons(puzzle);
    _bindDropZone();
  }

  // ── Render Word Bank ──────────────────────────────────────
  function _renderWordBank(puzzle) {
    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';

    // Label panduan
    const label = document.createElement('div');
    label.style.cssText = 'width:100%;font-size:11px;color:rgba(253,250,244,0.45);margin-bottom:6px;text-align:center;';
    label.textContent = 'Klik atau seret kata ke kotak di atas';
    bank.appendChild(label);

    // Acak urutan
    const indices = [...Array(puzzle.kata.length).keys()];
    _shuffle(indices);

    const correctSet = new Set(puzzle.correct);

    indices.forEach((wordIndex, displayOrder) => {
      const kata  = puzzle.kata[wordIndex];
      const block = _createWordBlock(wordIndex, kata, 'bank');
      block.style.animationDelay = `${displayOrder * 60}ms`;

      // Decoy: warna lebih redup agar pemain tahu ini mungkin pengecoh
      if (!correctSet.has(wordIndex)) {
        block.style.opacity     = '0.6';
        block.style.borderStyle = 'dashed';
        block.title             = 'Kata pengecoh — mungkin tidak dipakai';
      }

      bank.appendChild(block);
    });
  }

  // ── Buat elemen word block ────────────────────────────────
  function _createWordBlock(wordIndex, kata, source) {
    const block = document.createElement('div');
    block.className  = `word-block${source === 'zone' ? ' dropped' : ''}`;
    block.dataset.wordIndex = wordIndex;
    block.dataset.source    = source;
    block.setAttribute('draggable', 'true');
    block.setAttribute('role', 'button');
    block.setAttribute('tabindex', '0');

    // Jika di zone, tampilkan nomor urut posisi
    if (source === 'zone') {
      const pos = droppedWords.length; // posisi ke-berapa (0-indexed)
      block.innerHTML = `<span class="word-num">${pos + 1}</span><span class="word-text">${kata}</span>`;
    } else {
      block.textContent = kata;
    }

    block.setAttribute('aria-label', `Kata: ${kata}. Tekan Enter untuk memindahkan.`);

    // Mouse drag events
    block.addEventListener('dragstart', _onDragStart);
    block.addEventListener('dragend',   _onDragEnd);

    // Touch events
    block.addEventListener('touchstart', _onTouchStart, { passive: false });
    block.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    block.addEventListener('touchend',   _onTouchEnd);

    // Keyboard accessibility
    block.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _keyboardMoveBlock(block, source, wordIndex);
      }
    });

    return block;
  }

  // ── Bind Drop Zone ────────────────────────────────────────
  function _bindDropZone() {
    const dropZone = document.getElementById('drop-zone');

    // Hapus listener lama
    const fresh = dropZone.cloneNode(false);
    // Pindahkan children ke fresh
    while (dropZone.firstChild) fresh.appendChild(dropZone.firstChild);
    dropZone.parentNode.replaceChild(fresh, dropZone);

    // Tambahkan placeholder kembali jika perlu
    if (!document.getElementById('drop-placeholder')) {
      const ph = document.createElement('p');
      ph.className = 'drop-placeholder';
      ph.id = 'drop-placeholder';
      ph.textContent = 'Seret kata-kata di bawah ke sini untuk membentuk kalimat afirmasi ↓';
      fresh.appendChild(ph);
    }

    fresh.addEventListener('dragover',  _onDragOver);
    fresh.addEventListener('drop',      _onDrop);
    fresh.addEventListener('dragleave', _onDragLeave);
  }

  // ── Bind Tombol Puzzle ────────────────────────────────────
  function _bindPuzzleButtons(puzzle) {
    // Tombol reset
    const btnReset = document.getElementById('btn-puzzle-reset');
    if (btnReset) {
      const newReset = btnReset.cloneNode(true);
      btnReset.parentNode.replaceChild(newReset, btnReset);
      newReset.addEventListener('click', () => {
        droppedWords = [];
        _loadPuzzle(currentPuzzleIndex);
      });
    }

    // Tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) {
      const newCheck = btnCheck.cloneNode(true);
      btnCheck.parentNode.replaceChild(newCheck, btnCheck);
      newCheck.addEventListener('click', () => _checkAnswer(puzzle));
    }
  }

  // ── Mouse Drag Events ─────────────────────────────────────
  function _onDragStart(e) {
    draggedBlock = e.currentTarget;
    dragSource   = draggedBlock.dataset.source;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedBlock.dataset.wordIndex);
    setTimeout(() => draggedBlock.classList.add('dragging'), 0);
  }

  function _onDragEnd(e) {
    if (draggedBlock) draggedBlock.classList.remove('dragging');
    draggedBlock = null;
    dragSource   = null;
    document.getElementById('drop-zone')?.classList.remove('drag-over');
  }

  function _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  function _onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function _onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!draggedBlock) return;

    const wordIndex = parseInt(draggedBlock.dataset.wordIndex, 10);

    if (dragSource === 'bank') {
      _moveToDropZone(wordIndex);
    }
    // Jika dari zone ke zone, sudah di zone — tidak perlu aksi
  }

  // ── Touch Events (mobile) ─────────────────────────────────
  function _onTouchStart(e) {
    const touch   = e.touches[0];
    touchStartX   = touch.clientX;
    touchStartY   = touch.clientY;
    draggedBlock  = e.currentTarget;
    dragSource    = draggedBlock.dataset.source;

    // Buat ghost element
    ghostEl = draggedBlock.cloneNode(true);
    ghostEl.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      opacity:0.8; transform:scale(1.05);
      left:${touch.clientX - 30}px; top:${touch.clientY - 20}px;
    `;
    document.body.appendChild(ghostEl);
    draggedBlock.classList.add('dragging');
  }

  function _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (ghostEl) {
      ghostEl.style.left = `${touch.clientX - 30}px`;
      ghostEl.style.top  = `${touch.clientY - 20}px`;
    }

    // Highlight drop zone jika di atasnya
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      const rect = dropZone.getBoundingClientRect();
      const over = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                   touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
      dropZone.classList.toggle('drag-over', over);
    }
  }

  function _onTouchEnd(e) {
    const touch   = e.changedTouches[0];
    const dropZone = document.getElementById('drop-zone');

    // Bersihkan ghost
    ghostEl?.remove();
    ghostEl = null;
    draggedBlock?.classList.remove('dragging');

    // Cek apakah di atas drop zone
    if (dropZone) {
      const rect = dropZone.getBoundingClientRect();
      const over = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                   touch.clientY >= rect.top  && touch.clientY <= rect.bottom;

      if (over && draggedBlock && dragSource === 'bank') {
        _moveToDropZone(parseInt(draggedBlock.dataset.wordIndex, 10));
      }
      dropZone.classList.remove('drag-over');
    }

    draggedBlock = null;
    dragSource   = null;
  }

  // ── Keyboard movement ─────────────────────────────────────
  function _keyboardMoveBlock(block, source, wordIndex) {
    if (source === 'bank') {
      _moveToDropZone(wordIndex);
    } else if (source === 'zone') {
      _moveToBank(wordIndex);
    }
  }

  // ── Pindahkan kata ke Drop Zone ────────────────────────────
  function _moveToDropZone(wordIndex) {
    if (droppedWords.includes(wordIndex)) return;

    droppedWords.push(wordIndex);

    // Hapus dari bank
    const bankBlock = document.querySelector(
      `#word-bank [data-word-index="${wordIndex}"]`
    );
    bankBlock?.remove();

    // Tambahkan ke drop zone
    const puzzle    = PUZZLES[currentPuzzleIndex];
    const kata      = puzzle.kata[wordIndex];
    const dropZone  = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    if (placeholder) placeholder.hidden = true;

    const block = _createWordBlock(wordIndex, kata, 'zone');
    dropZone.appendChild(block);

    // Click pada kata di zone = kembalikan ke bank
    block.addEventListener('click', () => _moveToBank(wordIndex));

    // Refresh nomor urut semua blok di zone
    _refreshZoneNumbers();

    // Update tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = droppedWords.length === 0;
  }

  // ── Pindahkan kata kembali ke Bank ────────────────────────
  function _moveToBank(wordIndex) {
    droppedWords = droppedWords.filter(i => i !== wordIndex);

    // Hapus dari zone
    const zoneBlock = document.querySelector(
      `#drop-zone [data-word-index="${wordIndex}"]`
    );
    zoneBlock?.remove();

    // Jika drop zone kosong, tampilkan placeholder lagi
    const dropZone = document.getElementById('drop-zone');
    if (droppedWords.length === 0) {
      const placeholder = document.getElementById('drop-placeholder');
      if (placeholder) placeholder.hidden = false;
    }

    // Kembalikan ke bank
    const puzzle = PUZZLES[currentPuzzleIndex];
    const kata   = puzzle.kata[wordIndex];
    const bank   = document.getElementById('word-bank');
    const block  = _createWordBlock(wordIndex, kata, 'bank');
    bank.appendChild(block);

    // Refresh nomor urut di zone setelah removal
    _refreshZoneNumbers();

    // Update tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = droppedWords.length === 0;
  }

  // ── Refresh nomor urut blok di drop zone ─────────────────
  function _refreshZoneNumbers() {
    const blocks = document.querySelectorAll('#drop-zone .word-block');
    blocks.forEach((b, i) => {
      const numEl = b.querySelector('.word-num');
      if (numEl) numEl.textContent = i + 1;
    });
  }

  // ── Cek Jawaban ───────────────────────────────────────────
  function _checkAnswer(puzzle) {
    if (droppedWords.length === 0) return;

    // Bandingkan susunan dengan jawaban benar
    // Cek hanya kata yang benar (correct[]) harus ada dan berurutan di dropZone
    // Kata pengganggu (decoy) tidak boleh ada di zona
    const correctSet    = new Set(puzzle.correct);
    const decoyIndices  = puzzle.kata
      .map((_, i) => i)
      .filter(i => !correctSet.has(i));

    const hasDecoy   = droppedWords.some(i => decoyIndices.includes(i));
    const hasAll     = puzzle.correct.every(i => droppedWords.includes(i));
    const orderMatch = _checkOrder(puzzle.correct, droppedWords.filter(i => correctSet.has(i)));

    const isCorrect  = hasAll && !hasDecoy && orderMatch;
    _showPuzzleFeedback(isCorrect, puzzle);
  }

  function _checkOrder(correct, subset) {
    // subset harus sama persis dengan correct (order dipertahankan)
    if (subset.length !== correct.length) return false;
    return correct.every((v, i) => v === subset[i]);
  }

  // ── Tampilkan Feedback Puzzle ─────────────────────────────
  function _showPuzzleFeedback(isCorrect, puzzle) {
    const feedbackEl = document.getElementById('puzzle-feedback');
    const iconEl     = document.getElementById('feedback-icon');
    const textEl     = document.getElementById('feedback-text');
    const btnNext    = document.getElementById('btn-puzzle-next');

    feedbackEl.hidden = false;

    if (isCorrect) {
      iconEl.textContent = '🎉';
      textEl.textContent = puzzle.lampionMsg;
      feedbackEl.style.background = 'rgba(39,174,96,0.3)';
      completedPuzzles++;
      _lightLantern(puzzle.id);
      _triggerLanternAnim();
    } else {
      iconEl.textContent = '🌱';
      const hasDecoy = PUZZLES[currentPuzzleIndex].kata
        .map((_, i) => i)
        .filter(i => !new Set(puzzle.correct).has(i))
        .some(i => droppedWords.includes(i));

      if (hasDecoy) {
        textEl.textContent = 'Ada kata pengecoh yang masuk. Coba hapus kata yang bergaris putus-putus.';
      } else {
        textEl.textContent = 'Urutannya belum pas. Coba susun ulang dari kata pertama.';
      }
      feedbackEl.style.background = 'rgba(243,156,18,0.2)';
    }

    if (btnNext) {
      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newBtn, btnNext);

      if (isCorrect) {
        const isLast = currentPuzzleIndex >= PUZZLES.length - 1;
        newBtn.textContent = isLast ? 'Selesai' : 'Puzzle Selanjutnya';
        newBtn.addEventListener('click', () => {
          currentPuzzleIndex++;
          _loadPuzzle(currentPuzzleIndex);
        });
      } else {
        newBtn.textContent = 'Coba Lagi';
        newBtn.addEventListener('click', () => {
          feedbackEl.hidden = true;
          droppedWords = [];
          _loadPuzzle(currentPuzzleIndex);
        });
      }
    }
  }

  // ── Animasi lampion menyala ───────────────────────────────
  function _lightLantern(puzzleId) {
    const slot = document.querySelector(`.lantern-slot[data-puzzle="${puzzleId}"]`);
    if (slot) {
      slot.classList.add('lit');
      slot.setAttribute('aria-label', `Lampion puzzle ${puzzleId} menyala`);

      // Animasi glow burst
      slot.style.transform = 'scale(1.4)';
      setTimeout(() => {
        slot.style.transition = 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)';
        slot.style.transform  = 'scale(1)';
      }, 50);
    }
  }

  function _triggerLanternAnim() {
    const tamLanterns = document.querySelectorAll('.taman-lantern');
    tamLanterns.forEach((l, i) => {
      setTimeout(() => {
        l.style.filter = 'brightness(2)';
        setTimeout(() => { l.style.filter = ''; }, 600);
      }, i * 150);
    });

    // Munculkan bunga
    const flowers = document.querySelectorAll('.taman-flower');
    flowers.forEach((f, i) => {
      setTimeout(() => {
        f.style.transform = 'scale(1.3)';
        setTimeout(() => { f.style.transform = ''; }, 400);
      }, i * 100);
    });
  }

  // ── Tampilkan selesai ─────────────────────────────────────
  function _showComplete() {
    document.getElementById('puzzle-area').hidden     = true;
    document.getElementById('pos3-complete').hidden   = false;

    LenteraGame.setPos3Complete();

    const btn = document.getElementById('btn-goto-pos4');
    if (btn) btn.onclick = function() {
      LenteraNav.completePos('pos3');
      LenteraState.navigateTo('pos4', 'Menuju Bilik Cahaya');
    };
    showToast('Semua lampion menyala!', 'success', 3000);
  }

  // ── Utility ──────────────────────────────────────────────
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
