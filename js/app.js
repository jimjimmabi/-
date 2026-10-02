// ============================================
// 도토리숲 — Main App (Supabase-ready)
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

      if (target === 'guestbook') renderGuestbookTab();
    });
  });
}

// ---------- Home rendering ----------

async function renderHome(profile) {
  if (!profile) profile = await DotoriStorage.getProfile();
  if (!profile) return;

  const miniMeBox = document.getElementById('mini-me-box');
  if (miniMeBox) {
    miniMeBox.innerHTML = `<span class="mini-me-emoji">${profile.mini_me || '🌰'}</span>`;
    miniMeBox.style.background = profile.mini_me_bg || '#EAF6FF';
  }

  const nameEl = document.getElementById('mini-me-name');
  if (nameEl) nameEl.textContent = profile.nickname;

  const statusEl = document.getElementById('mini-me-status');
  const statusDisplay = document.getElementById('status-display');
  const status = profile.status_message || '오늘도 화이팅 ♡';
  if (statusEl) statusEl.textContent = status;
  if (statusDisplay) statusDisplay.textContent = status;

  const dateEl = document.getElementById('header-date');
  if (dateEl) dateEl.textContent = '2008년 3월 14일';

  const visits = await DotoriStorage.bumpVisit();
  const todayEl = document.getElementById('counter-today');
  const totalEl = document.getElementById('counter-total');
  if (todayEl) todayEl.textContent = visits.todayCount;
  if (totalEl) totalEl.textContent = visits.total;

  await renderGuestbookPreview();

  const room = await DotoriStorage.getRoom();
  const bgmTitle = document.getElementById('bgm-title');
  if (bgmTitle) bgmTitle.textContent = room.bgm_choice || '— 곡을 선택해주세요 —';

  renderTastePreview(profile);
}

function renderTastePreview(profile) {
  const el = document.getElementById('taste-preview');
  if (!el) return;

  const t = profile.tastes || {};
  const hasAny = (t.interests && t.interests.length) +
                 (t.music && t.music.length) +
                 (t.mood && t.mood.length) +
                 (t.favorites ? 1 : 0) +
                 (t.needs ? 1 : 0);

  if (!hasAny) {
    el.innerHTML = `<p class="taste-preview-text">아직 취향을 입력하지 않았어요.<br>당신을 소개해주세요.</p>`;
    return;
  }

  const parts = [];
  if (t.interests && t.interests.length) parts.push(t.interests.slice(0, 3).join(' · '));
  if (t.music && t.music.length) parts.push(t.music.slice(0, 2).join(' · '));
  if (t.mood && t.mood.length) parts.push(t.mood.slice(0, 2).join(' · '));

  el.innerHTML = `
    <p class="taste-preview-text">${parts.join('<br>')}</p>
    ${t.needs ? `<p class="taste-needs">"${escapeHtml(t.needs)}"</p>` : ''}
  `;
}

async function renderGuestbookPreview(ownerDotoriId) {
  const preview = document.getElementById('guestbook-preview');
  if (!preview) return;

  let entries = [];
  try {
    entries = await DotoriStorage.getGuestbook(ownerDotoriId);
  } catch (e) {
    console.warn('Guestbook load failed:', e);
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    preview.innerHTML = '<p class="empty-message">아직 방명록이 비어있어요.</p>';
    return;
  }

  preview.innerHTML = '';
  entries.slice(0, 3).forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'guestbook-entry-mini';
    div.innerHTML = `
      <strong>${escapeHtml(entry.author_name || '익명')}</strong>
      <span class="time">${formatTime(entry.created_at)}</span>
      <div class="msg">${entry.is_secret ? '🔒 비밀글입니다' : escapeHtml(entry.message)}</div>
      ${entry.reply ? `<div class="reply">↳ ${escapeHtml(entry.reply)}</div>` : ''}
    `;
    preview.appendChild(div);
  });
}

async function renderGuestbookTab(ownerDotoriId) {
  const container = document.querySelector('#tab-guestbook .placeholder-panel');
  if (!container) return;

  let entries = [];
  try {
    entries = await DotoriStorage.getGuestbook(ownerDotoriId);
  } catch (e) {
    console.warn('Guestbook tab load failed:', e);
  }

  container.innerHTML = `
    <h2>방명록</h2>
    <button id="guestbook-write-btn-full" class="small-btn" style="margin:10px 0;">방명록 남기기</button>
    <div id="guestbook-full-list" style="text-align:left;"></div>
  `;

  const list = document.getElementById('guestbook-full-list');
  if (!Array.isArray(entries) || entries.length === 0) {
    list.innerHTML = '<p class="empty-message">아직 방명록이 비어있어요.</p>';
  } else {
    entries.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'guestbook-entry-mini';
      div.style.padding = '10px 0';
      div.style.borderBottom = '1px solid #EEE';
      div.innerHTML = `
        <strong>${escapeHtml(entry.author_name || '익명')}</strong>
        <span class="time">${formatDate(entry.created_at)}</span>
        <div class="msg">${entry.is_secret ? '🔒 비밀글입니다' : escapeHtml(entry.message)}</div>
        ${entry.reply ? `<div class="reply">↳ ${escapeHtml(entry.reply)}</div>` : ''}
      `;
      list.appendChild(div);
    });
  }

  const writeBtn = document.getElementById('guestbook-write-btn-full');
  if (writeBtn) writeBtn.addEventListener('click', () => openGuestbookWriter(ownerDotoriId));
}

// ---------- Status editing ----------

function initStatusEdit() {
  const editBtn = document.getElementById('status-edit-btn');
  if (!editBtn) return;

  editBtn.addEventListener('click', async () => {
    const profile = await DotoriStorage.getProfile();
    const current = profile.status_message || '';

    showModal('상태 메시지 수정',
      `<input type="text" id="status-input" maxlength="40" value="${escapeHtml(current)}"
        class="editor-input">`,
      [
        { label: '취소', onClick: closeModal },
        { label: '저장', primary: true, onClick: async () => {
          const input = document.getElementById('status-input');
          const value = input.value.trim() || '오늘도 화이팅 ♡';
          await DotoriStorage.updateProfile({ status_message: value });
          closeModal();
          const updated = await DotoriStorage.getProfile();
          await renderHome(updated);
        }}
      ]
    );

    setTimeout(() => {
      const input = document.getElementById('status-input');
      if (input) input.focus();
    }, 50);
  });
}

// ---------- Header buttons ----------

function initHeaderButtons() {
  const profileEditBtn = document.getElementById('profile-edit-btn');
  if (profileEditBtn) profileEditBtn.addEventListener('click', openProfileEditor);

  const tasteEditBtn = document.getElementById('taste-edit-btn');
  if (tasteEditBtn) tasteEditBtn.addEventListener('click', openTasteEditor);

  const guestbookWriteBtn = document.getElementById('guestbook-write-btn');
  if (guestbookWriteBtn) guestbookWriteBtn.addEventListener('click', () => openGuestbookWriter());

  const settingsLink = document.getElementById('settings-link');
  if (settingsLink) settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });

  const inboxLink = document.getElementById('inbox-link');
  if (inboxLink) inboxLink.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('쪽지함', '쪽지 기능은 Weekend 9에서 추가됩니다.', [
      { label: '확인', primary: true, onClick: closeModal }
    ]);
  });
}

// ---------- BGM ----------

function initBGM() {
  const playBtn = document.getElementById('bgm-play-btn');
  const selectBtn = document.getElementById('bgm-select-btn');

  if (playBtn) playBtn.addEventListener('click', () => {
    showModal('BGM', 'BGM 기능은 Weekend 3 후반에 추가됩니다.', [
      { label: '확인', primary: true, onClick: closeModal }
    ]);
  });

  if (selectBtn) selectBtn.addEventListener('click', () => {
    showModal('BGM 설정', 'BGM 목록은 Weekend 3 후반에 추가됩니다.', [
      { label: '확인', primary: true, onClick: closeModal }
    ]);
  });
}

// ---------- Time Capsule ----------

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
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

// ---------- Init (my page) ----------

function initApp(profile) {
  initTabs();
  renderHome(profile);
  initStatusEdit();
  initBGM();
  initHeaderButtons();
  initTimeCapsule();
}

// ---------- Init (visiting someone else's page) ----------

async function initVisitMode(profile) {
  initTabs();
  initBGM();
  initTimeCapsule();

  // Show their profile
  const miniMeBox = document.getElementById('mini-me-box');
  if (miniMeBox) {
    miniMeBox.innerHTML = `<span class="mini-me-emoji">${profile.mini_me || '🌰'}</span>`;
    miniMeBox.style.background = profile.mini_me_bg || '#EAF6FF';
  }

  const nameEl = document.getElementById('mini-me-name');
  if (nameEl) nameEl.textContent = profile.nickname;

  const statusEl = document.getElementById('mini-me-status');
  const statusDisplay = document.getElementById('status-display');
  const status = profile.status_message || '';
  if (statusEl) statusEl.textContent = status;
  if (statusDisplay) statusDisplay.textContent = status;

  renderTastePreview(profile);
  await renderGuestbookPreview(profile.dotori_id);

  // Hide edit buttons
  const profileEditBtn = document.getElementById('profile-edit-btn');
  if (profileEditBtn) profileEditBtn.style.display = 'none';

  const statusEditBtn = document.getElementById('status-edit-btn');
  if (statusEditBtn) statusEditBtn.style.display = 'none';

  const tasteEditBtn = document.getElementById('taste-edit-btn');
  if (tasteEditBtn) tasteEditBtn.style.display = 'none';

  const tasteGoBtn = document.getElementById('taste-go-btn');
  if (tasteGoBtn) tasteGoBtn.style.display = 'none';

  // Show a "visiting" banner at the top
  const headerTop = document.querySelector('.header-top');
  if (headerTop && !document.getElementById('visit-banner')) {
    const banner = document.createElement('div');
    banner.id = 'visit-banner';
    banner.className = 'visit-banner';
    banner.innerHTML = `
      <span>${escapeHtml(profile.nickname)}님의 숲을 보고 있어요</span>
           <button id="return-btn" class="small-btn">내 숲으로 돌아가기</button>
    `;
    headerTop.appendChild(banner);
        document.getElementById('return-btn').addEventListener('click', async () => {
      // If we have our own acorn, reload will take us there (initAuth checks dotori_my_id first)
      const myAcorn = await DotoriStorage.getMyAcorn();
      if (myAcorn) {
        location.reload();
      } else {
        // No acorn of our own on this browser — clear visit state and go to welcome
        if (confirm('이 브라우저에는 당신의 도토리가 없어요. 처음 화면으로 돌아갈까요?')) {
          localStorage.removeItem('dotori_session');
          localStorage.removeItem('dotori_visits');
          // Note: we keep dotori_my_id in case they get it later
          location.reload();
        }
      }
    });
  }

  // Wire up the guestbook writer for THIS profile
  const guestbookWriteBtn = document.getElementById('guestbook-write-btn');
  if (guestbookWriteBtn) {
    const newBtn = guestbookWriteBtn.cloneNode(true);
    guestbookWriteBtn.parentNode.replaceChild(newBtn, guestbookWriteBtn);
    newBtn.addEventListener('click', () => openGuestbookWriter(profile.dotori_id));
  }

  initVisitTabs(profile);
}

function initVisitTabs(profile) {
  const tabs = document.querySelectorAll('.site-tabs .tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const target = tab.dataset.tab;
      if (target === 'guestbook') {
        renderGuestbookTab(profile.dotori_id);
      }
    });
  });
}

// ---------- Boot ----------

window.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

window.initApp = initApp;
window.initVisitMode = initVisitMode;
window.showModal = showModal;
window.closeModal = closeModal;
window.renderHome = renderHome;
window.escapeHtml = escapeHtml;
