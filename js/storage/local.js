// ============================================
// 도토리숲 — Local Storage Adapter (v1)
// ============================================

const STORAGE_KEYS = {
  PROFILE: 'dotori_profile',
  ROOM: 'dotori_room',
  GUESTBOOK: 'dotori_guestbook',
  ALBUM: 'dotori_album',
  RESOURCES: 'dotori_resources',
  NOTES: 'dotori_notes',
  WARM_WORDS: 'dotori_warm_words',
  SESSION: 'dotori_session'
};

// ---------- Helpers ----------

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage write failed:', e);
    return false;
  }
}

// ---------- ID generation ----------

function generateDotoriId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'dotori-' + id.toLowerCase();
}

// ---------- Auth ----------

function createAcorn(nickname) {
  const profile = {
    id: 'local-' + Date.now(),
    dotori_id: generateDotoriId(),
    nickname: nickname,
    status_message: '오늘도 화이팅 ♡',
    mini_me_color: '#FF9EC4',
    tastes: {
      interests: [],
      music: [],
      mood: [],
      favorites: '',
      currently: '',
      needs: ''
    },
    created_at: new Date().toISOString()
  };

  write(STORAGE_KEYS.PROFILE, profile);
  write(STORAGE_KEYS.SESSION, { loggedIn: true, dotori_id: profile.dotori_id });

  // Initialize empty data
  write(STORAGE_KEYS.ROOM, { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null });
  write(STORAGE_KEYS.GUESTBOOK, []);
  write(STORAGE_KEYS.ALBUM, []);
  write(STORAGE_KEYS.NOTES, []);
  write(STORAGE_KEYS.WARM_WORDS, []);

  return profile;
}

function loadAcorn(dotoriId) {
  const profile = read(STORAGE_KEYS.PROFILE, null);
  if (!profile) return null;
  if (dotoriId && profile.dotori_id !== dotoriId) return null;

  write(STORAGE_KEYS.SESSION, { loggedIn: true, dotori_id: profile.dotori_id });
  return profile;
}

function getSession() {
  return read(STORAGE_KEYS.SESSION, null);
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// ---------- Profile ----------

function getProfile() {
  return read(STORAGE_KEYS.PROFILE, null);
}

function updateProfile(updates) {
  const profile = getProfile();
  if (!profile) return null;
  const updated = { ...profile, ...updates };
  write(STORAGE_KEYS.PROFILE, updated);
  return updated;
}

// ---------- Room ----------

function getRoom() {
  return read(STORAGE_KEYS.ROOM, { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null });
}

function saveRoom(room) {
  return write(STORAGE_KEYS.ROOM, room);
}

// ---------- Guestbook ----------

function getGuestbook() {
  return read(STORAGE_KEYS.GUESTBOOK, []);
}

function addGuestbookEntry(entry) {
  const list = getGuestbook();
  const newEntry = {
    id: 'gb-' + Date.now(),
    author_id: entry.author_id || 'me',
    author_name: entry.author_name || '나',
    message: entry.message,
    is_secret: entry.is_secret || false,
    reply: null,
    created_at: new Date().toISOString()
  };
  list.unshift(newEntry);
  write(STORAGE_KEYS.GUESTBOOK, list);
  return newEntry;
}

// ---------- Export / Import ----------

function exportAcorn() {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    profile: getProfile(),
    room: getRoom(),
    guestbook: getGuestbook(),
    album: read(STORAGE_KEYS.ALBUM, []),
    notes: read(STORAGE_KEYS.NOTES, []),
    warm_words: read(STORAGE_KEYS.WARM_WORDS, [])
  };
}

function importAcorn(data) {
  if (!data || !data.profile) return false;

  write(STORAGE_KEYS.PROFILE, data.profile);
  write(STORAGE_KEYS.ROOM, data.room || { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null });
  write(STORAGE_KEYS.GUESTBOOK, data.guestbook || []);
  write(STORAGE_KEYS.ALBUM, data.album || []);
  write(STORAGE_KEYS.NOTES, data.notes || []);
  write(STORAGE_KEYS.WARM_WORDS, data.warm_words || []);
  write(STORAGE_KEYS.SESSION, { loggedIn: true, dotori_id: data.profile.dotori_id });

  return true;
}

// ---------- Expose globally (for non-module use) ----------

window.DotoriLocal = {
  createAcorn,
  loadAcorn,
  getSession,
  logout,
  getProfile,
  updateProfile,
  getRoom,
  saveRoom,
  getGuestbook,
  addGuestbookEntry,
  exportAcorn,
  importAcorn,
  STORAGE_KEYS
};