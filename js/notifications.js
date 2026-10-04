// ============================================
// 도토리숲 — Notifications (Toast + Browser)
// ============================================

let notificationChannel = null;
let reactionNotificationChannel = null;
let notificationBannerDismissed = false;

// ---------- Init ----------

function initNotifications() {
  maybeShowNotificationBanner();
  setupGlobalNoteSubscription();
  setupGlobalReactionSubscription();
}

// ---------- Permission banner ----------

function maybeShowNotificationBanner() {
  const banner = document.getElementById('notification-banner');
  if (!banner) return;

  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (notificationBannerDismissed) return;

  banner.classList.remove('hidden');
}

function dismissNotificationBanner() {
  const banner = document.getElementById('notification-banner');
  if (banner) banner.classList.add('hidden');
  notificationBannerDismissed = true;
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    dismissNotificationBanner();
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast({
        mini_me: '🌰',
        title: '알림이 켜졌어요',
        body: '새 쪽지가 오면 알려드릴게요.'
      });
    }
  } catch (e) {
    console.warn('Notification permission failed:', e);
  }

  dismissNotificationBanner();
}

// ---------- Global note subscription ----------

function setupGlobalNoteSubscription() {
  if (notificationChannel) return;

  try {
    notificationChannel = DotoriStorage.subscribeToMyNotes(async (newNote) => {
      const me = await DotoriStorage.getProfile();
      if (!me) return;
      if (newNote.sender_id === me.id) return;
      if (newNote.recipient_id !== me.id) return;

      const sender = await DotoriStorage.getProfileById(newNote.sender_id);
      if (!sender) return;

      try {
        const count = await DotoriStorage.getUnreadCount();
        const inboxCount = document.getElementById('inbox-count');
        if (inboxCount) inboxCount.textContent = count;
      } catch (e) {}

      showToast({
        mini_me: sender.mini_me || '🌰',
        mini_me_image_url: sender.mini_me_image_url || null,
        title: `${sender.nickname}님의 쪽지`,
        body: truncate(newNote.message, 60),
        onClick: () => {
          if (typeof openConversationWith === 'function') {
            openConversationWith(
              sender.dotori_id,
              sender.nickname,
              sender.mini_me || '🌰'
            );
          }
        }
      });

      showBrowserNotification(`${sender.nickname}님의 쪽지`, newNote.message);
    });
  } catch (e) {
    console.warn('Global note subscription failed:', e);
  }
}

// ---------- Global reaction subscription ----------

function setupGlobalReactionSubscription() {
  if (reactionNotificationChannel) return;

  try {
    reactionNotificationChannel = DotoriStorage.subscribeToReactions(async (payload) => {
      // Only care about NEW reactions
      if (payload.eventType !== 'INSERT') return;

      const reaction = payload.new;
      if (!reaction || !reaction.note_id) return;

      // Get our profile
      const me = await DotoriStorage.getProfile();
      if (!me) return;

      // Ignore our own reactions
      if (reaction.user_id === me.id) return;

      // Find the note that was reacted to
      const note = await DotoriStorage.getNoteById(reaction.note_id);
      if (!note) return;

      // Only notify if the note was sent BY me
      if (note.sender_id !== me.id) return;

      // Get the reactor's profile
      const reactor = await DotoriStorage.getProfileById(reaction.user_id);
      if (!reactor) return;

      // Show toast
      showToast({
        mini_me: reactor.mini_me || '🌰',
        mini_me_image_url: reactor.mini_me_image_url || null,
        title: `${reactor.nickname}님이 반응했어요`,
        body: `${reaction.emoji} — "${truncate(note.message, 40)}"`,
        onClick: () => {
          if (typeof openConversationWith === 'function') {
            openConversationWith(
              reactor.dotori_id,
              reactor.nickname,
              reactor.mini_me || '🌰'
            );
          }
        }
      });

      // Browser notification
      showBrowserNotification(
        `${reactor.nickname}님이 반응했어요`,
        `${reaction.emoji} "${truncate(note.message, 50)}"`
      );
    });
  } catch (e) {
    console.warn('Reaction subscription failed:', e);
  }
}

// ---------- Toast (speech bubble with avatar) ----------

function showToast({ mini_me, mini_me_image_url, title, body, onClick }) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('No toast container');
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-avatar-wrap">
      <div class="toast-avatar">
        ${mini_me_image_url
          ? `<img src="${mini_me_image_url}" alt="" class="mini-me-image">`
          : (mini_me || '🌰')}
      </div>
      <div class="toast-tail"></div>
    </div>
    <div class="toast-bubble">
      <div class="toast-bubble-header">
        <span class="toast-title">${escapeHtml(title)}</span>
        <button class="toast-close" aria-label="닫기">✕</button>
      </div>
      <div class="toast-body">${escapeHtml(body)}</div>
    </div>
  `;

  toast.querySelector('.toast-bubble').addEventListener('click', (e) => {
    if (e.target.classList.contains('toast-close')) return;
    if (typeof onClick === 'function') onClick();
    removeToast(toast);
  });

  toast.querySelector('.toast-close').addEventListener('click', (e) => {
    e.stopPropagation();
    removeToast(toast);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    removeToast(toast);
  }, 6000);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove('visible');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 320);
}

// ---------- Browser notification ----------

function showBrowserNotification(title, message) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const n = new Notification(`🌰 ${title}`, {
      body: truncate(message, 80),
      tag: 'dotori-notif-' + Date.now(),
      silent: false
    });

    setTimeout(() => n.close(), 8000);
  } catch (e) {
    console.warn('Browser notification failed:', e);
  }
}

// ---------- Utilities ----------

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}