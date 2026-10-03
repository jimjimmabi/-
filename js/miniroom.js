// ============================================
// 도토리숲 — 미니룸 (Mini-Room Editor)
// ============================================

const ROOM_COLS = 8;
const ROOM_ROWS = 8;

const FURNITURE_PALETTE = [
  { emoji: '🛏️', name: '침대' },
  { emoji: '🪑', name: '의자' },
  { emoji: '🖥️', name: '컴퓨터' },
  { emoji: '📚', name: '책' },
  { emoji: '🪴', name: '화분' },
  { emoji: '💡', name: '스탠드' },
  { emoji: '🖼️', name: '그림' },
  { emoji: '🕰️', name: '시계' },
  { emoji: '🎸', name: '기타' },
  { emoji: '☕', name: '커피' },
  { emoji: '🎧', name: '헤드폰' },
  { emoji: '📷', name: '카메라' },
  { emoji: '🧸', name: '곰인형' },
  { emoji: '🌸', name: '꽃' },
  { emoji: '🍰', name: '케이크' },
  { emoji: '🎂', name: '생일' },
  { emoji: '🎈', name: '풍선' },
  { emoji: '⭐', name: '별' },
  { emoji: '🌈', name: '무지개' },
  { emoji: '🍀', name: '클로버' }
];

const WALLPAPER_OPTIONS = [
  { id: 'default', name: '기본', css: 'linear-gradient(to bottom, #FFF8F0, #FFEEDD)' },
  { id: 'sky', name: '하늘', css: 'linear-gradient(to bottom, #EAF6FF, #D4E8F8)' },
  { id: 'pink', name: '분홍', css: 'linear-gradient(to bottom, #FFE8F0, #FFD4E8)' },
  { id: 'mint', name: '민트', css: 'linear-gradient(to bottom, #E8F6EE, #D4EDE0)' },
  { id: 'lavender', name: '라벤더', css: 'linear-gradient(to bottom, #F0EAF8, #E0D4F0)' },
  { id: 'sunset', name: '노을', css: 'linear-gradient(to bottom, #FFE8D4, #FFC8A8)' },
  { id: 'night', name: '밤', css: 'linear-gradient(to bottom, #2A2A4A, #1A1A2E)' }
];

const FLOOR_OPTIONS = [
  { id: 'default', name: '나무', css: '#C68B4A' },
  { id: 'cream', name: '크림', css: '#F0E4D4' },
  { id: 'pink', name: '핑크', css: '#FFD4E8' },
  { id: 'mint', name: '민트', css: '#D4EDE0' }
];

let roomState = {
  layout: {},
  wallpaper: 'default',
  floor: 'default',
  miniMePosition: { row: 4, col: 4 }
};

let roomSelectedFurniture = null;
let roomCurrentProfile = null;
let roomReadOnly = false;

// ---------- Init: my room ----------

async function initMiniRoomTab() {
  const container = document.getElementById('tab-room');
  if (!container) return;

  roomReadOnly = false;
  roomSelectedFurniture = null;

  try {
    roomCurrentProfile = await DotoriStorage.getProfile();
  } catch (e) {
    console.error('Profile load failed:', e);
  }

  let room = { layout: {}, wallpaper: 'default', floor: 'default' };
  try {
    room = await DotoriStorage.getRoom();
  } catch (e) {
    console.warn('Room load failed:', e);
  }

  const layout = (room && room.layout) || {};
  const miniMePosition = layout.miniMe || { row: 4, col: 4 };
  const cleanLayout = { ...layout };
  delete cleanLayout.miniMe;

  roomState = {
    layout: cleanLayout,
    wallpaper: (room && room.wallpaper) || 'default',
    floor: (room && room.floor) || 'default',
    miniMePosition
  };

  renderMiniRoomTab(container);
}

function renderMiniRoomTab(container) {
  container.innerHTML = `
    <div class="miniroom-page">
      <div class="miniroom-header">
        <h2>🏠 미니룸</h2>
        <p class="miniroom-purpose">나만의 작은 방을 꾸며보세요.</p>
      </div>

      <div class="miniroom-layout">
        <div class="miniroom-stage">
          <div class="miniroom-grid" id="miniroom-grid"></div>
        </div>

        <div class="miniroom-toolbox">
          <div class="miniroom-tool-section">
            <div class="miniroom-tool-title">가구</div>
            <div class="miniroom-palette" id="miniroom-palette"></div>
            <p class="miniroom-hint">가구를 선택한 다음 방의 칸을 클릭하세요.<br>같은 가구를 다시 누르면 취소됩니다.</p>
          </div>

          <div class="miniroom-tool-section">
            <div class="miniroom-tool-title">벽지</div>
            <div class="miniroom-wallpaper-options" id="miniroom-wallpaper"></div>
          </div>

          <div class="miniroom-tool-section">
            <div class="miniroom-tool-title">바닥</div>
            <div class="miniroom-floor-options" id="miniroom-floor"></div>
          </div>

          <div class="miniroom-tool-section">
            <button id="miniroom-save-btn" class="small-btn primary" style="width:100%;">
              💾 저장하기
            </button>
            <button id="miniroom-clear-btn" class="small-btn" style="width:100%; margin-top:6px;">
              🗑️ 모두 지우기
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderRoomGrid();
  renderFurniturePalette();
  renderWallpaperOptions();
  renderFloorOptions();
  wireMiniRoomButtons();
}

function renderRoomGrid() {
  const grid = document.getElementById('miniroom-grid');
  if (!grid) return;

  const wallpaper = WALLPAPER_OPTIONS.find((w) => w.id === roomState.wallpaper) || WALLPAPER_OPTIONS[0];
  grid.style.background = wallpaper.css;

  const floor = FLOOR_OPTIONS.find((f) => f.id === roomState.floor) || FLOOR_OPTIONS[0];
  const floorColor = floor.css;

  grid.innerHTML = '';

  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'miniroom-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (row >= ROOM_ROWS - 2) {
        cell.style.background = floorColor;
      }

      const key = `${row}-${col}`;
      const item = roomState.layout[key];
      if (item && item.emoji) {
        const furniture = document.createElement('span');
        furniture.className = 'miniroom-furniture';
        furniture.textContent = item.emoji;
        cell.appendChild(furniture);
      }

      if (roomState.miniMePosition.row === row && roomState.miniMePosition.col === col) {
        const miniMe = document.createElement('span');
        miniMe.className = 'miniroom-mini-me';
        miniMe.textContent = (roomCurrentProfile && roomCurrentProfile.mini_me) || '🌰';
        cell.appendChild(miniMe);
      }

      cell.addEventListener('click', () => handleCellClick(row, col));
      grid.appendChild(cell);
    }
  }
}

function handleCellClick(row, col) {
  if (roomReadOnly) return;

  const key = `${row}-${col}`;

  if (roomState.miniMePosition.row === row && roomState.miniMePosition.col === col) {
    return;
  }

  if (!roomSelectedFurniture) {
    if (roomState.layout[key]) {
      delete roomState.layout[key];
      renderRoomGrid();
    }
    return;
  }

  roomState.layout[key] = {
    emoji: roomSelectedFurniture.emoji,
    name: roomSelectedFurniture.name
  };

  renderRoomGrid();
}

function renderFurniturePalette() {
  const palette = document.getElementById('miniroom-palette');
  if (!palette) return;

  palette.innerHTML = '';
  FURNITURE_PALETTE.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'miniroom-furniture-btn';
    btn.title = item.name;
    btn.textContent = item.emoji;

    if (roomSelectedFurniture && roomSelectedFurniture.emoji === item.emoji) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      if (roomSelectedFurniture && roomSelectedFurniture.emoji === item.emoji) {
        roomSelectedFurniture = null;
      } else {
        roomSelectedFurniture = item;
      }
      renderFurniturePalette();
    });

    palette.appendChild(btn);
  });
}

function renderWallpaperOptions() {
  const el = document.getElementById('miniroom-wallpaper');
  if (!el) return;

  el.innerHTML = '';
  WALLPAPER_OPTIONS.forEach((w) => {
    const btn = document.createElement('button');
    btn.className = 'miniroom-wallpaper-btn';
    btn.title = w.name;
    btn.style.background = w.css;

    if (roomState.wallpaper === w.id) btn.classList.add('active');

    btn.addEventListener('click', () => {
      roomState.wallpaper = w.id;
      renderWallpaperOptions();
      renderRoomGrid();
    });

    el.appendChild(btn);
  });
}

function renderFloorOptions() {
  const el = document.getElementById('miniroom-floor');
  if (!el) return;

  el.innerHTML = '';
  FLOOR_OPTIONS.forEach((f) => {
    const btn = document.createElement('button');
    btn.className = 'miniroom-floor-btn';
    btn.title = f.name;
    btn.style.background = f.css;

    if (roomState.floor === f.id) btn.classList.add('active');

    btn.addEventListener('click', () => {
      roomState.floor = f.id;
      renderFloorOptions();
      renderRoomGrid();
    });

    el.appendChild(btn);
  });
}

function wireMiniRoomButtons() {
  const saveBtn = document.getElementById('miniroom-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveMiniRoom);

  const clearBtn = document.getElementById('miniroom-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('방을 모두 비울까요?')) return;
      roomState.layout = {};
      renderRoomGrid();
    });
  }
}

async function saveMiniRoom() {
  const saveBtn = document.getElementById('miniroom-save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }

  const layoutToSave = { ...roomState.layout };
  layoutToSave.miniMe = roomState.miniMePosition;

  try {
    const ok = await DotoriStorage.saveMyRoom({
      layout: layoutToSave,
      wallpaper: roomState.wallpaper,
      floor: roomState.floor,
      bgm_choice: null
    });

    if (ok) {
      if (typeof showToast === 'function') {
        showToast({
          mini_me: '🌰',
          title: '저장했어요',
          body: '미니룸이 잘 저장되었어요.'
        });
      } else {
        alert('미니룸이 저장되었어요!');
      }
    } else {
      alert('저장할 수 없어요');
    }
  } catch (e) {
    console.error('Save failed:', e);
    alert('저장 실패: ' + (e.message || ''));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 저장하기';
    }
  }
}

// ---------- Read-only preview (for home + visit modal) ----------

function renderRoomPreview(container, room, profile, options = {}) {
  if (!container) return;

  const layout = (room && room.layout) || {};
  const wallpaperId = (room && room.wallpaper) || 'default';
  const floorId = (room && room.floor) || 'default';
  const miniMePosition = layout.miniMe || { row: 4, col: 4 };

  const wallpaper = WALLPAPER_OPTIONS.find((w) => w.id === wallpaperId) || WALLPAPER_OPTIONS[0];
  const floor = FLOOR_OPTIONS.find((f) => f.id === floorId) || FLOOR_OPTIONS[0];

  const sizeClass = options.compact ? 'miniroom-grid compact' : 'miniroom-grid';

  container.innerHTML = '';
  container.className = sizeClass;
  container.style.background = wallpaper.css;

  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'miniroom-cell';

      if (row >= ROOM_ROWS - 2) {
        cell.style.background = floor.css;
      }

      const key = `${row}-${col}`;
      const item = layout[key];
      if (item && item.emoji) {
        const furniture = document.createElement('span');
        furniture.className = 'miniroom-furniture';
        furniture.textContent = item.emoji;
        cell.appendChild(furniture);
      }

      if (miniMePosition.row === row && miniMePosition.col === col) {
        const miniMe = document.createElement('span');
        miniMe.className = 'miniroom-mini-me';
        miniMe.textContent = (profile && profile.mini_me) || '🌰';
        cell.appendChild(miniMe);
      }

      container.appendChild(cell);
    }
  }
}