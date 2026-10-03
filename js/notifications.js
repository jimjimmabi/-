// ============================================
// 도토리숲 — Notifications (Toast + Browser)
// ============================================

let notificationChannel = null;
let notificationBannerDismissed = false;

// ---------- Init ----------

function initNotifications() {
  maybeShowNotificationBanner();
  setupGlobalNoteSubscription();
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
      console.log('🌰 Global note received:', newNote);

      // Ignore our own messages
      const me = await DotoriStorage.getProfile();
      if (!me) {
        console.warn('No profile yet — skipping notification');
        return;
      }
      if (newNote.sender_id === me.id) return;
      if (newNote.recipient_id !== me.id) return;

      // FIXED: use getProfileById directly, no more __ helper
      const sender = await DotoriStorage.getProfileById(newNote.sender_id);
      if (!sender) {
        console.warn('Sender profile not found:', newNote.sender_id);
        return;
      }

      console.log('🌰 Toast for:', sender.nickname);

      // Update inbox badge
      try {
        const count = await DotoriStorage.getUnreadCount();
        const inboxCount = document.getElementById('inbox-count');
        if (inboxCount) inboxCount.textContent = count;
      } catch (e) {}

      // Toast
      showToast({
        mini_me: sender.mini_me || '🌰',
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

      // Browser notification
      showBrowserNotification(sender.nickname, newNote.message);
    });
  } catch (e) {
    console.warn('Global note subscription failed:', e);
  }
}

// ---------- Toast ----------

function showToast({ mini_me, title, body, onClick }) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('No toast container');
    return;
  }

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

  toast.querySelector('.toast-main').addEventListener('click', () => {
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
  }, 300);
}

// ---------- Browser notification ----------

function showBrowserNotification(senderName, message) {
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