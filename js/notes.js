// ============================================
// 도토리숲 — 쪽지 (Notes / Live Conversations)
// ============================================

let activeChatChannel = null;
let activeChatDotoriId = null;

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

// ---------- One conversation (LIVE) ----------

async function openConversation(conv) {
  // Mark received notes as read
  const unreadNotes = conv.notes.filter((n) => n.direction === 'received' && !n.is_read);
  for (const note of unreadNotes) {
    try { await DotoriStorage.markNoteRead(note.id); } catch (e) {}
  }

  // Track active chat
  activeChatDotoriId = conv.dotori_id;

  renderConversationModal(conv);

  // Subscribe to realtime for new messages
  setupLiveChat(conv);
}

function renderConversationModal(conv) {
  const threadHtml = conv.notes.map((note) => renderChatBubble(note)).join('');

  const hasVisitBtn = conv.dotori_id && conv.dotori_id !== getMyDotoriId();

  showModal(`💌 ${conv.nickname}`,
    `<div class="chat-window">
      <div class="chat-header">
        <div class="chat-header-avatar">${conv.mini_me}</div>
        <div class="chat-header-name">${escapeHtml(conv.nickname)}</div>
        <span class="chat-live-dot" title="실시간 연결됨"></span>
        ${hasVisitBtn ? `<button class="small-btn" id="chat-visit-btn" data-dotori="${conv.dotori_id}">방문하기</button>` : ''}
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
      { label: '닫기', onClick: closeActiveChat }
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
        closeActiveChat();
        window.openVisitModal(target);
      }
    });
  }

  // Wire send
  const sendBtn = document.getElementById('chat-send-btn');
  const input = document.getElementById('chat-input');

  const doSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';

    try {
      await DotoriStorage.sendNote(conv.dotori_id, msg);
      // The realtime subscription will append it — no manual append needed.
      // But for instant feedback, we append optimistically:
      appendChatBubble({
        message: msg,
        created_at: new Date().toISOString(),
        direction: 'sent'
      }, true);
    } catch (err) {
      console.error('Send failed:', err);
      alert('쪽지를 보낼 수 없어요: ' + (err.message || ''));
      input.value = msg; // restore on failure
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

function renderChatBubble(note) {
  const mine = note.direction === 'sent';
  return `
    <div class="chat-bubble-row ${mine ? 'mine' : 'theirs'}">
      <div class="chat-bubble ${mine ? 'mine' : 'theirs'}">
        ${escapeHtml(note.message)}
      </div>
      <div class="chat-time">${formatDate(note.created_at)} ${formatTime(note.created_at)}</div>
    </div>
  `;
}

function appendChatBubble(note, isOptimistic) {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderChatBubble(note);
  const newNode = wrapper.firstElementChild;

  // Avoid duplicates: check if a bubble with the same message + time exists
  // For optimistic sends, we mark them with a data attribute that the realtime
  // callback can find and "confirm".
  if (isOptimistic) {
    newNode.dataset.optimistic = 'true';
    newNode.dataset.message = note.message;
  }

  thread.appendChild(newNode);
  thread.scrollTop = thread.scrollHeight;
}

// ---------- Live chat subscription ----------

function setupLiveChat(conv) {
  // Clean up any existing subscription first
  closeLiveChat();

  try {
    activeChatChannel = DotoriStorage.subscribeToNotes(async (newNote) => {
      // Only care about messages that belong to THIS conversation
      if (!activeChatDotoriId) return;

      const me = await DotoriStorage.getProfile();
      if (!me) return;

      const isMine = newNote.sender_id === me.id;
      const otherIdMatches = !isMine;

      // For received: newNote.sender_id should match the person we're chatting with
      // For sent (from another tab): newNote.recipient_id matches them
      if (isMine) {
        // Sent from another tab/device — check recipient
        const recipient = await DotoriStorage.getProfileByDotoriId(activeChatDotoriId);
        if (!recipient || newNote.recipient_id !== recipient.id) return;

        // Look for an optimistic bubble to confirm
        const thread = document.getElementById('chat-thread');
        if (thread) {
          const optimistic = thread.querySelector(`[data-optimistic="true"][data-message="${cssEscape(newNote.message)}"]`);
          if (optimistic) {
            optimistic.removeAttribute('data-optimistic');
            optimistic.removeAttribute('data-message');
            return; // already displayed
          }
        }
        appendChatBubble({ ...newNote, direction: 'sent' });
      } else {
        // Received — check sender
        const sender = await DotoriStorage.getProfileByDotoriId(activeChatDotoriId);
        if (!sender || newNote.sender_id !== sender.id) return;

        appendChatBubble({ ...newNote, direction: 'received' });

        // Mark as read since the chat window is open
        try { await DotoriStorage.markNoteRead(newNote.id); } catch (e) {}
      }

      // Update inbox badge
      try {
        const count = await DotoriStorage.getUnreadCount();
        const inboxCount = document.getElementById('inbox-count');
        if (inboxCount) inboxCount.textContent = count;
      } catch (e) {}
    });
  } catch (e) {
    console.warn('Live chat subscribe failed:', e);
  }
}

function closeLiveChat() {
  if (activeChatChannel) {
    try { activeChatChannel.unsubscribe(); } catch (e) {}
    activeChatChannel = null;
  }
}

function closeActiveChat() {
  closeLiveChat();
  activeChatDotoriId = null;
  closeModal();
}

// ---------- Helpers ----------

function getMyDotoriId() {
  try {
    const raw = localStorage.getItem('dotori_my_id');
    return raw || null;
  } catch (e) {
    return null;
  }
}

function cssEscape(str) {
  return String(str).replace(/"/g, '\\"');
}

// ---------- Export to window (for friends.js) ----------

window.openConversation = openConversation;
window.openInbox = openInbox;
window.renderConversationList = renderConversationList;
window.closeLiveChat = closeLiveChat;