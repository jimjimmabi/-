// ============================================
// 도토리숲 — BGM Player
// ============================================

const BGM_TRACKS = [
  { id: 'cat-dreams', title: '고양이 꿈', file: 'assets/bgm/cat-dreams.mp3' },
  { id: 'neko-komorebi', title: '고양이와 나무', file: 'assets/bgm/neko-komorebi.mp3' },
  { id: 'rainy-day', title: '비 오는 날', file: 'assets/bgm/rainy-day.mp3' },
  { id: 'relaxing-morning', title: '편안한 아침', file: 'assets/bgm/relaxing-morning.mp3' },
  { id: 'sugar-heart', title: '달콤한 마음', file: 'assets/bgm/sugar-heart.mp3' }
];

let bgmAudio = null;
let bgmCurrentId = null;
let bgmIsPlaying = false;

// ---------- Init on my own page ----------
function initBGM() {
  const playBtn = document.getElementById('bgm-play-btn');
  const selectBtn = document.getElementById('bgm-select-btn');

  if (playBtn) {
    playBtn.addEventListener('click', toggleMyBGM);
  }
  if (selectBtn) {
    selectBtn.addEventListener('click', openBGMPicker);
  }

  // Load saved BGM choice
  loadMyBGM();
}

async function loadMyBGM() {
  try {
    const room = await DotoriStorage.getRoom();
    const choice = room && room.bgm_choice;
    if (choice) {
      bgmCurrentId = choice;
    }
    updateBGMTitle();
  } catch (e) {
    console.warn('BGM load failed:', e);
    updateBGMTitle();
  }
}

function updateBGMTitle() {
  const titleEl = document.getElementById('bgm-title');
  if (!titleEl) return;

  if (!bgmCurrentId) {
    titleEl.textContent = '— 곡을 선택해주세요 —';
    return;
  }
  const track = BGM_TRACKS.find((t) => t.id === bgmCurrentId);
  titleEl.textContent = track ? track.title : '— 곡을 선택해주세요 —';
}

// ---------- Play / pause on my page ----------
async function toggleMyBGM() {
  if (!bgmCurrentId) {
    openBGMPicker();
    return;
  }

  const track = BGM_TRACKS.find((t) => t.id === bgmCurrentId);
  if (!track) return;

  if (!bgmAudio) {
    bgmAudio = new Audio(track.file);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.5;
  }

  if (bgmIsPlaying) {
    bgmAudio.pause();
    bgmIsPlaying = false;
  } else {
    try {
      await bgmAudio.play();
      bgmIsPlaying = true;
    } catch (e) {
      console.warn('BGM play failed:', e);
    }
  }
  updatePlayButton();
}

function updatePlayButton() {
  const playBtn = document.getElementById('bgm-play-btn');
  if (!playBtn) return;
  playBtn.textContent = bgmIsPlaying ? '⏸' : '▶';
}

// ---------- Picker modal ----------
let bgmPreviewAudio = null;

function openBGMPicker() {
  const tracksHtml = BGM_TRACKS.map((track) => {
    const isActive = bgmCurrentId === track.id;
    return `
      <button class="bgm-track-btn ${isActive ? 'active' : ''}" data-track-id="${track.id}">
        <span class="bgm-track-icon">♪</span>
        <span class="bgm-track-title">${escapeHtml(track.title)}</span>
      </button>
    `;
  }).join('');

  showModal('BGM 설정',
    `<div class="bgm-picker">
      <p class="bgm-picker-hint">
        나의 페이지에 흐를 노래를 골라주세요.
      </p>
      <div class="bgm-track-list">
        <button class="bgm-track-btn ${!bgmCurrentId ? 'active' : ''}" data-track-id="">
          <span class="bgm-track-icon">·</span>
          <span class="bgm-track-title">없음</span>
        </button>
        ${tracksHtml}
      </div>
    </div>`,
    [
      { label: '취소', onClick: () => { stopPreview(); closeModal(); } },
      { label: '저장', primary: true, onClick: saveBGMChoice }
    ]
  );

  // Wire up track buttons for preview
  setTimeout(() => {
    document.querySelectorAll('.bgm-track-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bgm-track-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        previewTrack(btn.dataset.trackId);
      });
    });
  }, 50);
}

function previewTrack(trackId) {
  stopPreview();
  if (!trackId) return;

  const track = BGM_TRACKS.find((t) => t.id === trackId);
  if (!track) return;

  bgmPreviewAudio = new Audio(track.file);
  bgmPreviewAudio.volume = 0.4;
  bgmPreviewAudio.play().catch((e) => {
    console.warn('Preview failed:', e);
  });
}

function stopPreview() {
  if (bgmPreviewAudio) {
    bgmPreviewAudio.pause();
    bgmPreviewAudio = null;
  }
}

async function saveBGMChoice() {
  const activeBtn = document.querySelector('.bgm-track-btn.active');
  const chosenId = activeBtn ? activeBtn.dataset.trackId : '';
  stopPreview();

  try {
    const ok = await DotoriStorage.saveMyBGM(chosenId || null);
    if (ok) {
      bgmCurrentId = chosenId || null;
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio = null;
        bgmIsPlaying = false;
      }
      updateBGMTitle();
      updatePlayButton();
      closeModal();
    } else {
      alert('저장할 수 없어요');
    }
  } catch (e) {
    console.error('Save BGM failed:', e);
    alert('저장 실패: ' + (e.message || ''));
  }
}

// ---------- Visitor view (on someone else's page) ----------
async function initVisitorBGM(profile) {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  let theirBGM = null;
  try {
    const theirRoom = await DotoriStorage.getRoomByDotoriId(profile.dotori_id);
    theirBGM = theirRoom && theirRoom.bgm_choice;
  } catch (e) {
    console.warn('Visitor BGM load failed:', e);
    return;
  }

  if (!theirBGM) return;

  const track = BGM_TRACKS.find((t) => t.id === theirBGM);
  if (!track) return;

  const bgmBar = document.createElement('div');
  bgmBar.className = 'visitor-bgm-bar';
  bgmBar.innerHTML = `
    <button class="visitor-bgm-btn" id="visitor-bgm-btn">
      <span class="visitor-bgm-icon">♪</span>
      <span>BGM 켜기 — ${escapeHtml(track.title)}</span>
    </button>
  `;
  modalBody.insertBefore(bgmBar, modalBody.firstChild);

  let visitorAudio = null;
  let visitorPlaying = false;

  document.getElementById('visitor-bgm-btn').addEventListener('click', async () => {
    if (!visitorAudio) {
      visitorAudio = new Audio(track.file);
      visitorAudio.loop = true;
      visitorAudio.volume = 0.5;
    }

    if (visitorPlaying) {
      visitorAudio.pause();
      visitorPlaying = false;
      document.getElementById('visitor-bgm-btn').innerHTML = `<span class="visitor-bgm-icon">♪</span><span>BGM 켜기 — ${escapeHtml(track.title)}</span>`;
    } else {
      try {
        await visitorAudio.play();
        visitorPlaying = true;
        document.getElementById('visitor-bgm-btn').innerHTML = `<span class="visitor-bgm-icon">♪</span><span>BGM 끄기 — ${escapeHtml(track.title)}</span>`;
      } catch (e) {
        console.warn('Visitor BGM play failed:', e);
      }
    }
  });

  const stopOnClose = () => {
    if (visitorAudio) {
      visitorAudio.pause();
      visitorAudio = null;
    }
    document.removeEventListener('dotori-modal-closed', stopOnClose);
  };
  document.addEventListener('dotori-modal-closed', stopOnClose);
}

window.initBGM = initBGM;
window.initVisitorBGM = initVisitorBGM;
window.BGM_TRACKS = BGM_TRACKS;