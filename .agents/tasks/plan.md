# Implementation Plan — 4-Category LATHI Card System

## Codebase Findings

**State shape:** `state.skor.pos2Responses` is an array of `{ skenario, pilihan, tipe, skor }` objects
pushed by `LatheraGame.recordPos2Response()`. The `tipe` field is one of:
`'asertif'`, `'reaktif'`, `'pasif'`, `'internalisasi'`, `'menarikdiri'`.
Three skenario max → 3 responses max. `state.laporan.submitted` is a boolean.

**Current card logic in hasil.js:** Two types only — `'ksatria'` (resiliensi ≥ 7 AND isolasi ≤ 1) or
`'daun'` (everything else). The `TIPE_DATA` object holds all card content.
`_kalkulasi()` sets `state.hasil.tipe`. `_renderKartu()` consumes `TIPE_DATA[tipe]`.
The konseling button shows when `state.hasil.tipe === 'daun' || state.laporan.submitted`.

**Dashboard admin.html:** `_tipeMental(skor)` returns `'ksatria'` or `'daun'` based on resiliensi/isolasi only —
it does NOT read `pos2Responses`. All badge renderers inline-render `'⚔️ Ksatria'` vs `'🍃 Daun'` strings.
The sesi filter dropdown has `<option value="ksatria">` and `<option value="daun">`.
`renderKonseling()` filters `s.tipe === 'daun' && s.laporan`.
`updateBadges()` counts `s.tipe === 'daun' && s.laporan` for konseling badge.

**CSS:** Two card header classes exist: `.kartu-header--ksatria` and `.kartu-header--daun`.
New classes for all 4 categories must be added.

---

## Implementation Plan

- [ ] 1. Add 4 new CSS header classes for result cards in `styles/game.css`.

  Add four new `.kartu-header--*` rules after the existing `.kartu-header--daun` block
  (around line 1302 in game.css). Each rule sets `background` and `color`:

  ```css
  .kartu-header--daun-terduduk {
    background: linear-gradient(135deg, #5C3D1E, #8B5A2B);
    color: rgba(253,250,244,0.92);
  }
  .kartu-header--duri-perisai {
    background: linear-gradient(135deg, #4A1A0A, #8B2500);
    color: rgba(253,250,244,0.92);
  }
  .kartu-header--bambu-lentur {
    background: linear-gradient(135deg, #0A3D1A, #1A6B30);
    color: rgba(253,250,244,0.92);
  }
  .kartu-header--air-mengalir {
    background: linear-gradient(135deg, #0A2A4A, #0E5A8A);
    color: rgba(253,250,244,0.92);
  }
  ```

  Also add per-category accent colors for `.score-fill` bars so each card has
  a distinct accent. Add these four `.score-fill--<tipe>` classes:

  ```css
  .score-fill--daun-terduduk { background: linear-gradient(90deg, #5C3D1E, #D4A56A); }
  .score-fill--duri-perisai  { background: linear-gradient(90deg, #4A1A0A, #D4624A); }
  .score-fill--bambu-lentur  { background: linear-gradient(90deg, #0A3D1A, #6BC47A); }
  .score-fill--air-mengalir  { background: linear-gradient(90deg, #0A2A4A, #4AB8D4); }
  ```

  Files: `styles/game.css`
  Verify: Open `game.html` in browser → complete the game → confirm the result card
  renders without CSS errors (no grey fallback for the header background).

---

- [ ] 2. Replace `TIPE_DATA` and `_kalkulasi()` in `js/hasil.js` with the 4-category system.

  **2a. Replace `TIPE_DATA` object** (currently has keys `ksatria` and `daun`) with a new object
  keyed by the 4 new type slugs. Each entry needs: `emblem`, `label`, `nama`, `sub`,
  `headerClass`, `tagline`, `karakteristik`, `refleksi`, `pesan`, `shareText`, and
  keep `desc` (mapped from `karakteristik`) and `ctaTeks` (mapped from `refleksi + pesan`)
  for the existing `_renderKartu()` template.

  The new `TIPE_DATA` structure:

  ```js
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
  ```

  Note: `desc` in `_renderKartu()` currently renders `tipeInfo.desc`. Map it to
  `tipeInfo.tagline` (the metaphor opener) and use `tipeInfo.karakteristik` for the
  characteristic paragraph. Update `_renderKartu()` to render both fields separately
  (see item 3 for the template change).

  **2b. Replace `_kalkulasi()` function** with the new 4-type determination logic.
  Delete the old `resiliensi >= 7 && isolasi <= 1 ? 'ksatria' : 'daun'` branch and replace with:

  ```js
  function _kalkulasi(state) {
    const resiliensi = state.skor.resiliensi;
    const isolasi    = state.skor.isolasi;
    const responses  = state.skor.pos2Responses;

    // Count by category group
    const asertifCount     = responses.filter(r => r.tipe === 'asertif').length;
    const reaktifCount     = responses.filter(r => r.tipe === 'reaktif').length;
    const pasifCount       = responses.filter(
      r => r.tipe === 'pasif' || r.tipe === 'internalisasi' || r.tipe === 'menarikdiri'
    ).length;

    // Score calculation (kept for score bars — unchanged formula)
    const maxResi = 9;
    const maxIso  = 3;
    const pctResi = (resiliensi / maxResi) * 70;
    const pctIso  = ((maxIso - isolasi + 1) / maxIso) * 30;
    const total   = Math.min(100, Math.round(pctResi + pctIso));

    // Determine LATHI card type
    let tipe;
    // BONUS: Air Mengalir — all 3 asertif, OR 2+ asertif AND laporan submitted
    if (asertifCount >= 3 || (asertifCount >= 2 && state.laporan.submitted)) {
      tipe = 'air-mengalir';
    } else {
      // Highest count wins; ties resolved C > B > A
      if (asertifCount >= reaktifCount && asertifCount >= pasifCount) {
        tipe = 'bambu-lentur';
      } else if (reaktifCount > asertifCount && reaktifCount >= pasifCount) {
        tipe = 'duri-perisai';
      } else {
        tipe = 'daun-terduduk';
      }
    }

    state.hasil.tipe          = tipe;
    state.hasil.totalSkor     = total;
    state.hasil.persentase    = total;
    state.hasil.kalkulasiDone = true;
    LenteraStore.save();
  }
  ```

  Files: `js/hasil.js`
  Verify: Open browser console after completing the game with:
  - All 3 Opsi C selected → `LenteraGame.state.hasil.tipe` should be `'air-mengalir'`
  - All 3 Opsi B selected → should be `'duri-perisai'`
  - 2× A + 1× B → should be `'daun-terduduk'`

---

- [ ] 3. Update `_renderKartu()` in `js/hasil.js` to render the new card fields and use
  the correct score-fill class per card type.

  In the existing `_renderKartu()` function, the `.kartu-body` section currently renders
  `tipeInfo.desc` in `.kartu-desc` and `tipeInfo.ctaTeks` in `.kartu-cta-text`.
  Replace these two elements with a 3-section layout that renders `tagline`, `karakteristik`,
  `refleksi`, and `pesan` from the new TIPE_DATA:

  Replace the current `.kartu-desc` and `.kartu-cta-text` block with:

  ```html
  <p class="kartu-tagline">${tipeInfo.tagline}</p>

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
  ```

  Also update the score bar `class` attribute for `.score-fill` elements in the
  Resiliensi and Asertivitas rows to use the type-specific accent class.
  Change the two hardcoded `score-fill--resiliensi` classes in those rows to
  `score-fill--${tipe}` (use the `tipe` variable already available in `_renderKartu`
  via `state.hasil.tipe`).

  Add the CSS for the new card body elements to `styles/game.css`:

  ```css
  .kartu-tagline {
    font-size: var(--text-sm);
    font-style: italic;
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.7;
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-surface);
  }
  .kartu-karakteristik,
  .kartu-refleksi {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-3);
  }
  .kartu-karak-label,
  .kartu-refleksi-label {
    font-size: 10px;
    font-weight: var(--weight-semi);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }
  .kartu-karak-text,
  .kartu-refleksi-text {
    font-size: var(--text-sm);
    color: var(--color-text);
    line-height: 1.7;
  }
  .kartu-pesan {
    border: 1px solid var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    text-align: center;
  }
  .kartu-pesan-text {
    font-size: var(--text-sm);
    font-weight: var(--weight-semi);
    color: var(--color-text);
    line-height: 1.65;
  }
  ```

  Files: `js/hasil.js`, `styles/game.css`
  Verify: Load hasil screen in browser — confirm the card shows tagline in italics,
  two labeled sections (Karakteristik, Refleksi LATHI), and a pesan box.

---

- [ ] 4. Update the konseling button visibility check in `_renderActions()` in `js/hasil.js`.

  Find this line in `_renderActions()`:
  ```js
  const showKonseling = state.hasil.tipe === 'daun' || state.laporan.submitted;
  ```

  Replace with:
  ```js
  const showKonseling = state.hasil.tipe === 'daun-terduduk' || state.laporan.submitted;
  ```

  Also update `_openKonselingLink()` — it references `state.hasil.tipe === 'daun'` once
  in the `_urgensi` assignment. Change both occurrences:
  ```js
  // OLD:
  _urgensi: state.hasil.tipe === 'daun' ? 'tinggi' : 'sedang',
  // NEW:
  _urgensi: state.hasil.tipe === 'daun-terduduk' ? 'tinggi' : 'sedang',
  ```
  (there are two of these — one in the `idxSama >= 0` branch and one in the `else` branch).

  Also update `_playCompletionAnimation()` — it currently checks `tipe === 'ksatria'`.
  Replace the whole function body with a 4-case switch:

  ```js
  function _playCompletionAnimation(tipe) {
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
  ```

  Files: `js/hasil.js`
  Verify: Test with tipe `'daun-terduduk'` — konseling button should be visible.
  Test with tipe `'bambu-lentur'` and no laporan — konseling button should be hidden.

---

- [ ] 5. Update `_tipeMental()` in `dashboard/admin.html` to return one of the 4 new slugs
  using the same logic as `_kalkulasi()` in hasil.js.

  Find the current `_tipeMental()` function:
  ```js
  function _tipeMental(skor) {
    if (!skor) return 'daun';
    return (skor.resiliensi >= 7 && skor.isolasi <= 1) ? 'ksatria' : 'daun';
  }
  ```

  Replace it entirely with:
  ```js
  function _tipeMental(skor) {
    if (!skor) return 'daun-terduduk';
    const responses = skor.pos2 || [];
    const asertifCount = responses.filter(r => r.tipe === 'asertif').length;
    const reaktifCount = responses.filter(r => r.tipe === 'reaktif').length;
    const pasifCount   = responses.filter(
      r => r.tipe === 'pasif' || r.tipe === 'internalisasi' || r.tipe === 'menarikdiri'
    ).length;
    // Note: laporan.submitted is not available on the skor object in dashboard context,
    // so we only apply the asertifCount >= 3 Air Mengalir trigger here.
    if (asertifCount >= 3) return 'air-mengalir';
    if (asertifCount >= reaktifCount && asertifCount >= pasifCount) return 'bambu-lentur';
    if (reaktifCount > asertifCount && reaktifCount >= pasifCount) return 'duri-perisai';
    return 'daun-terduduk';
  }
  ```

  Files: `dashboard/admin.html`
  Verify: Open the dashboard, play a game with all-C responses, check that the
  sesi row shows `🌊 Air Mengalir`.

---

- [ ] 6. Update all badge renderers in `dashboard/admin.html` that hard-code
  `'⚔️ Ksatria'` / `'🍃 Daun'` labels.

  There are 5 locations to update. For each, replace the old ternary/conditional
  with a helper call. First, add this helper function near `_tipeMental()`:

  ```js
  function _lathiCardBadge(tipe) {
    const map = {
      'air-mengalir' : { emoji: '🌊', nama: 'Air Mengalir',  color: 'blue'   },
      'bambu-lentur' : { emoji: '🎋', nama: 'Bambu Lentur',  color: 'green'  },
      'duri-perisai' : { emoji: '🏜️', nama: 'Duri Perisai',  color: 'orange' },
      'daun-terduduk': { emoji: '🍂', nama: 'Daun Terduduk', color: 'gray'   },
    };
    const d = map[tipe] || map['daun-terduduk'];
    return `<span class="badge ${d.color}">${d.emoji} ${d.nama}</span>`;
  }
  ```

  Then replace each occurrence:

  **Location 1 — `renderOverview()` tbody-recent row (tipe badge column):**
  ```js
  // OLD:
  <td><span class="badge ${l._tipeMental === 'ksatria' ? 'blue' : 'gray'}">${l._tipeMental === 'ksatria' ? '⚔️ Ksatria' : '🍃 Daun'}</span></td>
  // NEW:
  <td>${_lathiCardBadge(l._tipeMental)}</td>
  ```

  **Location 2 — `renderLaporan()` tbody-laporan row (Tipe Mental column):**
  ```js
  // OLD:
  <td><span class="badge ${l._tipeMental === 'ksatria' ? 'blue' : 'gray'}">${l._tipeMental === 'ksatria' ? '⚔️ Ksatria' : '🍃 Daun'}</span></td>
  // NEW:
  <td>${_lathiCardBadge(l._tipeMental)}</td>
  ```

  **Location 3 — `renderLaporan()` mini-bar section (color conditional `'ksatria' ? 'gold' : 'gray'`):**
  ```js
  // OLD:
  <div class="mini-fill ${l._tipeMental === 'ksatria' ? 'gold' : 'gray'}" ...>
  // NEW:
  <div class="mini-fill ${l._tipeMental === 'air-mengalir' || l._tipeMental === 'bambu-lentur' ? 'gold' : 'gray'}" ...>
  ```

  **Location 4 — `renderSesi()` tbody-sesi row (Tipe Mental column):**
  ```js
  // OLD:
  <td><span class="badge ${s.tipe === 'ksatria' ? 'blue' : 'gray'}">${s.tipe === 'ksatria' ? '⚔️ Ksatria' : s.tipe === 'daun' ? '🍃 Daun' : '— belum selesai'}</span></td>
  // NEW:
  <td>${s.tipe ? _lathiCardBadge(s.tipe) : '<span style="color:var(--text-light);font-size:12px">— belum selesai</span>'}</td>
  ```

  **Location 5 — `renderSesi()` mini-bar color conditional:**
  ```js
  // OLD:
  <div class="mini-fill ${s.tipe === 'ksatria' ? 'gold' : 'gray'}" ...>
  // NEW:
  <div class="mini-fill ${s.tipe === 'air-mengalir' || s.tipe === 'bambu-lentur' ? 'gold' : 'gray'}" ...>
  ```

  **Location 6 — `bukaModalLaporan()` profil mental section (the emoji and type text):**
  ```js
  // OLD:
  ${l._tipeMental === 'ksatria' ? '⚔️' : '🍃'}
  // ...
  Tipe: ${l._tipeMental === 'ksatria' ? 'Ksatria' : 'Daun Terduduk'}
  // NEW (combine into single call):
  ${_lathiCardBadge(l._tipeMental)}
  ```
  (Remove the two separate `div` and text elements for emoji + type label,
  replace with a single `_lathiCardBadge` call in that grid cell.)

  Files: `dashboard/admin.html`
  Verify: Open dashboard, check the laporan, sesi, and overview tables —
  no `⚔️ Ksatria` or `🍃 Daun` labels should appear anywhere.

---

- [ ] 7. Update the Sesi filter dropdown in `dashboard/admin.html` from 2 options to 4.

  Find the `<select id="sf-tipe">` element (in `view-sesi`):
  ```html
  <select class="filter-select" id="sf-tipe">
    <option value="">Semua Tipe</option>
    <option value="ksatria">Ksatria LATHI</option>
    <option value="daun">Daun Terduduk</option>
  </select>
  ```

  Replace with:
  ```html
  <select class="filter-select" id="sf-tipe">
    <option value="">Semua Tipe</option>
    <option value="air-mengalir">🌊 Air Mengalir</option>
    <option value="bambu-lentur">🎋 Bambu Lentur</option>
    <option value="duri-perisai">🏜️ Duri Perisai</option>
    <option value="daun-terduduk">🍂 Daun Terduduk</option>
  </select>
  ```

  Files: `dashboard/admin.html`
  Verify: Open the Sesi view → filter dropdown shows all 4 options.

---

- [ ] 8. Update the Overview stat card for "Tipe Daun Terduduk" and add LATHI card
  distribution in `dashboard/admin.html`.

  **8a. Update the existing stat card** (`st-daun`). Find:
  ```html
  <div class="stat-card blue">
    <div class="stat-icon">🍃</div>
    <div class="stat-val blue" id="st-daun">0</div>
    <div class="stat-label">Tipe Daun Terduduk</div>
  </div>
  ```
  Replace with:
  ```html
  <div class="stat-card blue">
    <div class="stat-icon">🌟</div>
    <div class="stat-val blue" id="st-daun">0</div>
    <div class="stat-label">Perlu Perhatian (Daun)</div>
  </div>
  ```

  **8b. Update `renderOverview()` JavaScript** to compute daun correctly and add a
  LATHI distribution panel. In `renderOverview()`:

  Find:
  ```js
  const daun = sesi.filter(s => s.tipe === 'daun').length;
  ```
  Replace with:
  ```js
  const daun = sesi.filter(s => s.tipe === 'daun-terduduk').length;
  ```

  **8c. Add LATHI distribution panel** inside `renderOverview()`, appended after the
  existing `renderTren(sesi)` call. Add this code block:

  ```js
  // Distribusi Kartu LATHI
  const lathiDist = { 'air-mengalir': 0, 'bambu-lentur': 0, 'duri-perisai': 0, 'daun-terduduk': 0 };
  sesi.forEach(s => { if (s.tipe && lathiDist[s.tipe] !== undefined) lathiDist[s.tipe]++; });
  const lathiPanelEl = document.getElementById('lathi-dist-panel');
  if (lathiPanelEl) {
    const totalSesi = sesi.length || 1;
    const distItems = [
      { key: 'air-mengalir',  emoji: '🌊', label: 'Air Mengalir',  color: '#4AB8D4' },
      { key: 'bambu-lentur',  emoji: '🎋', label: 'Bambu Lentur',  color: '#6BC47A' },
      { key: 'duri-perisai',  emoji: '🏜️', label: 'Duri Perisai',  color: '#D4624A' },
      { key: 'daun-terduduk', emoji: '🍂', label: 'Daun Terduduk', color: '#D4A56A' },
    ];
    lathiPanelEl.innerHTML = distItems.map(d => {
      const cnt = lathiDist[d.key];
      const pct = Math.round(cnt / totalSesi * 100);
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:13px;font-weight:600">${d.emoji} ${d.label}</span>
          <span style="font-size:12px;font-weight:700;color:var(--text-muted)">${cnt} (${pct}%)</span>
        </div>
        <div class="mini-bar" style="height:9px">
          <div class="mini-fill" style="width:${pct}%;background:${d.color}"></div>
        </div>
      </div>`;
    }).join('');
  }
  ```

  **8d. Add the HTML panel** inside `view-overview`'s `dash-grid`, after the existing
  tren panel (the `full` panel with id `tren-bars`). Insert:

  ```html
  <div class="panel full">
    <div class="panel-head">
      <span class="panel-title">🌟 Distribusi Kartu LATHI</span>
    </div>
    <div style="padding:14px 18px" id="lathi-dist-panel"></div>
  </div>
  ```

  Files: `dashboard/admin.html`
  Verify: Dashboard overview shows the new LATHI distribution panel with 4 categories.
  `st-daun` counter updates correctly for `'daun-terduduk'` type sesi.

---

- [ ] 9. Update `renderKonseling()` and `updateBadges()` in `dashboard/admin.html`
  to include all 4 card types for students who submitted laporan.

  **9a. Update `updateBadges()`** — find:
  ```js
  const konseling = sesi.filter(s => s.tipe === 'daun' && s.laporan).length;
  ```
  Replace with:
  ```js
  const konseling = sesi.filter(s => s.laporan).length;
  ```
  (Any student who submitted a laporan is eligible for konseling, regardless of card type —
  consistent with the game logic change in item 4 where `showKonseling = tipe === 'daun-terduduk' || laporan.submitted`.)

  **9b. Update `renderKonseling()`** — find:
  ```js
  const perlu = sesi.filter(s => s.tipe === 'daun' && s.laporan);
  ```
  Replace with:
  ```js
  const perlu = sesi.filter(s => s.laporan);
  ```

  Also update the badge in the konseling table row. Find:
  ```js
  <td><span class="badge gray">🍃 Daun Terduduk</span></td>
  ```
  Replace with:
  ```js
  <td>${_lathiCardBadge(s.tipe || 'daun-terduduk')}</td>
  ```

  Also update the empty state message. Find:
  ```js
  <p class="empty-sub">Siswa tipe Daun Terduduk yang mengirim laporan akan muncul di sini</p>
  ```
  Replace with:
  ```js
  <p class="empty-sub">Siswa yang mengirim laporan dari Bilik Cahaya akan muncul di sini</p>
  ```

  Files: `dashboard/admin.html`
  Verify: If a session with tipe `'bambu-lentur'` and `laporan: true` exists,
  it should appear in the Konseling view. The sidebar konseling badge count
  should match the total of laporan-submitting sessions.

---

## Summary of Changes per File

| File | What changes |
|---|---|
| `styles/game.css` | Add 4 `.kartu-header--*` classes + 4 `.score-fill--*` classes + new kartu body element CSS |
| `js/hasil.js` | Replace `TIPE_DATA` (2→4 types), replace `_kalkulasi()` logic, update `_renderKartu()` template, fix konseling check, fix `_playCompletionAnimation()` |
| `dashboard/admin.html` | Replace `_tipeMental()`, add `_lathiCardBadge()` helper, update all 6 badge render sites, update sesi filter dropdown, update stat card label, add LATHI dist panel HTML + JS, update konseling filter |

No changes needed to `state.js` — the existing `pos2Responses` array structure already
captures `tipe` per response, and `laporan.submitted` is already tracked. The new
determination logic reads from data that's already there.
