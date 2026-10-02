// ============================================
// 도토리숲 — Storage Adapter Selector
// ============================================

if (window.USE_SUPABASE && window.DotoriSupabase) {
  window.DotoriStorage = window.DotoriSupabase;
  console.log('🌰 Storage: Supabase (online)');
} else {
  window.DotoriStorage = window.DotoriLocal;
  console.log('🌰 Storage: Local (offline)');
}
