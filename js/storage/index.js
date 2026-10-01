// ============================================
// 도토리숲 — Storage Adapter Selector
// ============================================

// Right now, only local is available.
// At Weekend 7, this will check USE_SUPABASE and load supabase.js instead.

window.DotoriStorage = window.DotoriLocal;

// Future:
// if (USE_SUPABASE) {
//   window.DotoriStorage = window.DotoriSupabase;
// } else {
//   window.DotoriStorage = window.DotoriLocal;
// }