// ============================================
// 도토리숲 — 쪽지 (Notes / Conversations)
// ============================================

// ---------- Inbox: list of conversations ----------

async function openInbox() {
  showModal('쪽지함',
    `<div id="inbox-content">
      <p class="empty-message">불러오는 중...</p>
    </div>`,
    [
      { label: '닫기', onClick: closeModal }
    ]
  );

  await renderConversationList();
}

async function renderConversationList() {
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

  // Group all notes by "the other person" (dotori_id)
  const conversations = {};

  (inbox || []).forEach((note) => {
    const other = note.sender || {};
    const key = other.dotori_id || 'unknown';
    if (!conversations[key]) {
      conversations[key] = {
        dotori_id: other.dotori_id,
        nickname: other.nickname || '익명',
        mini_me: other.mini_me || '🌰',
        notes: [],
        unread: 0,
        lastAt: 0
      };
    }
    conversations[key].notes.push({ ...note, direction: 'received' });
    if (!note.is_read) conversations[key].unread += 1;
    const t = new Date(note.created_at).getTime();
    if (t > conversations[key].lastAt) conversations[key].lastAt = t;
  });

  (sent || []).forEach((note) => {
    const other = note.recipient || {};
    const key = other.dotori_id || 'unknown';
    if (!conversations[key]) {
      conversations[key] = {
        dotori_id: other.dotori_id,
        nickname: other.nickname || '익명',
        mini_me: other.mini_me || '🌰',
        notes: [],
        unread: 0,
        lastAt: 0
      };
    }
    conversations[key].notes.push({ ...note, direction: 'sent' });
    const t = new Date(note.created_at).getTime();
    if (t > conversations[key].lastAt) conversations[key].lastAt = t;
  });

  const list = Object.values(conversations).sort((a, b) => b.lastAt - a.lastAt);

  if (list.length === 0) {
    content.innerHTML = `
      <p class="empty-message">
        아직 쪽지가 없어요.<br>
        <span style="color:#BBB; font-size:11px;">취향 찾기에서 마음이 가는 사람에게 먼저 인사를 건네보세요.</span>
      </p>
    `;
    return;
  }

  content.innerHTML = '';
  list.forEach((conv) => {
    conv.notes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const lastNote = conv.notes[conv.notes.length - 1];
    const preview = (lastNote.message || '').slice(0, 40);
    const isMine = lastNote.direction === 'sent';

    const div = document.createElement('div');
    div.className = 'inbox-conv' + (conv.unread > 0 ? ' unread' : '');
    div.innerHTML = `
      <div class="inbox-conv-avatar">${conv.mini_me}</div>
      <div class="inbox-conv-main">
        <div class="inbox-conv-header">
          <strong>${escapeHtml(conv.nickname)}</strong>
          ${conv.unread > 0 ? `<span class="inbox-conv-badge">${conv.unread}</span>` : ''}
          <span class="inbox-conv-time">${formatTime(lastNote.created_at)}</span>
        </div>
        <div class="inbox-conv-preview">
          ${isMine ? '<span class="inbox-mine-marker">나:</span> ' : ''}${escapeHtml(preview)}${lastNote.message.length > 40 ? '...' : ''}
        </div>
      </div>
    `;

    div.addEventListener('click', () => {
      openConversation(conv);
    });

    content.appendChild(div);
  });
}

// ---------- One conversation ----------

async function openConversation(conv) {
  // Mark all received notes in this conversation as read
  const unreadNotes = conv.notes.filter((n) => n.direction === 'received' && !n.is_read);
  for (const note of unreadNotes) {
    try { await DotoriStorage.markNoteRead(note.id); } catch (e) {}
  }

  const threadHtml = conv.notes.map((note) => {
    const mine = note.direction === 'sent';
    return `
      <div class="chat-bubble-row ${mine ? 'mine' : 'theirs'}">
        <div class="chat-bubble ${mine ? 'mine' : 'theirs'}">
          ${escapeHtml(note.message)}
        </div>
        <div class="chat-time">${formatDate(note.created_at)} ${formatTime(note.created_at)}</div>
      </div>
    `;
  }).join('');

  showModal(`💌 ${conv.nickname}`,
    `<div class="chat-window">
      <div class="chat-header">
        <div class="chat-header-avatar">${conv.mini_me}</div>
        <div class="chat-header-name">${escapeHtml(conv.nickname)}</div>
        ${conv.dotori_id ? `<button class="small-btn" id="chat-visit-btn" data-dotori="${conv.dotori_id}">방문하기</button>` : ''}
      </div>
      <div class="chat-thread" id="chat-thread">
        ${threadHtml}
      </div>
      <div class="chat-compose">
        <textarea id="chat-input" maxlength="300" rows="2"
          placeholder="답장을 남겨보세요..." class="editor-input"></textarea>
        <button id="chat-send-btn" class="small-btn primary">보내기</button>
      </div>
    </div>`,
    [
      { label: '닫기', onClick: closeModal }
    ]
  );

  // Scroll to bottom
  setTimeout(() => {
    const thread = document.getElementById('chat-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;

    const input = document.getElementById('chat-input');
    if (input) input.focus();
  }, 50);

  // Wire visit button
  const visitBtn = document.getElementById('chat-visit-btn');
  if (visitBtn) {
    visitBtn.addEventListener('click', async () => {
      const target = await DotoriStorage.getProfileByDotoriId(visitBtn.dataset.dotori);
      if (target) {
        closeModal();
        window.openVisitModal(target);
      }
    });
  }

  // Wire send button
  const sendBtn = document.getElementById('chat-send-btn');
  const input = document.getElementById('chat-input');

  const doSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;

    try {
      await DotoriStorage.sendNote(conv.dotori_id, msg);

      const thread = document.getElementById('chat-thread');
      const now = new Date().toISOString();
      const row = document.createElement('div');
      row.className = 'chat-bubble-row mine';
      row.innerHTML = `
        <div class="chat-bubble mine">${escapeHtml(msg)}</div>
        <div class="chat-time">${formatDate(now)} ${formatTime(now)}</div>
      `;
      thread.appendChild(row);
      thread.scrollTop = thread.scrollHeight;
      input.value = '';
      input.focus();

      // Refresh unread count in header
      const count = await DotoriStorage.getUnreadCount();
      const inboxCount = document.getElementById('inbox-count');
      if (inboxCount) inboxCount.textContent = count;
    } catch (err) {
      console.error('Send failed:', err);
      alert('쪽지를 보낼 수 없어요: ' + (err.message || ''));
    }
  };

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });
}