// ============================================
// 도토리숲 — Friends (일촌) + Drawer Sidebar
// ============================================

let friendsDrawerOpen = false;
let friendsCache = { ilchon: [], requests: [] };
let friendsSearchTerm = '';

// ---------- Drawer open/close ----------

function initFriendsDrawer() {
  const toggleBtn = document.getElementById('friends-toggle-btn');
  const drawer = document.getElementById('friends-drawer');
  const closeBtn = document.getElementById('friends-drawer-close');
  const overlay = document.getElementById('friends-drawer-overlay');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openFriendsDrawer();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeFriendsDrawer);
  }

  if (overlay) {
    overlay.addEventListener('click', closeFriendsDrawer);
  }

  // Escape key closes the drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && friendsDrawerOpen) {
      closeFriendsDrawer();
    }
  });
}

async function openFriendsDrawer() {
  const drawer = document.getElementById('friends-drawer');
  const overlay = document.getElementById('friends-drawer-overlay');
  if (!drawer) return;

  drawer.classList.add('open');
  if (overlay) overlay.classList.add('visible');
  friendsDrawerOpen = true;

  // Refresh the list every time the drawer opens
  await renderFriendsDrawer();
}

function closeFriendsDrawer() {
  const drawer = document.getElementById('friends-drawer');
  const overlay = document.getElementById('friends-drawer-overlay');
  if (!drawer) return;

  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
  friendsDrawerOpen = false;
  friendsSearchTerm = '';
}

// ---------- Drawer content ----------

async function renderFriendsDrawer() {
  const content = document.getElementById('friends-drawer-content');
  if (!content) return;

  content.innerHTML = `<p class="empty-message">불러오는 중...</p>`;

  let ilchon = [];
  let requests = [];

  try {
    [ilchon, requests] = await Promise.all([
      DotoriStorage.getIlchon(),
      DotoriStorage.getPendingRequests()
    ]);
  } catch (err) {
    console.error('Friends load failed:', err);
    content.innerHTML = `<p class="empty-message">친구 목록을 불러올 수 없어요.</p>`;
    return;
  }

  friendsCache = { ilchon, requests };

  // Update the header badge (friend requests count)
  updateFriendsBadge();

  content.innerHTML = `
    <!-- Friend requests at the top -->
    <div class="friends-section">
      <div class="friends-section-title">
        <span>일촌 신청</span>
        ${requests.length > 0 ? `<span class="friends-section-count">${requests.length}</span>` : ''}
      </div>
      <div id="friends-requests" class="friends-requests-list"></div>
    </div>

    <!-- Search + friend list -->
    <div class="friends-section">
      <div class="friends-section-title">
        <span>내 일촌</span>
        <span class="friends-section-count friends-count-ilchon">${ilchon.length} / ${DotoriStorage.MAX_ILCHON}</span>
      </div>

      <div class="friends-search">
        <input type="text" id="friends-search-input"
          placeholder="일촌 검색"
          class="editor-input" autocomplete="off"
          value="${escapeHtml(friendsSearchTerm)}">
      </div>

      <div id="friends-ilchon-list" class="friends-ilchon-list"></div>
    </div>
  `;

  // Render requests
  const requestsEl = document.getElementById('friends-requests');
  if (requests.length === 0) {
    requestsEl.innerHTML = `<p class="empty-message" style="font-size:11px; padding:8px 0;">아직 신청이 없어요.</p>`;
  } else {
    requests.forEach((req) => {
      requestsEl.appendChild(renderFriendRequest(req));
    });
  }

  // Render ilchon list
  renderIlchonList();

  // Wire search
  const searchInput = document.getElementById('friends-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      friendsSearchTerm = e.target.value.trim().toLowerCase();
      renderIlchonList();
    });
  }
}

function renderFriendRequest(req) {
  const div = document.createElement('div');
  div.className = 'friend-request';

  const s = req.sender || {};

  div.innerHTML = `
    <div class="friend-request-avatar" style="${s.mini_me_bg ? `background:${s.mini_me_bg};` : ''}">
      ${s.mini_me_image_url
        ? `<img src="${s.mini_me_image_url}" alt="" class="mini-me-image">`
        : (s.mini_me || '🌰')}
    </div>
    <div class="friend-request-main">
      <div class="friend-request-name">${escapeHtml(s.nickname || '익명')}</div>
      <div class="friend-request-status">${escapeHtml(s.status_message || '')}</div>
      <div class="friend-request-actions">
        <button class="small-btn primary accept-btn">수락</button>
        <button class="small-btn decline-btn">거절</button>
      </div>
    </div>
  `;

  // Accept
  div.querySelector('.accept-btn').addEventListener('click', async () => {
    try {
      await DotoriStorage.acceptFriendRequest(req.id);
      await renderFriendsDrawer();
    } catch (err) {
      console.error('accept failed:', err);
      alert(err.message || '수락할 수 없어요');
    }
  });

  // Decline
  div.querySelector('.decline-btn').addEventListener('click', async () => {
    try {
      await DotoriStorage.declineFriendRequest(req.id);
      await renderFriendsDrawer();
    } catch (err) {
      console.error('decline failed:', err);
    }
  });

  return div;
}

function renderIlchonList() {
  const list = document.getElementById('friends-ilchon-list');
  if (!list) return;

  let filtered = friendsCache.ilchon;

  if (friendsSearchTerm) {
    filtered = filtered.filter((f) => {
      const name = (f.nickname || '').toLowerCase();
      const status = (f.status_message || '').toLowerCase();
      return name.includes(friendsSearchTerm) || status.includes(friendsSearchTerm);
    });
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <p class="empty-message" style="font-size:11px; padding:8px 0;">
        ${friendsSearchTerm ? '검색 결과가 없어요.' : '아직 일촌이 없어요.<br>취향 찾기에서 마음이 가는 사람을 찾아보세요.'}
      </p>
    `;
    return;
  }

  list.innerHTML = '';
  filtered.forEach((friend) => {
    list.appendChild(renderFriendItem(friend));
  });
}

function renderFriendItem(friend) {
  const div = document.createElement('div');
  div.className = 'friend-item';

  div.innerHTML = `
    <div class="friend-item-avatar" style="background:${friend.mini_me_bg || '#EAF6FF'};">
      ${friend.mini_me_image_url
        ? `<img src="${friend.mini_me_image_url}" alt="" class="mini-me-image">`
        : (friend.mini_me || '🌰')}
    </div>
    <div class="friend-item-main">
      <div class="friend-item-name">${escapeHtml(friend.nickname)}</div>
      <div class="friend-item-status">${escapeHtml(friend.status_message || '')}</div>
    </div>
  `;

  div.addEventListener('click', () => {
    closeFriendsDrawer();
    openConversationWith(friend.dotori_id, friend.nickname, friend.mini_me || '🌰');
  });

  return div;
}

// ---------- Header badge ----------

function updateFriendsBadge() {
  const badge = document.getElementById('friends-badge');
  if (!badge) return;

  const count = friendsCache.requests.length;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

// ---------- Open conversation from friend list ----------

async function openConversationWith(dotoriId, nickname, miniMe) {
  // Load both received and sent notes, group into a conversation
  let inbox = [];
  let sent = [];

  try {
    [inbox, sent] = await Promise.all([
      DotoriStorage.getInbox(),
      DotoriStorage.getSentNotes()
    ]);
  } catch (e) {
    console.error('Load notes failed:', e);
  }

  const relevant = [];
  let miniMeImageUrl = null;

  (inbox || []).forEach((n) => {
    const s = n.sender || {};
    if (s.dotori_id === dotoriId) {
      relevant.push({ ...n, direction: 'received' });
      if (s.mini_me_image_url) miniMeImageUrl = s.mini_me_image_url;
    }
  });

  (sent || []).forEach((n) => {
    const r = n.recipient || {};
    if (r.dotori_id === dotoriId) {
      relevant.push({ ...n, direction: 'sent' });
      if (r.mini_me_image_url) miniMeImageUrl = r.mini_me_image_url;
    }
  });

  relevant.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // If we didn't find the image from the notes, look up the profile directly
  if (!miniMeImageUrl) {
    try {
      const profile = await DotoriStorage.getProfileByDotoriId(dotoriId);
      if (profile && profile.mini_me_image_url) {
        miniMeImageUrl = profile.mini_me_image_url;
      }
    } catch (e) {}
  }

  const conv = {
    dotori_id: dotoriId,
    nickname: nickname,
    mini_me: miniMe,
    mini_me_image_url: miniMeImageUrl,
    notes: relevant,
    unread: 0,
    lastAt: relevant.length ? new Date(relevant[relevant.length - 1].created_at).getTime() : 0
  };

  // Reuse the existing conversation opener from notes.js
  if (typeof openConversation === 'function') {
    openConversation(conv);
  }
}