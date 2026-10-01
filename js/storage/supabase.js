// ============================================
// 도토리숲 — Supabase Storage Adapter (v2)
// ============================================

const SUPABASE_URL_FALLBACK = 'https://xdqmsrferkstomzytkoh.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcW1zcmZlcmtzdG9tenl0a29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzU5NzksImV4cCI6MjEwNjQ1MTk3OX0.d-XCXnr8LVDcoFpZCKRMfBY3x0YdupUsJHDcyX7zEB4';

const sb = window.supabase.createClient(
  window.SUPABASE_URL || SUPABASE_URL_FALLBACK,
  window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK
);

// ---------- Auth ----------

async function createAcorn(nickname) {
  const { data: authData, error: authError } = await sb.auth.signInAnonymously();
  if (authError) throw authError;

  const userId = authData.user.id;
  const dotoriId = 'dotori-' + Math.random().toString(36).substring(2, 6);

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .insert([{
      id: userId,
      dotori_id: dotoriId,
      nickname: nickname,
      status_message: '오늘도 화이팅 ♡',
      mini_me: '🌰',
      mini_me_bg: '#EAF6FF',
      tastes: {
        interests: [], music: [], mood: [],
        favorites: '', currently: '', needs: ''
      }
    }])
    .select()
    .single();

  if (profileError) throw profileError;

  await sb.from('rooms').insert([{ user_id: userId }]);

  localStorage.setItem('dotori_session', JSON.stringify({
    loggedIn: true,
    dotori_id: dotoriId,
    user_id: userId
  }));

  return profile;
}

async function loadAcorn() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) return null;

  localStorage.setItem('dotori_session', JSON.stringify({
    loggedIn: true,
    dotori_id: data.dotori_id,
    user_id: data.id
  }));

  return data;
}

function getSession() {
  try {
    const raw = localStorage.getItem('dotori_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function logout() {
  await sb.auth.signOut();
  localStorage.removeItem('dotori_session');
}

// ---------- Profile ----------

async function getProfile() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data;
}

async function getProfileByDotoriId(dotoriId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('dotori_id', dotoriId)
    .single();

  if (error) return null;
  return data;
}

async function updateProfile(updates) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------- Tastes ----------

async function getTastes() {
  const profile = await getProfile();
  return (profile && profile.tastes) || {
    interests: [], music: [], mood: [],
    favorites: '', currently: '', needs: ''
  };
}

async function updateTastes(tastes) {
  return updateProfile({ tastes });
}

// ---------- Room ----------

async function getRoom() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null };

  const { data, error } = await sb
    .from('rooms')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) return { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null };
  return data;
}

async function saveRoom(room) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { error } = await sb
    .from('rooms')
    .update({
      layout: room.layout,
      wallpaper: room.wallpaper,
      floor: room.floor,
      bgm_choice: room.bgm_choice,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  return !error;
}

// ---------- Guestbook ----------

async function getGuestbook(ownerDotoriId) {
  let ownerId;

  if (ownerDotoriId) {
    const owner = await getProfileByDotoriId(ownerDotoriId);
    if (!owner) return [];
    ownerId = owner.id;
  } else {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    ownerId = user.id;
  }

  const { data, error } = await sb
    .from('guestbook')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

async function addGuestbookEntry(entry, ownerDotoriId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const me = await getProfile();
  if (!me) return null;

  let ownerId = me.id;
  if (ownerDotoriId) {
    const owner = await getProfileByDotoriId(ownerDotoriId);
    if (owner) ownerId = owner.id;
  }

  const { data, error } = await sb
    .from('guestbook')
    .insert([{
      owner_id: ownerId,
      author_id: me.id,
      author_name: me.nickname,
      message: entry.message,
      is_secret: entry.is_secret || false
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteGuestbookEntry(id) {
  const { error } = await sb.from('guestbook').delete().eq('id', id);
  return !error;
}

async function replyToGuestbookEntry(id, replyText) {
  const { error } = await sb
    .from('guestbook')
    .update({ reply: replyText })
    .eq('id', id);
  return !error;
}

// ---------- Visits ----------

async function bumpVisit() {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem('dotori_visits');
  const visits = raw ? JSON.parse(raw) : { today: today, todayCount: 0, total: 0 };

  if (visits.today !== today) {
    visits.today = today;
    visits.todayCount = 0;
  }
  visits.todayCount += 1;
  visits.total += 1;

  localStorage.setItem('dotori_visits', JSON.stringify(visits));
  return visits;
}

function getVisits() {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem('dotori_visits');
  const visits = raw ? JSON.parse(raw) : { today: today, todayCount: 0, total: 0 };
  if (visits.today !== today) {
    return { today: today, todayCount: 0, total: visits.total };
  }
  return visits;
}

// ---------- Explore ----------

async function getAllProfiles() {
  const { data, error } = await sb
    .from('profiles')
    .select('dotori_id, nickname, status_message, mini_me, mini_me_bg, tastes, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data;
}

// ---------- Expose ----------

window.DotoriSupabase = {
  createAcorn, loadAcorn, getSession, logout,
  getProfile, getProfileByDotoriId, updateProfile,
  getTastes, updateTastes,
  getRoom, saveRoom,
  getGuestbook, addGuestbookEntry, deleteGuestbookEntry, replyToGuestbookEntry,
  bumpVisit, getVisits,
  getAllProfiles
};