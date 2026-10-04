// ============================================
// 도토리숲 — 쪽지 (Notes / Live Conversations)
// ============================================

let activeChatChannel = null;
let activeReactionChannel = null;
let activeChatDotoriId = null;
let activeChatName = null;
let activeChatNotes = [];
let activeReplyTo = null;
let activeIsFriend = false;

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
        mini_me_image_url: other.mini_me_image_url || null,
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
      <div class="inbox-conv-avatar">
        ${conv.mini_me_image_url
          ? `<img src="${conv.mini_me_image_url}" alt="" class="mini-me-image">`
          : conv.mini_me}
      </div>
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

// ---------- Open a conversation ----------

async function openConversation(conv) {
  // Mark received notes as read
  const unreadNotes = conv.notes.filter((n) => n.direction === 'received' && !n.is_read);
  for (const note of unreadNotes) {
    try { await DotoriStorage.markNoteRead(note.id); } catch (e) {}
  }

  // Track active chat
  activeChatDotoriId = conv.dotori_id;
  activeChatName = conv.nickname;
  activeReplyTo = null;

  // Check if this is a friend
  try {
    activeIsFriend = await DotoriStorage.isIlchon(conv.dotori_id);
  } catch (e) {
    activeIsFriend = false;
  }

  // Load existing reactions
  const noteIds = conv.notes.map((n) => n.id);
  let reactionsByNote = {};
  try {
    reactionsByNote = await DotoriStorage.getReactionsForNotes(noteIds);
  } catch (e) {}

  // Attach reactions to notes
  conv.notes = conv.notes.map((n) => ({
    ...n,
    reactions: reactionsByNote[n.id] || []
  }));

  activeChatNotes = conv.notes;

  renderConversationModal(conv);

  // Live subscriptions
  setupLiveChat(conv);
  setupLiveReactions(conv);
}

// ---------- Render the chat modal ----------

function renderConversationModal(conv) {
  const threadHtml = conv.notes.map((note) => renderChatBubble(note)).join('');

  const hasVisitBtn = conv.dotori_id && conv.dotori_id !== getMyDotoriId();

  const friendBadgeHtml = activeIsFriend
    ? `<span class="chat-friend-badge" title="일촌">🌰 일촌</span>`
    : '';

  const headerClass = activeIsFriend ? 'chat-header chat-header-friend' : 'chat-header';

  showModal(`💌 ${conv.nickname}`,
    `<div class="chat-window">
      <div class="${headerClass}">
        <div class="chat-header-avatar"${activeIsFriend ? ' data-friend="1"' : ''}>
          ${conv.mini_me_image_url
            ? `<img src="${conv.mini_me_image_url}" alt="" class="mini-me-image">`
            : conv.mini_me}
        </div>
        <div class="chat-header-name">
          ${escapeHtml(conv.nickname)}
          ${friendBadgeHtml}
        </div>
        <span class="chat-live-dot" title="실시간 연결됨"></span>
        ${hasVisitBtn ? `<button class="small-btn" id="chat-visit-btn" data-dotori="${conv.dotori_id}">방문하기</button>` : ''}
      </div>
      <div class="chat-thread" id="chat-thread">
        ${threadHtml}
      </div>
      <div class="chat-reply-preview hidden" id="chat-reply-preview">
        <div class="chat-reply-preview-inner">
          <span class="chat-reply-label">↩ 답장</span>
          <span class="chat-reply-text" id="chat-reply-text"></span>
          <button class="chat-reply-cancel" id="chat-reply-cancel" aria-label="취소">✕</button>
        </div>
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

  // Scroll to bottom + wire up reply/react buttons on existing bubbles
  setTimeout(() => {
    const thread = document.getElementById('chat-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;

    const input = document.getElementById('chat-input');
    if (input) input.focus();

    wireAllBubbles();
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

  // Wire reply cancel
  const replyCancel = document.getElementById('chat-reply-cancel');
  if (replyCancel) {
    replyCancel.addEventListener('click', cancelReply);
  }

  // Wire send
  const sendBtn = document.getElementById('chat-send-btn');
  const input = document.getElementById('chat-input');

  const doSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;

    const replyToId = activeReplyTo ? activeReplyTo.id : null;

    input.value = '';
    cancelReply();

    try {
      const saved = await DotoriStorage.sendNote(conv.dotori_id, msg, replyToId);
      appendChatBubble({
        id: saved ? saved.id : null,
        message: msg,
        created_at: new Date().toISOString(),
        direction: 'sent',
        reply_to_id: replyToId,
        reactions: []
      }, true);
    } catch (err) {
      console.error('Send failed:', err);
      alert('쪽지를 보낼 수 없어요: ' + (err.message || ''));
      input.value = msg;
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

// ---------- Chat bubble ----------

function renderChatBubble(note) {
  const mine = note.direction === 'sent';

  // Reply quote — prominent
  let replyQuoteHtml = '';
  if (note.reply_to_id) {
    const parent = activeChatNotes.find((n) => n.id === note.reply_to_id);
    if (parent) {
      const parentAuthor = parent.direction === 'sent' ? '나' : (activeChatName || '상대');
      replyQuoteHtml = `
        <div class="chat-reply-quote ${mine ? 'mine' : 'theirs'}">
          <span class="chat-reply-quote-icon">↩</span>
          <div class="chat-reply-quote-content">
            <span class="chat-reply-quote-author">${escapeHtml(parentAuthor)}</span>
            <span class="chat-reply-quote-text">${escapeHtml(truncate(parent.message, 60))}</span>
          </div>
        </div>
      `;
    }
  }

  const reactionsHtml = renderReactionsBar(note);

  const replyBtnHtml = `
    <button class="chat-action-btn chat-reply-btn" data-note-id="${note.id}" title="답장">↩</button>
  `;

  // Author label above every bubble
  const authorLabelHtml = mine
    ? `<div class="chat-author-label chat-author-mine">나</div>`
    : `<div class="chat-author-label chat-author-theirs">${escapeHtml(activeChatName || '상대')}</div>`;

  return `
    <div class="chat-bubble-row ${mine ? 'mine' : 'theirs'}" data-note-id="${note.id}">
      ${authorLabelHtml}
      ${replyQuoteHtml}
      <div class="chat-bubble-wrap">
        <div class="chat-bubble ${mine ? 'mine' : 'theirs'}">
          ${escapeHtml(note.message)}
        </div>
        <div class="chat-bubble-actions">
          ${replyBtnHtml}
          <button class="chat-action-btn chat-react-btn" data-note-id="${note.id}" title="반응">😊</button>
        </div>
      </div>
      <div class="chat-time">${formatDate(note.created_at)} ${formatTime(note.created_at)}</div>
      ${reactionsHtml}
    </div>
  `;
}

function renderReactionsBar(note) {
  if (!note.id) return '';

  const reactions = note.reactions || [];
  const myUserId = getMyUserId();

  const grouped = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r);
  });

  const emojis = Object.keys(grouped);
  if (emojis.length === 0) return '';

  const chips = emojis.map((emoji) => {
    const users = grouped[emoji];
    const iAmIn = users.some((u) => u.user_id === myUserId);
    return `<button class="chat-reaction-chip ${iAmIn ? 'mine' : ''}" data-note-id="${note.id}" data-emoji="${emoji}">
      <span class="reaction-emoji">${emoji}</span>
      <span class="reaction-count">${users.length}</span>
    </button>`;
  }).join('');

  return `<div class="chat-reactions-bar">${chips}</div>`;
}

function appendChatBubble(note, isOptimistic) {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderChatBubble(note);
  const newNode = wrapper.firstElementChild;

  if (isOptimistic) {
    newNode.dataset.optimistic = 'true';
    newNode.dataset.message = note.message;
    if (!note.id) {
      const tempId = 'temp-' + Date.now();
      newNode.dataset.noteId = tempId;
      note.id = tempId;
    }
  }

  thread.appendChild(newNode);
  thread.scrollTop = thread.scrollHeight;

  wireBubbleActions(newNode);
}

// ---------- Wire bubble actions (reply, react) ----------

function wireBubbleActions(bubbleNode) {
  const replyBtn = bubbleNode.querySelector('.chat-reply-btn');
  if (replyBtn && !replyBtn.dataset.wired) {
    replyBtn.dataset.wired = '1';
    replyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const noteId = replyBtn.dataset.noteId;
      const note = activeChatNotes.find((n) => n.id === noteId);
      if (note) startReply(note);
    });
  }

  const reactBtn = bubbleNode.querySelector('.chat-react-btn');
  if (reactBtn && !reactBtn.dataset.wired) {
    reactBtn.dataset.wired = '1';
    reactBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const noteId = reactBtn.dataset.noteId;
      openReactionPicker(e, noteId);
    });
  }

  bubbleNode.querySelectorAll('.chat-reaction-chip').forEach((chip) => {
    if (chip.dataset.wired) return;
    chip.dataset.wired = '1';
    chip.addEventListener('click', async (e) => {
      e.stopPropagation();
      const noteId = chip.dataset.noteId;
      const emoji = chip.dataset.emoji;
      await handleReactionToggle(noteId, emoji);
    });
  });
}

function wireAllBubbles() {
  document.querySelectorAll('.chat-bubble-row').forEach((node) => {
    wireBubbleActions(node);
  });
}

// ---------- Reply ----------

function startReply(note) {
  activeReplyTo = note;
  const preview = document.getElementById('chat-reply-preview');
  const text = document.getElementById('chat-reply-text');
  const input = document.getElementById('chat-input');

  if (preview && text) {
    preview.classList.remove('hidden');
    text.textContent = truncate(note.message, 60);
  }
  if (input) input.focus();
}

function cancelReply() {
  activeReplyTo = null;
  const preview = document.getElementById('chat-reply-preview');
  if (preview) preview.classList.add('hidden');
}

// ---------- Reaction picker ----------

function openReactionPicker(event, noteId) {
  event.stopPropagation();
  event.preventDefault();

  document.querySelectorAll('.reaction-picker').forEach((p) => p.remove());

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.innerHTML = DotoriStorage.REACTION_EMOJIS.map((emoji) =>
    `<button class="reaction-picker-btn" data-emoji="${emoji}">${emoji}</button>`
  ).join('');

  const rect = event.currentTarget.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = `${Math.max(10, rect.left - 80)}px`;
  picker.style.top = `${Math.max(10, rect.top - 46)}px`;

  document.body.appendChild(picker);

  picker.querySelectorAll('.reaction-picker-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const emoji = btn.dataset.emoji;
      picker.remove();
      await handleReactionToggle(noteId, emoji);
    });
  });

  setTimeout(() => {
    const closeHandler = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);
  }, 0);
}

// ---------- Reaction toggle ----------

async function handleReactionToggle(noteId, emoji) {
  if (typeof noteId === 'string' && noteId.startsWith('temp-')) return;

  try {
    await DotoriStorage.toggleReaction(noteId, emoji);
    await refreshReactionsForNote(noteId);
  } catch (err) {
    console.error('Reaction toggle failed:', err);
  }
}

async function refreshReactionsForNote(noteId) {
  try {
    const grouped = await DotoriStorage.getReactionsForNotes([noteId]);
    const reactions = grouped[noteId] || [];
    const note = activeChatNotes.find((n) => n.id === noteId);
    if (note) note.reactions = reactions;
    updateBubbleReactions(noteId, reactions);
  } catch (e) {
    console.warn('Refresh reactions failed:', e);
  }
}

function updateBubbleReactions(noteId, reactions) {
  const row = document.querySelector(`.chat-bubble-row[data-note-id="${noteId}"]`);
  if (!row) return;

  const oldBar = row.querySelector('.chat-reactions-bar');
  if (oldBar) oldBar.remove();

  const fake = { id: noteId, reactions };
  const html = renderReactionsBar(fake);

  if (html) {
    row.insertAdjacentHTML('beforeend', html);
    row.querySelectorAll('.chat-reaction-chip').forEach((chip) => {
      if (chip.dataset.wired) return;
      chip.dataset.wired = '1';
      chip.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleReactionToggle(chip.dataset.noteId, chip.dataset.emoji);
      });
    });
  }
}

// ---------- Live chat subscription ----------

function setupLiveChat(conv) {
  closeLiveChat();

  try {
    activeChatChannel = DotoriStorage.subscribeToNotes(async (newNote) => {
      if (!activeChatDotoriId) return;

      const me = await DotoriStorage.getProfile();
      if (!me) return;

      const isMine = newNote.sender_id === me.id;

      if (isMine) {
        const recipient = await DotoriStorage.getProfileByDotoriId(activeChatDotoriId);
        if (!recipient || newNote.recipient_id !== recipient.id) return;

        const thread = document.getElementById('chat-thread');
        if (thread) {
          const optimistic = thread.querySelector(`[data-optimistic="true"][data-message="${cssEscape(newNote.message)}"]`);
          if (optimistic) {
            optimistic.removeAttribute('data-optimistic');
            optimistic.removeAttribute('data-message');
            if (newNote.id) {
              optimistic.dataset.noteId = newNote.id;
              const replyBtn = optimistic.querySelector('.chat-reply-btn');
              const reactBtn = optimistic.querySelector('.chat-react-btn');
              if (replyBtn) replyBtn.dataset.noteId = newNote.id;
              if (reactBtn) reactBtn.dataset.noteId = newNote.id;

              const existing = activeChatNotes.find((n) => n.id === newNote.id);
              if (!existing) {
                activeChatNotes.push({
                  ...newNote,
                  direction: 'sent',
                  reactions: []
                });
              }
            }
            return;
          }
        }

        const noteWithReactions = { ...newNote, direction: 'sent', reactions: [] };
        activeChatNotes.push(noteWithReactions);
        appendChatBubble(noteWithReactions);
      } else {
        const sender = await DotoriStorage.getProfileByDotoriId(activeChatDotoriId);
        if (!sender || newNote.sender_id !== sender.id) return;

        const noteWithReactions = { ...newNote, direction: 'received', reactions: [] };
        activeChatNotes.push(noteWithReactions);
        appendChatBubble(noteWithReactions);

        try { await DotoriStorage.markNoteRead(newNote.id); } catch (e) {}
      }

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

function setupLiveReactions(conv) {
  if (activeReactionChannel) {
    try { activeReactionChannel.unsubscribe(); } catch (e) {}
    activeReactionChannel = null;
  }

  try {
    activeReactionChannel = DotoriStorage.subscribeToReactions(async (payload) => {
      const row = payload.new || payload.old;
      if (!row || !row.note_id) return;

      const note = activeChatNotes.find((n) => n.id === row.note_id);
      if (!note) return;

      await refreshReactionsForNote(row.note_id);
    });
  } catch (e) {
    console.warn('Live reactions subscribe failed:', e);
  }
}

function closeLiveChat() {
  if (activeChatChannel) {
    try { activeChatChannel.unsubscribe(); } catch (e) {}
    activeChatChannel = null;
  }
  if (activeReactionChannel) {
    try { activeReactionChannel.unsubscribe(); } catch (e) {}
    activeReactionChannel = null;
  }
}

function closeActiveChat() {
  closeLiveChat();
  activeChatDotoriId = null;
  activeChatName = null;
  activeChatNotes = [];
  activeReplyTo = null;
  activeIsFriend = false;
  closeModal();
}

// ---------- Helpers ----------

function getMyDotoriId() {
  try {
    return localStorage.getItem('dotori_my_id') || null;
  } catch (e) {
    return null;
  }
}

function getMyUserId() {
  try {
    const raw = localStorage.getItem('dotori_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s.user_id || null;
  } catch (e) {
    return null;
  }
}

function cssEscape(str) {
  return String(str).replace(/"/g, '\\"');
}

// ---------- Export to window ----------

window.openConversation = openConversation;
window.openInbox = openInbox;
window.renderConversationList = renderConversationList;
window.closeLiveChat = closeLiveChat;