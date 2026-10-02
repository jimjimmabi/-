// ============================================
// 도토리숲 — Notifications (Toast + Browser)
// ============================================

let notificationChannel = null;
let notificationBannerDismissed = false;

// ---------- Init ----------

function initNotifications() {
  // Show the permission banner if the user hasn't decided yet
  maybeShowNotificationBanner();

  // Subscribe to all incoming notes globally
  setupGlobalNoteSubscription();
}

// ---------- Permission banner ----------

function maybeShowNotificationBanner() {
  const banner = document.getElementById('notification-banner');
  if (!banner) return;

  // Don't show if already decided
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
      // Ignore our own messages
      const me = await DotoriStorage.getProfile();
      if (!me) return;
      if (newNote.sender_id === me.id) return;

      // Only care about messages addressed to us
      if (newNote.recipient_id !== me.id) return;

      // Fetch the sender's profile
      const sender = await DotoriStorage.getProfileByDotoriId(
        await getSenderDotoriId(newNote.sender_id)
      );
      if (!sender) return;

      // Update inbox badge
      try {
        const count = await DotoriStorage.getUnreadCount();
        const inboxCount = document.getElementById('inbox-count');
        if (inboxCount) inboxCount.textContent = count;
      } catch (e) {}

      // Show toast
      showToast({
        mini_me: sender.mini_me || '🌰',
        title: `${sender.nickname}님의 쪽지`,
        body: truncate(newNote.message, 60),
        onClick: () => {
          // Open chat with this person
          if (typeof openConversationWith === 'function') {
            openConversationWith(
              sender.dotori_id,
              sender.nickname,
              sender.mini_me || '🌰'
            );
          }
        }
      });

      // Browser notification
      showBrowserNotification(sender.nickname, newNote.message, sender.mini_me || '🌰');
    });
  } catch (e) {
    console.warn('Global note subscription failed:', e);
  }
}

async function getSenderDotoriId(senderId) {
  // We have sender_id (uuid). We need dotori_id.
  // Simple approach: query profiles by id.
  // We use a small helper that queries through the storage API.
  try {
    const { data } = await window.DotoriSupabase.__getProfileById(senderId);
    return data ? data.dotori_id : null;
  } catch (e) {
    return null;
  }
}

// ---------- Toast ----------

function showToast({ mini_me, title, body, onClick }) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-avatar">${mini_me || '🌰'}</div>
    <div class="toast-main">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-body">${escapeHtml(body)}</div>
    </div>
    <button class="toast-close" aria-label="닫기">✕</button>
  `;

  // Click on toast body → trigger onClick
  toast.querySelector('.toast-main').addEventListener('click', () => {
    if (typeof onClick === 'function') onClick();
    removeToast(toast);
  });

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', (e) => {
    e.stopPropagation();
    removeToast(toast);
  });

  container.appendChild(toast);

  // Trigger slide-in
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    removeToast(toast);
  }, 6000);
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove('visible');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 300);
}

// ---------- Browser notification ----------

function showBrowserNotification(senderName, message, emoji) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const n = new Notification(`🌰 ${senderName}님의 쪽지`, {
      body: truncate(message, 80),
      tag: 'dotori-note-' + Date.now(),
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