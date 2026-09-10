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

  // ── Data Puzzle ───────────────────────────────────────────
  const PUZZLES = [
    {
      id      : 1,
      konteks : '💬 "Eh, kamu kan gampang baper sih. Sensitif banget deh."',
      kata    : ['Perasaanku', 'Valid', 'Dan', 'Berhak', 'Dihargai', 'Lemah', 'Lebay'],
      correct : [0, 1, 2, 3, 4], // Perasaanku Valid Dan Berhak Dihargai
      afirmasi: 'Perasaanku Valid Dan Berhak Dihargai',
      lampionMsg: '🏮 Lampion menyala! Perasaanmu nyata dan valid.',
    },
    {
      id      : 2,
      konteks : '💬 "Tumben bagus, paling cuma hoki doang. Jangan gede rasa deh."',
      kata    : ['Kerja', 'Kerasku', 'Nyata', 'Dan', 'Layak', 'Dirayakan', 'Kebetulan'],
      correct : [0, 1, 2, 3, 4, 5], // Kerja Kerasku Nyata Dan Layak Dirayakan
      afirmasi: 'Kerja Kerasku Nyata Dan Layak Dirayakan',
      lampionMsg: '🏮 Lampion menyala! Setiap usahamu bernilai.',
    },
    {
      id      : 3,
      konteks : '💬 "Kamu ga usah ikut, ntar ngerusak suasana. Joke doang!"',
      kata    : ['Aku', 'Berharga', 'Dan', 'Layak', 'Diterima', 'Apa Adanya', 'Dikucilkan'],
      correct : [0, 1, 2, 3, 4, 5], // Aku Berharga Dan Layak Diterima Apa Adanya
      afirmasi: 'Aku Berharga Dan Layak Diterima Apa Adanya',
      lampionMsg: '🏮 Lampion menyala! Kamu berharga persis seperti apa adanya.',
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
    console.info('[Pos3] Inisialisasi Taman Urup');

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
    btn?.addEventListener('click', () => {
      document.getElementById('pos3-intro').hidden = true;
      document.getElementById('puzzle-area').hidden = false;
      _loadPuzzle(currentPuzzleIndex);
    });
  }

  // ── Muat puzzle ───────────────────────────────────────────
  function _loadPuzzle(index) {
    if (index >= PUZZLES.length) {
      _showComplete();
      return;
    }

    const puzzle = PUZZLES[index];
    droppedWords = [];

    // Update header
    document.getElementById('puzzle-current').textContent = index + 1;
    document.getElementById('puzzle-total').textContent   = PUZZLES.length;
    document.getElementById('puzzle-context').textContent = puzzle.konteks;

    // Reset drop zone
    const dropZone    = document.getElementById('drop-zone');
    const placeholder = document.getElementById('drop-placeholder');
    dropZone.innerHTML = '';
    dropZone.appendChild(placeholder);
    placeholder.hidden = false;

    // Sembunyikan feedback
    const feedback = document.getElementById('puzzle-feedback');
    feedback.hidden = true;

    // Disable tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = true;

    // Render word bank (dikocok, kecuali kata yang benar agar tidak trivial)
    _renderWordBank(puzzle);

    // Bind tombol
    _bindPuzzleButtons(puzzle);

    // Bind drop zone
    _bindDropZone();
  }

  // ── Render Word Bank ──────────────────────────────────────
  function _renderWordBank(puzzle) {
    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';

    // Acak urutan kata
    const indices = [...Array(puzzle.kata.length).keys()];
    _shuffle(indices);

    indices.forEach((wordIndex, displayOrder) => {
      const kata  = puzzle.kata[wordIndex];
      const block = _createWordBlock(wordIndex, kata, 'bank');
      block.style.animationDelay = `${displayOrder * 60}ms`;
      bank.appendChild(block);
    });
  }

  // ── Buat elemen word block ────────────────────────────────
  function _createWordBlock(wordIndex, kata, source) {
    const block = document.createElement('div');
    block.className  = `word-block${source === 'zone' ? ' dropped' : ''}`;
    block.textContent = kata;
    block.dataset.wordIndex = wordIndex;
    block.dataset.source    = source;
    block.setAttribute('draggable', 'true');
    block.setAttribute('role', 'button');
    block.setAttribute('tabindex', '0');
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

    // Update tombol cek
    const btnCheck = document.getElementById('btn-puzzle-check');
    if (btnCheck) btnCheck.disabled = droppedWords.length === 0;
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
    const feedbackEl   = document.getElementById('puzzle-feedback');
    const iconEl       = document.getElementById('feedback-icon');
    const textEl       = document.getElementById('feedback-text');
    const btnNext      = document.getElementById('btn-puzzle-next');

    feedbackEl.hidden = false;

    if (isCorrect) {
      iconEl.textContent = '🎉';
      textEl.textContent = puzzle.lampionMsg;
      feedbackEl.style.background = 'rgba(39,174,96,0.3)';
      completedPuzzles++;

      // Nyalakan lampion
      _lightLantern(puzzle.id);

      // Animasi lampion scene
      _triggerLanternAnim();

    } else {
      iconEl.textContent = '🌱';

      const hasDecoy = PUZZLES[currentPuzzleIndex].kata
        .map((_, i) => i)
        .filter(i => !new Set(puzzle.correct).has(i))
        .some(i => droppedWords.includes(i));

      if (hasDecoy) {
        textEl.textContent = 'Ada kata yang tidak cocok di sana. Coba perhatikan lagi kata-katanya — mana yang paling memberimu kekuatan?';
      } else {
        textEl.textContent = 'Hampir! Coba susun urutannya lagi. Kalimat ini punya ritme tersendiri ✨';
      }
      feedbackEl.style.background = 'rgba(243,156,18,0.2)';
    }

    // Bind tombol next di dalam feedback
    if (btnNext) {
      const newBtn = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newBtn, btnNext);

      if (isCorrect) {
        const isLast = currentPuzzleIndex >= PUZZLES.length - 1;
        newBtn.textContent = isLast ? 'Lihat Hasil ✨' : 'Puzzle Berikutnya →';
        newBtn.addEventListener('click', () => {
          currentPuzzleIndex++;
          _loadPuzzle(currentPuzzleIndex);
        });
      } else {
        newBtn.textContent = 'Coba Lagi ↺';
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
    btn?.addEventListener('click', () => {
      LenteraNav.completePos('pos3');
      LenteraState.navigateTo('pos4', 'Menuju Bilik Lentera… 📖');
    });

    showToast('🏮 Semua lampion menyala! Taman Urup bercahaya.', 'success', 3000);
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
console.info('[LENTERA] pos3-taman-urup.js dimuat ✓');
