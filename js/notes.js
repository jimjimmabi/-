// ============================================
// 도토리숲 — 쪽지 (Notes / Inbox)
// ============================================

// ---------- Inbox (received notes) ----------

async function openInbox() {
  showModal('쪽지함',
    `<div id="inbox-content">
      <p class="empty-message">불러오는 중...</p>
    </div>`,
    [
      { label: '닫기', onClick: closeModal }
    ]
  );

  await renderInboxContent();
}

async function renderInboxContent() {
  const content = document.getElementById('inbox-content');
  if (!content) return;

  let inbox = [];
  let sent = [];

  try {
    inbox = await DotoriStorage.getInbox();
    sent = await DotoriStorage.getSentNotes();
  } catch (err) {
    console.error('Inbox load failed:', err);
    content.innerHTML = '<p class="empty-message">쪽지를 불러올 수 없어요.</p>';
    return;
  }

  const hasInbox = Array.isArray(inbox) && inbox.length > 0;
  const hasSent = Array.isArray(sent) && sent.length > 0;

  content.innerHTML = `
    <div class="inbox-tabs">
      <button class="inbox-tab active" data-inbox-tab="received">받은 쪽지 ${hasInbox ? `(${inbox.length})` : ''}</button>
      <button class="inbox-tab" data-inbox-tab="sent">보낸 쪽지 ${hasSent ? `(${sent.length})` : ''}</button>
    </div>

    <div id="inbox-received" class="inbox-list">
      ${hasInbox ? '' : '<p class="empty-message">아직 받은 쪽지가 없어요.<br><span style="color:#BBB; font-size:11px;">취향 찾기에서 마음이 가는 사람에게 먼저 인사를 건네보세요.</span></p>'}
    </div>

    <div id="inbox-sent" class="inbox-list hidden">
      ${hasSent ? '' : '<p class="empty-message">아직 보낸 쪽지가 없어요.</p>'}
    </div>
  `;

  // Render received
  const receivedList = document.getElementById('inbox-received');
  if (hasInbox) {
    inbox.forEach((note) => {
      receivedList.appendChild(renderReceivedNote(note));
    });
  }

  // Render sent
  const sentList = document.getElementById('inbox-sent');
  if (hasSent) {
    sent.forEach((note) => {
      sentList.appendChild(renderSentNote(note));
    });
  }

  // Wire tab switching
  document.querySelectorAll('.inbox-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inbox-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.inboxTab;
      document.getElementById('inbox-received').classList.toggle('hidden', target !== 'received');
      document.getElementById('inbox-sent').classList.toggle('hidden', target !== 'sent');
    });
  });
}

function renderReceivedNote(note) {
  const div = document.createElement('div');
  div.className = 'inbox-note' + (note.is_read ? '' : ' unread');

  const sender = note.sender || { nickname: '익명', mini_me: '🌰', dotori_id: null };

  div.innerHTML = `
    <div class="inbox-note-header">
      <span class="inbox-note-from">
        ${sender.mini_me || '🌰'} <strong>${escapeHtml(sender.nickname)}</strong>
      </span>
      <span class="inbox-note-time">${formatTime(note.created_at)}</span>
    </div>
    <div class="inbox-note-body">
      <p class="inbox-note-message">${escapeHtml(note.message)}</p>
    </div>
    <div class="inbox-note-actions">
      ${sender.dotori_id ? `<button class="small-btn reply-btn" data-dotori="${sender.dotori_id}" data-nickname="${escapeHtml(sender.nickname)}">답장</button>` : ''}
      ${sender.dotori_id ? `<button class="small-btn visit-btn" data-dotori="${sender.dotori_id}">방문</button>` : ''}
    </div>
  `;

  // Mark as read when opened
  if (!note.is_read) {
    DotoriStorage.markNoteRead(note.id).then(() => {
      DotoriStorage.getUnreadCount().then((count) => {
        const inboxCount = document.getElementById('inbox-count');
        if (inboxCount) inboxCount.textContent = count;
      });
    });
  }

  // Wire reply
  const replyBtn = div.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      closeModal();
      openNoteWriter(replyBtn.dataset.dotori, replyBtn.dataset.nickname);
    });
  }

  // Wire visit
  const visitBtn = div.querySelector('.visit-btn');
  if (visitBtn) {
    visitBtn.addEventListener('click', async () => {
      const target = await DotoriStorage.getProfileByDotoriId(visitBtn.dataset.dotori);
      if (target) {
        closeModal();
        const homeTab = document.querySelector('.site-tabs .tab[data-tab="home"]');
        if (homeTab) homeTab.click();
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('main-site').classList.remove('hidden');
        window.initVisitMode(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  return div;
}

function renderSentNote(note) {
  const div = document.createElement('div');
  div.className = 'inbox-note sent';

  const recipient = note.recipient || { nickname: '익명', mini_me: '🌰', dotori_id: null };

  div.innerHTML = `
    <div class="inbox-note-header">
      <span class="inbox-note-from">
        To. ${recipient.mini_me || '🌰'} <strong>${escapeHtml(recipient.nickname)}</strong>
      </span>
      <span class="inbox-note-time">${formatTime(note.created_at)}</span>
    </div>
    <div class="inbox-note-body">
      <p class="inbox-note-message">${escapeHtml(note.message)}</p>
    </div>
    <div class="inbox-note-actions">
      ${recipient.dotori_id ? `<button class="small-btn visit-btn" data-dotori="${recipient.dotori_id}">방문</button>` : ''}
    </div>
  `;

  const visitBtn = div.querySelector('.visit-btn');
  if (visitBtn) {
    visitBtn.addEventListener('click', async () => {
      const target = await DotoriStorage.getProfileByDotoriId(visitBtn.dataset.dotori);
      if (target) {
        closeModal();
        const homeTab = document.querySelector('.site-tabs .tab[data-tab="home"]');
        if (homeTab) homeTab.click();
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('main-site').classList.remove('hidden');
        window.initVisitMode(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  return div;
}