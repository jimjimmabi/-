// ============================================
// 도토리숲 — 도토리 광장 (Acorn Square)
// ============================================

let squareState = {
  myGroups: [],
  activeGroupId: null,
  activeGroup: null,
  activeMembers: [],
  activeEntries: [],
  entriesChannel: null
};

// ---------- Init ----------

async function initSquareTab() {
  const container = document.getElementById('tab-plaza');
  if (!container) return;

  renderSquareLayout(container);
  await loadSquareGroups();
}

// ---------- Layout ----------

function renderSquareLayout(container) {
  container.innerHTML = `
    <div class="square-page">
      <aside class="square-sidebar" id="square-sidebar">
        <div class="square-sidebar-actions">
          <button class="square-action-btn primary" id="square-create-btn">
            <span class="square-action-icon">＋</span>
            <span>새 방 만들기</span>
          </button>
          <button class="square-action-btn" id="square-join-btn">
            <span class="square-action-icon">🔑</span>
            <span>코드로 참가</span>
          </button>
        </div>
        <div class="square-sidebar-title">
          <span>내 방</span>
          <span class="square-sidebar-count" id="square-group-count">0</span>
        </div>
        <div class="square-groups-list" id="square-groups-list">
          <p class="empty-message">불러오는 중...</p>
        </div>
      </aside>
      <section class="square-main" id="square-main">
        <div class="square-empty-state" id="square-empty-state">
          <div class="square-empty-emoji">🌰</div>
          <h3>아직 이 숲에는 방이 없어요</h3>
          <p>새 방을 만들거나, 친구에게 코드를 받아보세요.</p>
        </div>
      </section>
    </div>
  `;

  // Wire top action buttons
  const createBtn = document.getElementById('square-create-btn');
  if (createBtn) createBtn.addEventListener('click', openCreateGroupModal);

  const joinBtn = document.getElementById('square-join-btn');
  if (joinBtn) joinBtn.addEventListener('click', openJoinGroupModal);
}

// ---------- Load groups ----------

async function loadSquareGroups() {
  const list = document.getElementById('square-groups-list');
  const countEl = document.getElementById('square-group-count');
  if (!list) return;

  try {
    squareState.myGroups = await DotoriStorage.getMyGroups();
  } catch (e) {
    console.warn('Groups load failed:', e);
    squareState.myGroups = [];
  }

  if (countEl) countEl.textContent = squareState.myGroups.length;

  if (squareState.myGroups.length === 0) {
    list.innerHTML = `
      <p class="empty-message" style="font-size:11px; padding:12px 6px;">
        아직 방이 없어요.<br>
        <span style="color:#BBB; font-size:10px;">새 방을 만들어보세요.</span>
      </p>
    `;
    return;
  }

  list.innerHTML = '';
  squareState.myGroups.forEach((group) => {
    const item = renderGroupListItem(group);
    list.appendChild(item);
  });

  // Auto-open the first group if none is active
  if (!squareState.activeGroupId && squareState.myGroups.length > 0) {
    openGroup(squareState.myGroups[0].id);
  }
}

function renderGroupListItem(group) {
  const div = document.createElement('div');
  const isActive = squareState.activeGroupId === group.id;
  div.className = 'square-group-item' + (isActive ? ' active' : '');
  div.dataset.groupId = group.id;

  div.innerHTML = `
    <div class="square-group-item-icon">🌰</div>
    <div class="square-group-item-main">
      <div class="square-group-item-name">${escapeHtml(group.name)}</div>
      <div class="square-group-item-meta">
        ${group.member_count || 1}/${group.max_members || 8}명
        ${group.entry_count ? ` · ${group.entry_count}개 일기` : ''}
      </div>
    </div>
  `;

  div.addEventListener('click', () => openGroup(group.id));
  return div;
}

// ---------- Open a group ----------

async function openGroup(groupId) {
  squareState.activeGroupId = groupId;

  // Update sidebar active state
  document.querySelectorAll('.square-group-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.groupId === groupId);
  });

  const main = document.getElementById('square-main');
  if (!main) return;

  main.innerHTML = `<div class="square-empty-state"><p class="empty-message">불러오는 중...</p></div>`;

  let group, members, entries;
  try {
    group = await DotoriStorage.getGroupById(groupId);
    members = await DotoriStorage.getGroupMembers(groupId);
    entries = await DotoriStorage.getGroupEntries(groupId, 100);
  } catch (e) {
    console.warn('Group load failed:', e);
    main.innerHTML = `<div class="square-empty-state"><p class="empty-message">방을 불러올 수 없어요.</p></div>`;
    return;
  }

  if (!group) {
    main.innerHTML = `<div class="square-empty-state"><p class="empty-message">방을 찾을 수 없어요.</p></div>`;
    return;
  }

  // Reverse so oldest first (chat order)
  entries = (entries || []).slice().reverse();

  squareState.activeGroup = group;
  squareState.activeMembers = members || [];
  squareState.activeEntries = entries;

  // Determine if I'm the creator
  let myProfile = null;
  try { myProfile = await DotoriStorage.getProfile(); } catch (e) {}
  const isCreator = myProfile && myProfile.id === group.creator_id;

  renderGroupMain(main, group, members, entries, isCreator);

  // On mobile: slide the main panel into view
  const page = document.querySelector('.square-page');
  if (page) page.classList.add('show-main');

  // Realtime subscription
  subscribeToActiveGroup(groupId);
}

function renderGroupMain(container, group, members, entries, isCreator) {
  const memberCount = members.length;
  const maxMembers = group.max_members || 8;

  container.innerHTML = `
    <div class="square-group">
      <header class="square-group-header">
        <button class="square-back-btn" id="square-back-btn" title="목록으로">←</button>
        <div class="square-group-header-info">
          <div class="square-group-header-name">${escapeHtml(group.name)}</div>
          <div class="square-group-header-meta">
            방장 ${isCreator ? '나' : '·'} · ${memberCount}/${maxMembers}명
            · 코드 <code>${escapeHtml(group.code)}</code>
            <button class="square-copy-code" id="square-copy-code" data-copy="${escapeHtml(group.code)}">복사</button>
          </div>
        </div>
        <div class="square-group-header-actions">
          ${isCreator
            ? `<button class="small-btn square-delete-btn" id="square-delete-btn">방 삭제</button>`
            : `<button class="small-btn square-leave-btn" id="square-leave-btn">나가기</button>`}
        </div>
      </header>

      ${group.description ? `<div class="square-group-description">${escapeHtml(group.description)}</div>` : ''}

      <div class="square-diary" id="square-diary">
        ${renderDiaryEntries(entries)}
      </div>

      <div class="square-composer">
        <textarea id="square-input" maxlength="300" rows="2"
          placeholder="메시지를 남겨보세요..." class="editor-input"></textarea>
        <button id="square-send-btn" class="small-btn primary">보내기</button>
      </div>
    </div>
  `;

  // Scroll to bottom
  const diary = document.getElementById('square-diary');
  if (diary) diary.scrollTop = diary.scrollHeight;

  // Wire back button
  const backBtn = document.getElementById('square-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.querySelector('.square-page').classList.remove('show-main');
    });
  }

  // Wire copy code
  const copyBtn = document.getElementById('square-copy-code');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(copyBtn.dataset.copy);
      const old = copyBtn.textContent;
      copyBtn.textContent = '복사됨!';
      setTimeout(() => { copyBtn.textContent = old; }, 1500);
    });
  }

  // Wire leave / delete
  const leaveBtn = document.getElementById('square-leave-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('이 방에서 나갈까요?')) return;
      try {
        await DotoriStorage.leaveGroup(group.id);
        squareState.activeGroupId = null;
        squareState.activeGroup = null;
        await loadSquareGroups();
        const main = document.getElementById('square-main');
        if (main) {
          main.innerHTML = `
            <div class="square-empty-state">
              <div class="square-empty-emoji">🌰</div>
              <h3>방에서 나왔어요</h3>
              <p>언제든 다시 코드로 들어올 수 있어요.</p>
            </div>
          `;
        }
      } catch (e) {
        console.error('Leave failed:', e);
        alert('나갈 수 없어요');
      }
    });
  }

  const deleteBtn = document.getElementById('square-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('방을 삭제할까요? 모든 일기가 사라져요.')) return;
      try {
        const ok = await DotoriStorage.deleteGroup(group.id);
        if (!ok) {
          alert('삭제할 수 없어요. 방장만 삭제할 수 있어요.');
          return;
        }
        squareState.activeGroupId = null;
        squareState.activeGroup = null;
        await loadSquareGroups();
        const main = document.getElementById('square-main');
        if (main) {
          main.innerHTML = `
            <div class="square-empty-state">
              <div class="square-empty-emoji">🌰</div>
              <h3>방을 삭제했어요</h3>
              <p>이 방은 이제 숲에 없어요.</p>
            </div>
          `;
        }
      } catch (e) {
        console.error('Delete failed:', e);
        alert('삭제할 수 없어요');
      }
    });
  }

  // Wire composer
  const input = document.getElementById('square-input');
  const sendBtn = document.getElementById('square-send-btn');

  const doSend = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    try {
      await DotoriStorage.postGroupEntry(group.id, msg);
      // Realtime will handle appending
    } catch (e) {
      console.error('Post failed:', e);
      alert('메시지를 보낼 수 없어요');
      input.value = msg;
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', doSend);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
  }
}

function renderDiaryEntries(entries) {
  if (!entries || entries.length === 0) {
    return `
      <div class="square-diary-empty">
        <p>아직 이 방에는 일기가 없어요.<br>
        <span style="color:#BBB; font-size:10px;">먼저 인사를 건네보세요.</span></p>
      </div>
    `;
  }

  return entries.map((entry) => {
    const author = entry.author || {};
    const avatarHtml = author.mini_me_image_url
      ? `<img src="${author.mini_me_image_url}" alt="" class="mini-me-image">`
      : (author.mini_me || '🌰');

    return `
      <div class="square-entry" data-entry-id="${entry.id}">
        <div class="square-entry-avatar" style="background:${author.mini_me_bg || '#EAF6FF'};">
          ${avatarHtml}
        </div>
        <div class="square-entry-main">
          <div class="square-entry-header">
            <span class="square-entry-author">${escapeHtml(author.nickname || '익명')}</span>
            <span class="square-entry-time">${formatDate(entry.created_at)} ${formatTime(entry.created_at)}</span>
          </div>
          <div class="square-entry-body">${escapeHtml(entry.message)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Realtime ----------

function subscribeToActiveGroup(groupId) {
  if (squareState.entriesChannel) {
    try { squareState.entriesChannel.unsubscribe(); } catch (e) {}
    squareState.entriesChannel = null;
  }

  try {
    squareState.entriesChannel = DotoriStorage.subscribeToGroupEntries(groupId, async (payload) => {
      // Only react to new inserts
      if (payload.eventType !== 'INSERT') return;

      const entry = payload.new;
      if (!entry || entry.group_id !== groupId) return;

      // Fetch author info
      let author = null;
      try {
        author = await DotoriStorage.getProfileById(entry.author_id);
      } catch (e) {}
      if (!author) author = { nickname: '익명', mini_me: '🌰' };

      const fullEntry = { ...entry, author };

      // Don't double-add our own optimistic (there isn't one for groups — we wait for realtime)
      // Just append
      appendDiaryEntry(fullEntry);
    });
  } catch (e) {
    console.warn('Group subscribe failed:', e);
  }
}

function appendDiaryEntry(entry) {
  const diary = document.getElementById('square-diary');
  if (!diary) return;

  // Clear the empty state if present
  const emptyEl = diary.querySelector('.square-diary-empty');
  if (emptyEl) emptyEl.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderDiaryEntries([entry]);
  const node = wrapper.firstElementChild;
  diary.appendChild(node);
  diary.scrollTop = diary.scrollHeight;
}

// ---------- Create group modal ----------

function openCreateGroupModal() {
  showModal('🌰 새 방 만들기',
    `<div class="editor-form">
      <label>방 이름 <span class="hint">최대 20자</span></label>
      <input type="text" id="square-new-name" maxlength="20"
        placeholder="우리들의 작은 방"
        class="editor-input">

      <label>소개 <span class="hint">선택사항</span></label>
      <input type="text" id="square-new-desc" maxlength="60"
        placeholder="간단한 소개를 적어주세요"
        class="editor-input">

      <p class="hint" style="margin-top:12px; color:#888; font-size:11px; line-height:1.6;">
        방을 만들면 초대 코드가 생겨요.<br>
        그 코드를 친구에게 알려주면 들어올 수 있어요.<br>
        최대 8명까지 함께할 수 있어요.
      </p>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '만들기', primary: true, onClick: async () => {
        const name = document.getElementById('square-new-name').value.trim();
        if (!name) return;
        const desc = document.getElementById('square-new-desc').value.trim();

        try {
          const group = await DotoriStorage.createGroup(name, desc);
          closeModal();
          await loadSquareGroups();
          // Show the new room's code
          showModal('🌰 방이 만들어졌어요',
            `<p style="text-align:center; font-size:12px; line-height:1.7;">
              초대 코드는<br>
              <strong style="font-size:20px; color:#E87BA8; letter-spacing:2px; display:inline-block; margin:10px 0;">${escapeHtml(group.code)}</strong><br>
              <span style="color:#888; font-size:11px;">이 코드를 친구에게 알려주세요.</span>
            </p>`,
            [{ label: '확인', primary: true, onClick: closeModal }]
          );
          // Auto-open the new group
          openGroup(group.id);
        } catch (e) {
          console.error('Create group failed:', e);
          alert('방을 만들 수 없어요: ' + (e.message || ''));
        }
      }}
    ]
  );

  setTimeout(() => {
    const input = document.getElementById('square-new-name');
    if (input) input.focus();
  }, 50);
}

// ---------- Join group modal ----------

function openJoinGroupModal() {
  showModal('🔑 코드로 참가',
    `<div class="editor-form">
      <label>초대 코드</label>
      <input type="text" id="square-join-code" maxlength="8"
        placeholder="AB-CD"
        class="editor-input"
        style="text-transform: uppercase; letter-spacing: 2px; text-align:center; font-size:16px;"
        autocomplete="off">

      <p class="hint" style="margin-top:10px; color:#888; font-size:11px; line-height:1.6; text-align:center;">
        친구에게 받은 코드를 입력하세요.<br>
        대소문자는 상관없어요.
      </p>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '들어가기', primary: true, onClick: async () => {
        const code = document.getElementById('square-join-code').value.trim();
        if (!code) return;

        try {
          const group = await DotoriStorage.joinGroupByCode(code);
          closeModal();
          await loadSquareGroups();
          openGroup(group.id);
        } catch (e) {
          console.error('Join failed:', e);
          alert(e.message || '들어갈 수 없어요');
        }
      }}
    ]
  );

  setTimeout(() => {
    const input = document.getElementById('square-join-code');
    if (input) input.focus();
  }, 50);
}

// ---------- Export ----------

window.initSquareTab = initSquareTab;