/* ============================================================
   LENTERA — pos2-pasar-interaksi.js
   Pos 2: Pasar Interaksi — Roleplay Dialog Verbal Bullying
   ============================================================

   DATA SKENARIO:
   Setiap skenario punya 3 pilihan (A/B/C):
     A → Pasif/Internalisasi  (skor resiliensi +1)
     B → Reaktif/Defensif     (skor resiliensi +2)
     C → Asertif / Lathi→Urup (skor resiliensi +3, tipe 'asertif')

   ALUR:
   intro → skenario 1 → skenario 2 → skenario 3 → selesai → pos3
   ============================================================ */

'use strict';

const Pos2PasarInteraksi = (() => {

  // ── Data Skenario ─────────────────────────────────────────
  const SKENARIO = [
    {
      id      : 1,
      npcNama : 'Dika',
      npcBadge: 'Teman Sekelas',
      npcAura : 'npc-body--blue',
      tema    : 'Body Shaming',
      dialog  : (nama) =>
        `Eh ${nama || 'kamu'}, sekarang makin "subur" aja nih. Porsi makannya nambah ya? Hahaha, canda subur!`,
      pilihan : [
        {
          id   : 'A',
          teks : 'Ikut ketawa canggung lalu cepat-cepat pergi.',
          tipe : 'pasif',
          skor : 1,
          feedback: 'Kamu memilih menghindar. Wajar banget kalau situasi itu tidak nyaman. Tapi ejekan yang didiamkan kadang terasa makin berat di dalam hati.',
        },
        {
          id   : 'B',
          teks : '"Biarin aja, yang penting aku gak suka ngurusin hidup orang!"',
          tipe : 'reaktif',
          skor : 2,
          feedback: 'Kamu memilih melawan. Ada bagusnya, setidaknya kamu tidak mendiamkan. Tapi respons yang lebih dingin seringkali lebih kuat.',
        },
        {
          id   : 'C',
          teks : '"Iya nih lagi bahagia banget, makasih ya udah merhatiin." 😊',
          tipe : 'asertif',
          skor : 3,
          feedback: 'Keren! Ini Lathi to Urup, kamu membalikkan narasi dengan tenang dan tetap percaya diri. Kata-kata mereka tidak punya kuasa atasmu.',
        },
      ],
    },
    {
      id      : 2,
      npcNama : 'Tara',
      npcBadge: 'Teman Satu Kelompok',
      npcAura : 'npc-body--orange',
      tema    : 'Meremehkan Pencapaian',
      dialog  : (nama) =>
        `Tumben tugas ${nama || 'kamu'} bagus. Paling juga hoki doang kan? Yaelah, jangan baper, cuma bercanda kali!`,
      pilihan : [
        {
          id   : 'A',
          teks : 'Menunduk diam dan berpikir, "Mungkin emang aku cuma hoki."',
          tipe : 'pasif',
          skor : 1,
          feedback: 'Kamu menyerap kata-kata itu sebagai kebenaran. Tapi hati-hati, ini tanda kamu sedang membiarkan orang lain mendefinisikan dirimu. Usahamu nyata.',
        },
        {
          id   : 'B',
          teks : '"Maksud kamu apa ngomong gitu? Sirik aja!"',
          tipe : 'reaktif',
          skor : 2,
          feedback: 'Kamu tidak diam, itu bagus! Tapi respons yang terlalu emosional kadang memberi mereka perhatian yang mereka cari.',
        },
        {
          id   : 'C',
          teks : '"Alhamdulillah dong, hoki kan rezeki juga. Semoga tugas kamu juga lancar ya." 🤲',
          tipe : 'asertif',
          skor : 3,
          feedback: 'Luar biasa! Kamu merespons dengan kedewasaan emosional yang tinggi. Kamu tidak terprovokasi dan bahkan tetap mendoakan yang baik.',
        },
      ],
    },
    {
      id      : 3,
      npcNama : 'Sirkel Geng',
      npcBadge: 'Kelompok Teman',
      npcAura : 'npc-body--green',
      tema    : 'Pengucilan Halus',
      dialog  : (nama) =>
        `Kita mau nongkrong nih. ${nama || 'Kamu'} ga usah ikut deh, ntar malah ngerusak suasana. Hahaha, joke doang santai!`,
      pilihan : [
        {
          id   : 'A',
          teks : '"Oh oke, lagian aku juga sibuk kok." (Padahal tidak.)',
          tipe : 'pasif',
          skor : 1,
          feedback: 'Kamu memilih pergi dengan berpura-pura tidak terluka. "Flight response" ini sering membuat luka itu tidak pernah sembuh karena tidak pernah diakui.',
        },
        {
          id   : 'B',
          teks : '"Dih, siapa juga yang mau ikut nongkrong sama kalian."',
          tipe : 'reaktif',
          skor : 2,
          feedback: 'Kamu melindungi dirimu dengan balik menyerang. Itu naluri manusiawi. Tapi kamu layak teman yang lebih baik dari mereka.',
        },
        {
          id   : 'C',
          teks : '"Wah seru tuh, but have fun ya! Aku memang ada urusan lain kok." 😌',
          tipe : 'asertif',
          skor : 3,
          feedback: 'Sempurna! Kamu menjaga harga dirimu tanpa drama. Kamu menunjukkan bahwa penolakan mereka tidak menggoyahkan kepercayaan dirimu.',
        },
      ],
    },
  ];

  // ── State internal ────────────────────────────────────────
  let currentSkenarioIndex = 0;
  let selectedPilihan      = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (LenteraGame.state.posCompleted.pos2) {
      LenteraState.navigateTo('pos3');
      return;
    }

    currentSkenarioIndex = LenteraGame.state.skor.pos2Responses.length;
    selectedPilihan = null;

    // Pakai .onclick agar tidak menumpuk
    const btn = document.getElementById('btn-pos2-mulai');
    if (btn) {
      btn.onclick = function() {
        document.getElementById('pos2-intro').hidden = true;
        if (currentSkenarioIndex < SKENARIO.length) {
          _showSkenario(currentSkenarioIndex);
        } else {
          _showComplete();
        }
      };
    }
  }

  // ── Tampilkan skenario ────────────────────────────────────
  function _showSkenario(index) {
    if (index >= SKENARIO.length) {
      _showComplete();
      return;
    }

    const skenario = SKENARIO[index];
    const panel    = document.getElementById('scenario-panel');
    panel.hidden   = false;
    selectedPilihan = null;

    // Update nama pemain di dialog
    const playerName = LenteraGame.state.player.nama || 'kamu';

    // Render NPC info
    document.getElementById('npc-name').textContent  = skenario.npcNama;
    document.getElementById('npc-badge').textContent = skenario.npcBadge;

    // NPC portrait aura
    const npcBody = document.querySelector('#npc-portrait .npc-portrait-body');
    if (npcBody) {
      npcBody.className = `npc-portrait-body ${skenario.npcAura}`;
    }

    // NPC dialog dengan nama pemain
    document.getElementById('npc-speech').textContent = skenario.dialog(playerName);

    // Counter
    document.getElementById('scenario-current').textContent = index + 1;
    document.getElementById('scenario-total').textContent   = SKENARIO.length;

    // Render pilihan
    _renderPilihan(skenario.pilihan);

    // Bind tombol next — pakai .onclick agar tidak menumpuk
    const btnNext = document.getElementById('btn-scenario-next');
    if (btnNext) {
      btnNext.disabled  = true;
      btnNext.textContent = 'Pilih Respons';
      btnNext.onclick = function() { _confirmPilihan(skenario); };
    }
  }

  // ── Render pilihan dialog ─────────────────────────────────
  function _renderPilihan(pilihanList) {
    const container = document.getElementById('response-choices');
    container.innerHTML = '';

    pilihanList.forEach((p, i) => {
      const label = document.createElement('label');
      label.className = 'response-choice';
      label.setAttribute('data-pilihan-id', p.id);
      label.setAttribute('data-pilihan-tipe', p.tipe);
      label.setAttribute('data-pilihan-skor', p.skor);
      label.innerHTML = `
        <input type="radio" name="response" value="${p.id}" class="sr-only"
               aria-label="Pilihan ${p.id}: ${p.teks}" />
        <span class="response-label" aria-hidden="true">${p.id}</span>
        <span class="response-text">${p.teks}</span>
        <div class="choice-check" aria-hidden="true">✓</div>
      `;

      // Animate masuk dengan delay
      label.style.opacity = '0';
      label.style.transform = 'translateY(8px)';
      setTimeout(() => {
        label.style.transition = 'opacity 200ms ease, transform 200ms ease';
        label.style.opacity = '1';
        label.style.transform = 'translateY(0)';
      }, 80 * i);

      container.appendChild(label);
    });

    // Bind perubahan pilihan — pakai .onchange agar tidak menumpuk
    const finalContainer = document.getElementById('response-choices');
    if (finalContainer) {
      finalContainer.onchange = function(e) {
        if (e.target.type === 'radio') {
          selectedPilihan = e.target.value;
          const btnNext = document.getElementById('btn-scenario-next');
          if (btnNext) btnNext.disabled = false;
        }
      };
    }
  }

  // ── Konfirmasi & simpan pilihan ───────────────────────────
  function _confirmPilihan(skenario) {
    if (!selectedPilihan) return;

    const pilihan = skenario.pilihan.find(p => p.id === selectedPilihan);
    if (!pilihan) return;

    // Rekam ke state
    LenteraGame.recordPos2Response(skenario.id, pilihan.id, pilihan.tipe, pilihan.skor);

    // Tampilkan feedback sebelum lanjut
    _showFeedback(pilihan, skenario.id);
  }

  // ── Tampilkan panel feedback ──────────────────────────────
  function _showFeedback(pilihan, skenarioId) {
    // Highlight pilihan terpilih
    document.querySelectorAll('.response-choice').forEach(el => {
      el.style.pointerEvents = 'none';
      if (el.dataset.pilihanId === pilihan.id) {
        el.style.borderColor = pilihan.tipe === 'asertif'
          ? 'var(--color-success)' : 'var(--color-warning)';
        el.style.background  = pilihan.tipe === 'asertif'
          ? 'rgba(39,174,96,0.08)' : 'rgba(243,156,18,0.08)';
      }
    });

    // Inject feedback box di bawah pilihan
    const container = document.getElementById('response-choices');
    const feedback  = document.createElement('div');
    feedback.className = 'response-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');

    const icon = pilihan.tipe === 'asertif' ? '🌟' : pilihan.skor === 2 ? '💛' : '🌱';
    feedback.innerHTML = `
      <div class="feedback-box feedback-box--${pilihan.tipe}">
        <span class="feedback-icon-sm">${icon}</span>
        <div>
          <p class="feedback-msg">${pilihan.feedback}</p>
          ${pilihan.tipe === 'asertif' ? '<span class="feedback-badge">Lathi to Urup ✨</span>' : ''}
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .response-feedback { margin-top: 10px; animation: slideInUp 200ms ease forwards; }
      .feedback-box {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 14px 16px; border-radius: 12px;
        background: rgba(44,24,16,0.85); border: 2px solid rgba(201,150,12,0.4);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .feedback-box--asertif {
        border-color: #27AE60;
        background: rgba(27,70,30,0.9);
      }
      .feedback-box--reaktif {
        border-color: #C9960C;
        background: rgba(60,40,10,0.9);
      }
      .feedback-box--pasif,
      .feedback-box--internalisasi,
      .feedback-box--menarikdiri {
        border-color: rgba(201,150,12,0.5);
        background: rgba(44,24,16,0.9);
      }
      .feedback-icon-sm { font-size: 1.4rem; flex-shrink: 0; }
      .feedback-msg {
        font-size: 13px;
        color: #FDF6EC;
        line-height: 1.7;
        margin: 0;
        font-weight: 500;
      }
      .feedback-badge {
        display: inline-block; font-size: 11px; font-weight: 700;
        color: #7ED4A0; background: rgba(39,174,96,0.2);
        padding: 3px 10px; border-radius: 20px; margin-top: 5px;
        border: 1px solid rgba(39,174,96,0.4);
      }
    `;
    if (!document.getElementById('pos2-feedback-style')) {
      style.id = 'pos2-feedback-style';
      document.head.appendChild(style);
    }

    container.appendChild(feedback);

    // Update tombol next
    const btnNext = document.getElementById('btn-scenario-next');
    if (btnNext) {
      btnNext.disabled  = false;
      const isLast = currentSkenarioIndex >= SKENARIO.length - 1;
      btnNext.innerHTML = isLast
        ? 'Selesai! Lihat Hasilnya →'
        : 'Skenario Berikutnya →';
      btnNext.onclick = () => _nextSkenario();
    }
  }

  // ── Lanjut ke skenario berikutnya ────────────────────────
  function _nextSkenario() {
    currentSkenarioIndex++;
    selectedPilihan = null;

    if (currentSkenarioIndex >= SKENARIO.length) {
      _showComplete();
    } else {
      const panel = document.getElementById('scenario-panel');
      panel.style.opacity = '0';
      panel.style.transform = 'translateX(-20px)';
      panel.style.transition = 'opacity 200ms ease, transform 200ms ease';

      setTimeout(() => {
        panel.style.opacity = '';
        panel.style.transform = '';
        panel.style.transition = '';
        // Bersihkan feedback lama sebelum render skenario baru
        const oldFeedback = document.querySelectorAll('.response-feedback');
        oldFeedback.forEach(el => el.remove());
        _showSkenario(currentSkenarioIndex);
      }, 250);
    }
  }

  // ── Tampilkan layar selesai ───────────────────────────────
  function _showComplete() {
    const scenarioPanel = document.getElementById('scenario-panel');
    const intro = document.getElementById('pos2-intro');
    const completeEl = document.getElementById('pos2-complete');
    if (scenarioPanel) scenarioPanel.hidden = true;
    if (intro) intro.hidden = true;
    if (completeEl) completeEl.hidden = false;

    const btn = document.getElementById('btn-goto-pos3');
    if (btn) {
      btn.onclick = function() {
        LenteraNav.completePos('pos2');
        LenteraState.navigateTo('pos3', 'Menuju Taman Urup');
      };
    }
    showToast('Pasar Interaksi selesai!', 'success', 2500);
  }

  // ── Public API ────────────────────────────────────────────
  return { init };

})();

window.Pos2PasarInteraksi = Pos2PasarInteraksi;
