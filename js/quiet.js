// ============================================
// 도토리숲 — 조용한 방 (Quiet Room)
// ============================================

const QUIET_SENTENCES = [
  '괜찮아요. 천천히 해도 돼요.',
  '오늘 하루도 잘 버텼어요.',
  '당신이 여기 있다는 것만으로도 충분해요.',
  '아무것도 안 해도 되는 시간이에요.',
  '숨을 한 번 깊게 쉬어봐요.',
  '지금 이 순간은 당신의 것이에요.'
];

let quietIndex = 0;
let quietRotateTimer = null;
let quietIsOpen = false;

// ---------- Open / Close ----------

function openQuietRoom() {
  if (quietIsOpen) return;

  const room = document.getElementById('quiet-room');
  if (!room) {
    buildQuietRoom();
  }

  const roomEl = document.getElementById('quiet-room');
  roomEl.classList.add('open');
  quietIsOpen = true;

  // Show the first sentence immediately
  const s = document.getElementById('quiet-sentence');
  if (s) {
    s.textContent = QUIET_SENTENCES[quietIndex];
    s.classList.remove('fading');
  }

  // Start rotating
  startQuietRotation();
}

function closeQuietRoom() {
  const room = document.getElementById('quiet-room');
  if (!room) return;

  room.classList.remove('open');
  quietIsOpen = false;
  stopQuietRotation();
}

// ---------- Rotate sentences ----------

function startQuietRotation() {
  stopQuietRotation();
  quietRotateTimer = setInterval(() => {
    const s = document.getElementById('quiet-sentence');
    if (!s) return;

    // Fade out
    s.classList.add('fading');

    // After fade completes, swap text and fade in
    setTimeout(() => {
      quietIndex = (quietIndex + 1) % QUIET_SENTENCES.length;
      s.textContent = QUIET_SENTENCES[quietIndex];
      s.classList.remove('fading');
    }, 1200);
  }, 8000);
}

function stopQuietRotation() {
  if (quietRotateTimer) {
    clearInterval(quietRotateTimer);
    quietRotateTimer = null;
  }
}

// ---------- Build the room DOM ----------

function buildQuietRoom() {
  const room = document.createElement('div');
  room.id = 'quiet-room';
  room.innerHTML = `
    <button class="quiet-close" id="quiet-close-btn" aria-label="나가기">✕</button>

    <div class="quiet-room-stage">
      <div class="quiet-room-window"></div>
      <div class="quiet-room-moon">🌙</div>
      <div class="quiet-room-floor"></div>
      <div class="quiet-room-rug"></div>
      <div class="quiet-room-plant">🪴</div>
      <div class="quiet-room-cat">🐈</div>
    </div>

    <div class="quiet-sentence" id="quiet-sentence"></div>
  `;

  document.body.appendChild(room);

  // Wire close button
  setTimeout(() => {
    const closeBtn = document.getElementById('quiet-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeQuietRoom();
      });
    }

    // Escape key closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && quietIsOpen) {
        closeQuietRoom();
      }
    });
  }, 50);
}

// ---------- Expose ----------

window.openQuietRoom = openQuietRoom;
window.closeQuietRoom = closeQuietRoom;