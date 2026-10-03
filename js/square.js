// ============================================
// 도토리숲 — 도토리 광장 (Acorn Square)
// ============================================

async function initSquareTab() {
  const container = document.getElementById('tab-plaza');
  if (!container) return;

  container.innerHTML = `
    <div class="panel placeholder-panel">
      <h2>🌰 도토리 광장</h2>
      <p>작은 방들이 모이는 곳이에요.</p>
      <p class="muted">— 다음 업데이트에서 열립니다 —</p>
    </div>
  `;
}