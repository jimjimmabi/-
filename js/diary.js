// ============================================
// 도토리숲 — Mood Diary (Right Sidebar)
// ============================================

const DIARY_EMOJIS = ['😊', '🌧️', '✨', '💭', '😴', '🥰', '😐', '😔', '🌱', '🌸', '🔥', '🌙'];

let diaryCurrentYear = new Date().getFullYear();
let diaryCurrentMonth = new Date().getMonth() + 1; // 1-12
let diaryEntries = {};

// ---------- Mount the sidebar on the home tab ----------
async function initDiarySidebar() {
  const container = document.getElementById('diary-sidebar');
  if (!container) return;

  await loadAndRenderDiary();
}

async function loadAndRenderDiary() {
  const container = document.getElementById('diary-sidebar');
  if (!container) return;

  // Fetch entries for the current month
  let entries = [];
  try {
    entries = await DotoriStorage.getMoodEntriesForMonth(diaryCurrentYear, diaryCurrentMonth);
  } catch (e) {
    console.warn('Diary load failed:', e);
  }

  diaryEntries = {};
  (entries || []).forEach((e) => {
    diaryEntries[e.entry_date] = e;
  });

  renderDiarySidebar(container);
}

function renderDiarySidebar(container) {
  const monthName = `${diaryCurrentYear}년 ${diaryCurrentMonth}월`;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const daysInMonth = new Date(diaryCurrentYear, diaryCurrentMonth, 0).getDate();
  const firstDay = new Date(diaryCurrentYear, diaryCurrentMonth - 1, 1).getDay(); // 0=Sun

  // Build calendar cells
  let cells = '';
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="diary-day diary-day-empty"></div>';
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${diaryCurrentYear}-${String(diaryCurrentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = diaryEntries[dateStr];
    const isToday = dateStr === todayStr;
    const hasEntry = !!entry;

    cells += `
      <div class="diary-day ${isToday ? 'today' : ''} ${hasEntry ? 'filled' : ''}" data-date="${dateStr}">
        <span class="diary-day-num">${d}</span>
        ${hasEntry ? `<span class="diary-day-emoji">${entry.emoji}</span>` : ''}
      </div>
    `;
  }

  // Today's mood preview (for the current day)
  const todayEntry = diaryEntries[todayStr];

  container.innerHTML = `
    <div class="diary-panel">
      <div class="diary-header">
        <span class="diary-title">감성 일기</span>
      </div>
      <div class="diary-month-nav">
        <button class="diary-nav-btn" id="diary-prev-month" aria-label="이전 달">‹</button>
        <span class="diary-month-label">${monthName}</span>
        <button class="diary-nav-btn" id="diary-next-month" aria-label="다음 달">›</button>
      </div>
      <div class="diary-weekdays">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="diary-grid" id="diary-grid">
        ${cells}
      </div>
      <div class="diary-today">
        ${todayEntry
          ? `<div class="diary-today-emoji">${todayEntry.emoji}</div>
             <div class="diary-today-note">${escapeHtml(todayEntry.note || '')}</div>`
          : `<div class="diary-today-hint">오늘 기분은 어땠어요?</div>`
        }
        <button class="small-btn" id="diary-today-btn" style="width:100%; margin-top:6px;">
          ${todayEntry ? '오늘 기분 수정' : '오늘 기분 기록'}
        </button>
      </div>
    </div>
  `;

  wireDiaryButtons();
}

function wireDiaryButtons() {
  const prev = document.getElementById('diary-prev-month');
  const next = document.getElementById('diary-next-month');
  const todayBtn = document.getElementById('diary-today-btn');

  if (prev) {
    prev.addEventListener('click', () => {
      diaryCurrentMonth -= 1;
      if (diaryCurrentMonth < 1) {
        diaryCurrentMonth = 12;
        diaryCurrentYear -= 1;
      }
      loadAndRenderDiary();
    });
  }

  if (next) {
    next.addEventListener('click', () => {
      diaryCurrentMonth += 1;
      if (diaryCurrentMonth > 12) {
        diaryCurrentMonth = 1;
        diaryCurrentYear += 1;
      }
      loadAndRenderDiary();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      openMoodEditor(todayStr);
    });
  }

  // Click any day in the calendar
  document.querySelectorAll('.diary-day:not(.diary-day-empty)').forEach((day) => {
    day.addEventListener('click', () => {
      openMoodEditor(day.dataset.date);
    });
  });
}

// ---------- Mood editor modal ----------
async function openMoodEditor(dateStr) {
  const existing = diaryEntries[dateStr];
  const currentEmoji = existing ? existing.emoji : null;
  const currentNote = existing ? (existing.note || '') : '';

  const parts = dateStr.split('-');
  const displayDate = `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;

  const emojiBtns = DIARY_EMOJIS.map((emoji) => {
    const isActive = currentEmoji === emoji;
    return `<button class="diary-emoji-btn ${isActive ? 'active' : ''}" data-emoji="${emoji}">${emoji}</button>`;
  }).join('');

  showModal(`🌙 ${displayDate}의 기분`,
    `<div class="diary-editor">
      <div class="diary-editor-label">오늘 기분을 골라주세요</div>
      <div class="diary-emoji-picker" id="diary-emoji-picker">
        ${emojiBtns}
      </div>
      <div class="diary-editor-label" style="margin-top:16px;">한 줄 메모 <span class="hint">(선택사항)</span></div>
      <input type="text" id="diary-note-input" maxlength="60"
        placeholder="오늘 하루는 어땠나요?"
        class="editor-input" value="${escapeHtml(currentNote)}">
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      existing ? { label: '삭제', onClick: () => deleteMoodFromEditor(dateStr) } : null,
      { label: '저장', primary: true, onClick: () => saveMoodFromEditor(dateStr) }
    ].filter(Boolean)
  );

  setTimeout(() => {
    document.querySelectorAll('.diary-emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diary-emoji-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    const noteInput = document.getElementById('diary-note-input');
    if (noteInput) noteInput.focus();
  }, 50);
}

async function saveMoodFromEditor(dateStr) {
  const activeEmoji = document.querySelector('.diary-emoji-btn.active');
  if (!activeEmoji) {
    alert('기분을 하나 골라주세요.');
    return;
  }
  const emoji = activeEmoji.dataset.emoji;
  const note = (document.getElementById('diary-note-input')?.value || '').trim();

  try {
    await DotoriStorage.saveMoodEntry(dateStr, emoji, note);
    closeModal();
    await loadAndRenderDiary();
    if (typeof showToast === 'function') {
      showToast({
        mini_me: emoji,
        title: '기록했어요',
        body: '오늘의 기분이 저장되었어요.'
      });
    }
  } catch (e) {
    console.error('Save mood failed:', e);
    alert('저장할 수 없어요: ' + (e.message || ''));
  }
}

async function deleteMoodFromEditor(dateStr) {
  if (!confirm('이 기록을 지울까요?')) return;
  try {
    await DotoriStorage.deleteMoodEntry(dateStr);
    closeModal();
    await loadAndRenderDiary();
  } catch (e) {
    console.error('Delete mood failed:', e);
    alert('지울 수 없어요: ' + (e.message || ''));
  }
}

// Expose
window.initDiarySidebar = initDiarySidebar;
window.openMoodEditor = openMoodEditor;