// ============================================
// 도토리숲 — Main App
// ============================================

// ---------- Modal ----------

function showModal(title, bodyHtml, buttons) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close');

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footerEl.innerHTML = '';

  buttons.forEach((btn) => {
    const el = document.createElement('button');
    el.textContent = btn.label;
    el.className = btn.primary ? 'small-btn primary' : 'small-btn';
    el.style.marginLeft = '6px';
    el.addEventListener('click', btn.onClick);
    footerEl.appendChild(el);
  });

  closeBtn.onclick = closeModal;
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ---------- Tab switching ----------

function initTabs() {
  const tabs = document.querySelectorAll('.site-tabs .tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      const targetEl = document.getElementById('tab-' + target);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

// ---------- Home rendering ----------

function renderHome(profile) {
  // Nickname
  const nameEl = document.getElementById('mini-me-name');
  if (nameEl) nameEl.textContent = profile.nickname;

  // Status
  const statusEl = document.getElementById('mini-me-status');
  const statusDisplay = document.getElementById('status-display');
  if (statusEl) statusEl.textContent = profile.status_message || '';
  if (statusDisplay) statusDisplay.textContent = profile.status_message || '';

  // Date (fixed at 2008 for now)
  const dateEl = document.getElementById('header-date');
  if (dateEl) dateEl.textContent = '2008년 3월 14일';

  // Counters (start at 1 for the user's own visit)
  const todayEl = document.getElementById('counter-today');
  const totalEl = document.getElementById('counter-total');
  if (todayEl) todayEl.textContent = '1';
  if (totalEl) totalEl.textContent = '1';

  // Guestbook preview
  renderGuestbookPreview();

  // BGM title
  const room = DotoriStorage.getRoom();
  const bgmTitle = document.getElementById('bgm-title');
  if (bgmTitle) {
    bgmTitle.textContent = room.bgm_choice || '— 곡을 선택해주세요 —';
  }
}

function renderGuestbookPreview() {
  const preview = document.getElementById('guestbook-preview');
  if (!preview) return;

  const entries = DotoriStorage.getGuestbook();

  if (entries.length === 0) {
    preview.innerHTML = '<p class="empty-message">아직 방명록이 비어있어요.</p>';
    return;
  }

  preview.innerHTML = '';
  entries.slice(0, 3).forEach((entry) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:6px 0; border-bottom:1px solid #F0F0F0; font-size:11px;';
    div.innerHTML = `
      <strong style="color:#8B5E2E;">${entry.author_name || '익명'}</strong>
      <span style="color:#CCC; font-size:10px; margin-left:4px;">${formatTime(entry.created_at)}</span>
      <div style="margin-top:2px; color:#555;">${entry.is_secret ? '🔒 비밀글입니다' : escapeHtml(entry.message)}</div>
    `;
    preview.appendChild(div);
  });
}

// ---------- Status editing ----------

function initStatusEdit() {
  const editBtn = document.getElementById('status-edit-btn');
  if (!editBtn) return;

  editBtn.addEventListener('click', () => {
    const profile = DotoriStorage.getProfile();
    const current = profile.status_message || '';

    showModal('상태 메시지 수정',
      `<input type="text" id="status-input" maxlength="40" value="${escapeHtml(current)}"
        style="width:100%; padding:8px; border:1px solid #CCC; border-radius:3px; font-size:12px; background:#FFF8F0;">`,
      [
        { label: '취소', onClick: closeModal },
        { label: '저장', primary: true, onClick: () => {
          const input = document.getElementById('status-input');
          const value = input.value.trim() || '오늘도 화이팅 ♡';
          DotoriStorage.updateProfile({ status_message: value });
          closeModal();
          renderHome(DotoriStorage.getProfile());
        }}
      ]
    );

    // Focus input after modal opens
    setTimeout(() => {
      const input = document.getElementById('status-input');
      if (input) input.focus();
    }, 50);
  });
}

// ---------- BGM (placeholder for now) ----------

function initBGM() {
  const playBtn = document.getElementById('bgm-play-btn');
  const selectBtn = document.getElementById('bgm-select-btn');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      showModal('BGM', '아직 BGM이 준비되지 않았어요.<br><span style="color:#888; font-size:11px;">Weekend 3에서 추가됩니다.</span>', [
        { label: '확인', primary: true, onClick: closeModal }
      ]);
    });
  }

  if (selectBtn) {
    selectBtn.addEventListener('click', () => {
      showModal('BGM 설정', 'BGM 목록은 Weekend 3에서 추가됩니다.', [
        { label: '확인', primary: true, onClick: closeModal }
      ]);
    });
  }
}

// ---------- Inbox (placeholder) ----------

function initInbox() {
  const inboxLink = document.getElementById('inbox-link');
  if (!inboxLink) return;

  inboxLink.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('쪽지함', '쪽지 기능은 Weekend 9에서 추가됩니다.', [
      { label: '확인', primary: true, onClick: closeModal }
    ]);
  });
}

// ---------- Settings (placeholder) ----------

function initSettings() {
  const settingsLink = document.getElementById('settings-link');
  if (!settingsLink) return;

  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    const profile = DotoriStorage.getProfile();

    showModal('설정',
      `<div style="font-size:12px; line-height:1.8;">
        <strong>닉네임:</strong> ${escapeHtml(profile.nickname)}<br>
        <strong>도토리 ID:</strong> <code style="background:#FFF8F0; padding:2px 6px; border-radius:2px;">${profile.dotori_id}</code><br>
        <span style="color:#888; font-size:11px;">이 ID를 저장해두면 다른 기기에서 불러올 수 있어요.</span>
      </div>`,
      [
        { label: '도토리 내보내기', onClick: () => {
          const data = DotoriStorage.exportAcorn();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = profile.dotori_id + '.dotori';
          a.click();
          URL.revokeObjectURL(url);
        }},
        { label: '확인', primary: true, onClick: closeModal }
      ]
    );
  });
}

// ---------- Time Capsule (placeholder) ----------

function initTimeCapsule() {
  const link = document.getElementById('time-capsule-link');
  if (!link) return;

  link.addEventListener('click', () => {
    showModal('📼 저장된 시간',
      `이 페이지는 2008년 3월 14일에 저장되었습니다.<br><br>
      <span style="color:#888; font-size:11px;">시간 여행 기능은 Weekend 5에서 완성됩니다.</span>`,
      [{ label: '확인', primary: true, onClick: closeModal }]
    );
  });
}

// ---------- Utilities ----------

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

// ---------- Main init ----------

function initApp(profile) {
  initTabs();
  renderHome(profile);
  initStatusEdit();
  initBGM();
  initInbox();
  initSettings();
  initTimeCapsule();
}

// ---------- Boot ----------

window.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

window.initApp = initApp;