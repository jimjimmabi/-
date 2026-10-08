// ============================================
// 도토리숲 — Supabase Storage Adapter (v2)
// ============================================

const SUPABASE_URL_FALLBACK = 'https://xdqmsrferkstomzytkoh.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcW1zcmZlcmtzdG9tenl0a29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzU5NzksImV4cCI6MjEwNjQ1MTk3OX0.d-XCXnr8LVDcoFpZCKRMfBY3x0YdupUsJHDcyX7zEB4';

const sb = window.supabase.createClient(
  window.SUPABASE_URL || SUPABASE_URL_FALLBACK,
  window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK
);

const MAX_ILCHON = 12;
const MAX_GROUP_MEMBERS = 8;

// ---------- Auth ----------

async function createAcorn(nickname) {
  const { data: { session: existingSession } } = await sb.auth.getSession();
  let userId;

  if (existingSession && existingSession.user) {
    userId = existingSession.user.id;
  } else {
    const { data: authData, error: authError } = await sb.auth.signInAnonymously();
    if (authError) throw authError;
    userId = authData.user.id;
  }

  const { data: existingProfile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    const { data: updated, error: updateError } = await sb
      .from('profiles')
      .update({ nickname })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        throw new Error('이미 누군가 사용하고 있는 닉네임이에요.');
      }
      throw updateError;
    }

    localStorage.setItem('dotori_session', JSON.stringify({
      loggedIn: true, dotori_id: updated.dotori_id, user_id: updated.id, is_owner: true
    }));
    localStorage.setItem('dotori_my_id', updated.dotori_id);
    return updated;
  }

  const dotoriId = 'dotori-' + Math.random().toString(36).substring(2, 6);

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .insert([{
      id: userId,
      dotori_id: dotoriId,
      nickname,
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

  if (profileError) {
    if (profileError.code === '23505') {
      throw new Error('이미 누군가 사용하고 있는 닉네임이에요.');
    }
    throw profileError;
  }

  await sb.from('rooms').insert([{ user_id: userId }]);

  localStorage.setItem('dotori_session', JSON.stringify({
    loggedIn: true, dotori_id: dotoriId, user_id: userId, is_owner: true
  }));
  localStorage.setItem('dotori_my_id', dotoriId);

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
    loggedIn: true, dotori_id: data.dotori_id, user_id: data.id, is_owner: true
  }));
  localStorage.setItem('dotori_my_id', data.dotori_id);

  return data;
}

async function loginByDotoriId(dotoriId) {
  const cleaned = String(dotoriId).trim().toLowerCase();

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('dotori_id', cleaned)
    .single();

  if (error || !profile) return null;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { error: authError } = await sb.auth.signInAnonymously();
    if (authError) throw authError;
  }

  localStorage.setItem('dotori_my_id', profile.dotori_id);
  localStorage.setItem('dotori_session', JSON.stringify({
    loggedIn: true,
    dotori_id: profile.dotori_id,
    user_id: profile.id,
    is_owner: true
  }));

  return profile;
}

async function getMyAcorn() {
  const myId = localStorage.getItem('dotori_my_id');
  if (!myId) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('dotori_id', myId)
    .single();

  if (error) return null;
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
  const myId = localStorage.getItem('dotori_my_id');
  if (myId) {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('dotori_id', myId)
      .single();

    if (!error && data) return data;
  }

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

async function getProfileById(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
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

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 누군가 사용하고 있는 닉네임이에요.');
    }
    throw error;
  }
  return data;
}

// ---------- Nickname availability + suggestions ----------

async function isNicknameTaken(nickname) {
  const trimmed = String(nickname).trim();
  if (!trimmed) return false;

  const { data, error } = await sb
    .from('profiles')
    .select('id')
    .eq('nickname', trimmed)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function suggestNicknames(base, count) {
  count = count || 5;
  const cleanBase = String(base || '').trim().replace(/\s+/g, '');
  if (!cleanBase) return [];

  const suggestions = [];
  const seen = new Set();

  const suffixes = ['_숲', '_forest', '_2008', '_acorn', '님', '_🌰'];

  const templates = [
    (b) => `${b}${Math.floor(Math.random() * 89) + 10}`,
    (b) => `${b}${Math.floor(Math.random() * 899) + 100}`,
    (b) => `${b}${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
    (b) => `${b}.${Math.floor(Math.random() * 89) + 10}`,
    (b) => `${b}_${Math.floor(Math.random() * 89) + 10}`
  ];

  for (let attempt = 0; attempt < 30 && suggestions.length < count; attempt++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    let candidate = template(cleanBase);

    if (candidate.length > 12) candidate = candidate.slice(0, 12);

    if (seen.has(candidate)) continue;
    seen.add(candidate);

    try {
      const taken = await isNicknameTaken(candidate);
      if (!taken) suggestions.push(candidate);
    } catch (e) {}
  }

  return suggestions;
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

// ---------- Room (Mini-Room) ----------

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

async function getRoomByDotoriId(dotoriId) {
  const owner = await getProfileByDotoriId(dotoriId);
  if (!owner) return null;

  const { data, error } = await sb
    .from('rooms')
    .select('*')
    .eq('user_id', owner.id)
    .single();

  if (error) return { layout: {}, wallpaper: 'default', floor: 'default', bgm_choice: null };
  return data;
}

async function saveMyRoom(room) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { error } = await sb
    .from('rooms')
    .update({
      layout: room.layout || {},
      wallpaper: room.wallpaper || 'default',
      floor: room.floor || 'default',
      bgm_choice: room.bgm_choice || null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  return !error;
}

async function saveMyBGM(choiceId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { error } = await sb
    .from('rooms')
    .update({
      bgm_choice: choiceId || null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  return !error;
}

async function saveRoom(room) {
  return saveMyRoom(room);
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
  const visits = raw ? JSON.parse(raw) : { today, todayCount: 0, total: 0 };
  if (visits.today !== today) { visits.today = today; visits.todayCount = 0; }
  visits.todayCount += 1;
  visits.total += 1;
  localStorage.setItem('dotori_visits', JSON.stringify(visits));
  return visits;
}

function getVisits() {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem('dotori_visits');
  const visits = raw ? JSON.parse(raw) : { today, todayCount: 0, total: 0 };
  if (visits.today !== today) return { today, todayCount: 0, total: visits.total };
  return visits;
}

// ---------- Explore ----------

async function getAllProfiles() {
  const { data, error } = await sb
    .from('profiles')
    .select('dotori_id, nickname, status_message, mini_me, mini_me_bg, mini_me_image_url, tastes, birthday, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return data;
}

// ---------- Match Score ----------

function calculateMatch(myTastes, theirTastes, myBirthday, theirBirthday) {
  if (!myTastes || !theirTastes) return { score: 0, reasons: [] };

  let score = 0;
  const reasons = [];

  const myInterests = myTastes.interests || [];
  const theirInterests = theirTastes.interests || [];
  const sharedInterests = myInterests.filter((i) => theirInterests.includes(i));
  if (sharedInterests.length >= 3) {
    score += 30;
    reasons.push(`관심사 ${sharedInterests.length}개 겹침`);
  } else if (sharedInterests.length > 0) {
    score += sharedInterests.length * 10;
    reasons.push(`관심사 ${sharedInterests.length}개 겹침`);
  }

  const myMusic = myTastes.music || [];
  const theirMusic = theirTastes.music || [];
  if (myMusic.some((m) => theirMusic.includes(m))) {
    score += 25;
    reasons.push('음악 취향 겹침');
  }

  const myMood = myTastes.mood || [];
  const theirMood = theirTastes.mood || [];
  if (myMood.some((m) => theirMood.includes(m))) {
    score += 20;
    reasons.push('감성 겹침');
  }

  const myFav = (myTastes.favorites || '').split(',').map((s) => s.trim()).filter(Boolean);
  const theirFav = (theirTastes.favorites || '').split(',').map((s) => s.trim()).filter(Boolean);
  const sharedFav = myFav.filter((f) => theirFav.some((tf) => tf.includes(f) || f.includes(tf)));
  if (sharedFav.length > 0) {
    score += 15;
    reasons.push(`"${sharedFav.slice(0, 3).join(', ')}" 겹침`);
  }

  const myNeeds = (myTastes.needs || '').toLowerCase();
  const theirCurrently = (theirTastes.currently || '').toLowerCase();
  if (myNeeds && theirCurrently) {
    const keywords = myNeeds.split(/\s+/).filter((w) => w.length >= 2);
    if (keywords.some((k) => theirCurrently.includes(k))) {
      score += 10;
      reasons.push('지금 필요한 것이 맞아요');
    }
  }

  if (myBirthday && theirBirthday) {
    if (myBirthday === theirBirthday) {
      score += 15;
      reasons.push('같은 날 생일 🎂');
    } else if (myBirthday.split('-')[0] === theirBirthday.split('-')[0]) {
      score += 8;
      reasons.push('같은 달 생일 🎂');
    }
  }

  return { score: Math.min(score, 100), reasons };
}

// ---------- Notes (쪽지) ----------

async function sendNote(recipientDotoriId, message, replyToId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요');

  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const recipient = await getProfileByDotoriId(recipientDotoriId);
  if (!recipient) throw new Error('그런 도토리를 찾을 수 없어요');
  if (recipient.id === me.id) throw new Error('자신에게는 쪽지를 보낼 수 없어요');

  const insertRow = {
    sender_id: me.id,
    recipient_id: recipient.id,
    message
  };

  if (replyToId) insertRow.reply_to_id = replyToId;

  const { data, error } = await sb
    .from('notes')
    .insert([insertRow])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getNoteById(noteId) {
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) return null;
  return data;
}

// FIXED: added getConversationWith — used by getInbox and friends.js
async function getConversationWith(dotoriId) {
  const me = await getProfile();
  if (!me) return null;

  const other = await getProfileByDotoriId(dotoriId);
  if (!other) return null;

  const { data, error } = await sb
    .from('notes')
    .select('*')
    .or(`and(sender_id.eq.${me.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me.id})`)
    .order('created_at', { ascending: true });

  if (error) { console.error('getConversationWith error:', error); return null; }

  const noteIds = data.map(n => n.id);
  const reactionsByNote = await getReactionsForNotes(noteIds);

  const notes = data.map(n => ({
    ...n,
    direction: n.sender_id === me.id ? 'sent' : 'received',
    reactions: reactionsByNote[n.id] || []
  }));

  return {
    dotori_id: other.dotori_id,
    nickname: other.nickname,
    mini_me: other.mini_me,
    mini_me_image_url: other.mini_me_image_url,
    notes: notes,
    unread: notes.filter(n => n.direction === 'received' && !n.is_read).length,
    lastAt: notes.length ? new Date(notes[notes.length - 1].created_at).getTime() : 0
  };
}

// FIXED: uses `sb` (was `supabase`), and calls getConversationWith
async function getInbox() {
  const me = await getProfile();
  if (!me) return [];

  const { data: noteData, error: noteError } = await sb
    .from('notes')
    .select('sender_id, recipient_id')
    .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`);

  if (noteError) { console.error('getInbox (notes) error:', noteError); return []; }

  const userIds = new Set();
  noteData.forEach(note => {
    if (note.sender_id !== me.id) userIds.add(note.sender_id);
    if (note.recipient_id !== me.id) userIds.add(note.recipient_id);
  });

  if (userIds.size === 0) return [];

  const { data: profiles, error: profileError } = await sb
    .from('profiles')
    .select('*')
    .in('id', Array.from(userIds));

  if (profileError) { console.error('getInbox (profiles) error:', profileError); return []; }

  const conversations = await Promise.all(
    profiles.map(p => getConversationWith(p.dotori_id))
  );

  return conversations.filter(Boolean).sort((a, b) => b.lastAt - a.lastAt);
}

async function getSentNotes() {
  const me = await getProfile();
  if (!me) return [];

  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('sender_id', me.id)
    .order('created_at', { ascending: false });

  if (error) return [];

  const recipientIds = [...new Set(data.map((n) => n.recipient_id))];
  const { data: recipients } = await sb
    .from('profiles')
    .select('id, dotori_id, nickname, mini_me, mini_me_image_url')
    .in('id', recipientIds);

  const map = {};
  (recipients || []).forEach((r) => { map[r.id] = r; });

  return data.map((n) => ({
    ...n,
    recipient: map[n.recipient_id] || { nickname: '알 수 없음', mini_me: '🌰' }
  }));
}

async function getUnreadCount() {
  const me = await getProfile();
  if (!me) return 0;

  const { count, error } = await sb
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', me.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

async function markNoteRead(noteId) {
  const { error } = await sb
    .from('notes')
    .update({ is_read: true })
    .eq('id', noteId);
  return !error;
}

// ---------- Reactions ----------

const REACTION_EMOJIS = ['❤️', '😊', '🌰', '✨', '💭'];

async function getReactionsForNotes(noteIds) {
  if (!Array.isArray(noteIds) || noteIds.length === 0) return {};

  const { data, error } = await sb
    .from('message_reactions')
    .select('*')
    .in('note_id', noteIds);

  if (error) return {};

  const grouped = {};
  data.forEach((r) => {
    if (!grouped[r.note_id]) grouped[r.note_id] = [];
    grouped[r.note_id].push(r);
  });

  return grouped;
}

async function addReaction(noteId, emoji) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const { data, error } = await sb
    .from('message_reactions')
    .insert([{
      note_id: noteId,
      user_id: me.id,
      emoji
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return null;
    throw error;
  }
  return data;
}

async function removeReaction(noteId, emoji) {
  const me = await getProfile();
  if (!me) return false;

  const { error } = await sb
    .from('message_reactions')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', me.id)
    .eq('emoji', emoji);

  return !error;
}

async function toggleReaction(noteId, emoji) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const { data: existing } = await sb
    .from('message_reactions')
    .select('id')
    .eq('note_id', noteId)
    .eq('user_id', me.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await removeReaction(noteId, emoji);
    return { action: 'removed' };
  } else {
    await addReaction(noteId, emoji);
    return { action: 'added' };
  }
}

// ---------- Friends (일촌) ----------

async function getMyIlchonCount() {
  const me = await getProfile();
  if (!me) return 0;

  const { data, error } = await sb
    .from('ilchon')
    .select('*')
    .or(`user_a.eq.${me.id},user_b.eq.${me.id}`);

  if (error) return 0;
  return data.length;
}

async function isIlchon(dotoriId) {
  const me = await getProfile();
  if (!me) return false;

  const other = await getProfileByDotoriId(dotoriId);
  if (!other) return false;

  const [a, b] = [me.id, other.id].sort();
  const { data, error } = await sb
    .from('ilchon')
    .select('*')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function hasPendingRequestTo(dotoriId) {
  const me = await getProfile();
  if (!me) return false;

  const other = await getProfileByDotoriId(dotoriId);
  if (!other) return false;

  const { data, error } = await sb
    .from('friend_requests')
    .select('*')
    .eq('sender_id', me.id)
    .eq('recipient_id', other.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function sendFriendRequest(recipientDotoriId) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const recipient = await getProfileByDotoriId(recipientDotoriId);
  if (!recipient) throw new Error('그런 도토리를 찾을 수 없어요');
  if (recipient.id === me.id) throw new Error('자신에게는 신청할 수 없어요');

  const myCount = await getMyIlchonCount();
  if (myCount >= MAX_ILCHON) {
    throw new Error('일촌은 12명까지만 될 수 있어요. 진짜 친구는 그 정도면 충분해요.');
  }

  const already = await isIlchon(recipientDotoriId);
  if (already) throw new Error('이미 일촌이에요');

  const pending = await hasPendingRequestTo(recipientDotoriId);
  if (pending) throw new Error('이미 신청했어요');

  const { data, error } = await sb
    .from('friend_requests')
    .insert([{
      sender_id: me.id,
      recipient_id: recipient.id,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 신청했어요');
    throw error;
  }
  return data;
}

async function getPendingRequests() {
  const me = await getProfile();
  if (!me) return [];

  const { data, error } = await sb
    .from('friend_requests')
    .select('*')
    .eq('recipient_id', me.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];

  const senderIds = [...new Set(data.map((r) => r.sender_id))];
  const { data: senders } = await sb
    .from('profiles')
    .select('id, dotori_id, nickname, mini_me, mini_me_bg, mini_me_image_url, status_message')
    .in('id', senderIds);

  const map = {};
  (senders || []).forEach((s) => { map[s.id] = s; });

  return data.map((r) => ({
    ...r,
    sender: map[r.sender_id] || { nickname: '알 수 없음', mini_me: '🌰' }
  }));
}

async function acceptFriendRequest(requestId) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const myCount = await getMyIlchonCount();
  if (myCount >= MAX_ILCHON) throw new Error('일촌은 12명까지만 될 수 있어요.');

  const { data: request, error: reqErr } = await sb
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !request) throw new Error('신청을 찾을 수 없어요');

  await sb
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  const [a, b] = [me.id, request.sender_id].sort();

  const { error: ilErr } = await sb
    .from('ilchon')
    .insert([{ user_a: a, user_b: b }]);

  if (ilErr && ilErr.code !== '23505') throw ilErr;
  return true;
}

async function declineFriendRequest(requestId) {
  const { error } = await sb
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  return !error;
}

async function getIlchon() {
  const me = await getProfile();
  if (!me) return [];

  const { data, error } = await sb
    .from('ilchon')
    .select('*')
    .or(`user_a.eq.${me.id},user_b.eq.${me.id}`);

  if (error) return [];

  const friendIds = data.map((row) => row.user_a === me.id ? row.user_b : row.user_a);
  if (friendIds.length === 0) return [];

  const { data: friends } = await sb
    .from('profiles')
    .select('id, dotori_id, nickname, mini_me, mini_me_bg, mini_me_image_url, status_message')
    .in('id', friendIds);

  return (friends || []).map((f) => ({
    ...f,
    ilchon_at: data.find((row) => row.user_a === f.id || row.user_b === f.id)?.created_at
  }));
}

// ---------- Acorn Square (Groups) ----------

async function createGroup(name, description) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const { data: codeData, error: codeErr } = await sb.rpc('generate_invite_code');
  if (codeErr) throw codeErr;

  const code = codeData;

  const { data: group, error: groupErr } = await sb
    .from('groups')
    .insert([{
      code,
      name,
      description: description || '',
      creator_id: me.id
    }])
    .select()
    .single();

  if (groupErr) throw groupErr;

  const { error: joinErr } = await sb
    .from('group_members')
    .insert([{ group_id: group.id, user_id: me.id }]);

  if (joinErr) throw joinErr;

  return group;
}

async function joinGroupByCode(code) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const trimmed = String(code).trim().toUpperCase();

  const { data: group, error: groupErr } = await sb
    .from('groups')
    .select('*')
    .eq('code', trimmed)
    .maybeSingle();

  if (groupErr || !group) throw new Error('그런 코드를 찾을 수 없어요');

  const { data: existing } = await sb
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_id', me.id)
    .maybeSingle();

  if (existing) return group;

  const { count, error: countErr } = await sb
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id);

  if (countErr) throw countErr;
  if ((count || 0) >= group.max_members) {
    throw new Error('이 방은 이미 가득 찼어요 (' + group.max_members + '명까지)');
  }

  const { error: joinErr } = await sb
    .from('group_members')
    .insert([{ group_id: group.id, user_id: me.id }]);

  if (joinErr) throw joinErr;

  return group;
}

async function getMyGroups() {
  const me = await getProfile();
  if (!me) return [];

  const { data: memberships, error: memErr } = await sb
    .from('group_members')
    .select('group_id')
    .eq('user_id', me.id);

  if (memErr || !memberships.length) return [];

  const groupIds = memberships.map((m) => m.group_id);

  const { data: groups, error: groupErr } = await sb
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (groupErr) return [];

  const enriched = await Promise.all(groups.map(async (g) => {
    const { count } = await sb
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id);

    const { count: entryCount } = await sb
      .from('group_entries')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id);

    return {
      ...g,
      member_count: count || 0,
      entry_count: entryCount || 0
    };
  }));

  return enriched;
}

async function getGroupById(groupId) {
  const { data, error } = await sb
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function getGroupMembers(groupId) {
  const { data, error } = await sb
    .from('group_members')
    .select('user_id, joined_at')
    .eq('group_id', groupId);

  if (error) return [];

  const userIds = data.map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, dotori_id, nickname, mini_me, mini_me_bg, status_message')
    .in('id', userIds);

  const map = {};
  (profiles || []).forEach((p) => { map[p.id] = p; });

  return data.map((m) => ({
    ...map[m.user_id],
    joined_at: m.joined_at
  })).filter((m) => m.dotori_id);
}

async function leaveGroup(groupId) {
  const me = await getProfile();
  if (!me) return false;

  const { error } = await sb
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', me.id);

  return !error;
}

async function deleteGroup(groupId) {
  const me = await getProfile();
  if (!me) return false;

  const { data: group } = await sb
    .from('groups')
    .select('creator_id')
    .eq('id', groupId)
    .maybeSingle();

  if (!group || group.creator_id !== me.id) return false;

  const { error } = await sb.from('groups').delete().eq('id', groupId);
  return !error;
}

async function getGroupEntries(groupId, limit = 100) {
  const { data, error } = await sb
    .from('group_entries')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  const authorIds = [...new Set(data.map((e) => e.author_id))];
  const { data: authors } = await sb
    .from('profiles')
    .select('id, dotori_id, nickname, mini_me, mini_me_bg')
    .in('id', authorIds);

  const map = {};
  (authors || []).forEach((a) => { map[a.id] = a; });

  return data.map((e) => ({
    ...e,
    author: map[e.author_id] || { nickname: '알 수 없음', mini_me: '🌰' }
  }));
}

async function postGroupEntry(groupId, message) {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const { data, error } = await sb
    .from('group_entries')
    .insert([{
      group_id: groupId,
      author_id: me.id,
      message
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteGroupEntry(entryId) {
  const { error } = await sb
    .from('group_entries')
    .delete()
    .eq('id', entryId);
  return !error;
}

// ---------- Photos ----------

async function uploadAvatar(file) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요');

  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${me.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from('avatars')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filename);

  const { data, error } = await sb
    .from('profiles')
    .update({ mini_me_image_url: urlData.publicUrl })
    .eq('id', me.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function clearAvatar() {
  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  if (me.mini_me_image_url) {
    try {
      const url = new URL(me.mini_me_image_url);
      const path = url.pathname.split('/avatars/')[1];
      if (path) {
        await sb.storage.from('avatars').remove([path]);
      }
    } catch (e) {
      console.warn('Could not delete old avatar file:', e);
    }
  }

  const { data, error } = await sb
    .from('profiles')
    .update({ mini_me_image_url: null })
    .eq('id', me.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function uploadPhoto(file, caption) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요');

  const me = await getProfile();
  if (!me) throw new Error('내 정보를 찾을 수 없어요');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${me.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from('photos')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = sb.storage.from('photos').getPublicUrl(filename);

  const { data, error } = await sb
    .from('photo_album')
    .insert([{
      owner_id: me.id,
      image_url: urlData.publicUrl,
      caption: caption || ''
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyPhotos() {
  const me = await getProfile();
  if (!me) return [];

  const { data, error } = await sb
    .from('photo_album')
    .select('*')
    .eq('owner_id', me.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

async function getPhotosByDotoriId(dotoriId) {
  const owner = await getProfileByDotoriId(dotoriId);
  if (!owner) return [];

  const { data, error } = await sb
    .from('photo_album')
    .select('*')
    .eq('owner_id', owner.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

async function deletePhoto(photoId) {
  const me = await getProfile();
  if (!me) return false;

  const { data: photo } = await sb
    .from('photo_album')
    .select('*')
    .eq('id', photoId)
    .single();

  if (!photo || photo.owner_id !== me.id) return false;

  const url = new URL(photo.image_url);
  const path = url.pathname.split('/photos/')[1];

  if (path) await sb.storage.from('photos').remove([path]);

  const { error } = await sb.from('photo_album').delete().eq('id', photoId);
  return !error;
}

// ---------- Realtime ----------

function subscribeToNotes(callback) {
  const channel = sb
    .channel('notes-live')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notes'
    }, (payload) => callback(payload.new))
    .subscribe();
  return channel;
}

function subscribeToFriendRequests(callback) {
  const channel = sb
    .channel('friend-requests-live')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'friend_requests'
    }, (payload) => callback(payload))
    .subscribe();
  return channel;
}

function subscribeToPhotos(callback) {
  const channel = sb
    .channel('photos-live')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'photo_album'
    }, (payload) => callback(payload))
    .subscribe();
  return channel;
}

function subscribeToMyNotes(callback) {
  const channel = sb
    .channel('my-notes-live')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notes'
    }, (payload) => callback(payload.new))
    .subscribe();
  return channel;
}

function subscribeToReactions(callback) {
  const channel = sb
    .channel('reactions-live')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'message_reactions'
    }, (payload) => callback(payload))
    .subscribe();
  return channel;
}

function subscribeToGroupEntries(groupId, callback) {
  const channel = sb
    .channel('group-entries-' + groupId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'group_entries',
      filter: `group_id=eq.${groupId}`
    }, (payload) => callback(payload))
    .subscribe();
  return channel;
}

// ---------- Expose ----------

window.DotoriSupabase = {
  MAX_ILCHON,
  MAX_GROUP_MEMBERS,
  REACTION_EMOJIS,

  createAcorn, loadAcorn, loginByDotoriId, getMyAcorn, getSession, logout,
  getProfile, getProfileById, getProfileByDotoriId, updateProfile,
  isNicknameTaken, suggestNicknames,
  getTastes, updateTastes,
  getRoom, getRoomByDotoriId, saveMyRoom, saveMyBGM, saveRoom,
  getGuestbook, addGuestbookEntry, deleteGuestbookEntry, replyToGuestbookEntry,
  bumpVisit, getVisits,
  getAllProfiles, calculateMatch,

  sendNote, getNoteById, getInbox, getConversationWith, getSentNotes, getUnreadCount, markNoteRead,

  getReactionsForNotes, addReaction, removeReaction, toggleReaction,

  getMyIlchonCount, isIlchon, hasPendingRequestTo,
  sendFriendRequest, getPendingRequests,
  acceptFriendRequest, declineFriendRequest, getIlchon,

  createGroup, joinGroupByCode, getMyGroups, getGroupById, getGroupMembers,
  leaveGroup, deleteGroup, getGroupEntries, postGroupEntry, deleteGroupEntry,

  uploadPhoto, getMyPhotos, getPhotosByDotoriId, deletePhoto,
  uploadAvatar, clearAvatar,

  subscribeToNotes, subscribeToFriendRequests, subscribeToPhotos,
  subscribeToMyNotes, subscribeToReactions, subscribeToGroupEntries
};