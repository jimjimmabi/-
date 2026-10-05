// ============================================
// 도토리숲 — Theme Customizer
// ============================================

// 8 preset themes — each one is a full 2008 vibe
const THEME_PRESETS = {
  basic: {
    name: '기본',
    accent: '#FF9EC4',
    bg_color: '#F5F5F5',
    panel_color: '#FFFFFF',
    border_color: '#CCCCCC'
  },
  pink: {
    name: '핑크 드림',
    accent: '#FF69B4',
    bg_color: '#FFF0F8',
    panel_color: '#FFFFFF',
    border_color: '#FFC8DD'
  },
  sky: {
    name: '하늘',
    accent: '#6FB8E8',
    bg_color: '#EAF6FF',
    panel_color: '#FFFFFF',
    border_color: '#A8D8FF'
  },
  mint: {
    name: '민트',
    accent: '#4ECBA8',
    bg_color: '#E8F6EE',
    panel_color: '#FFFFFF',
    border_color: '#B8E6D0'
  },
  cream: {
    name: '크림 라떼',
    accent: '#C68B4A',
    bg_color: '#FFF8F0',
    panel_color: '#FFFFFF',
    border_color: '#E0D6C4'
  },
  night: {
    name: '밤의 숲',
    accent: '#A88BD4',
    bg_color: '#2A2A4A',
    panel_color: '#3A3A5A',
    border_color: '#5A5A7A'
  },
  cherry: {
    name: '벚꽃',
    accent: '#FFB8D4',
    bg_color: '#FFF5F8',
    panel_color: '#FFFFFF',
    border_color: '#FFD4E8'
  },
  rain: {
    name: '비 오는 날',
    accent: '#7A9FBF',
    bg_color: '#EEF3F8',
    panel_color: '#FFFFFF',
    border_color: '#C4D4E0'
  }
};

// Working state — the theme we're editing
let themeDraft = {
  theme_preset: 'basic',
  theme_accent: null,
  theme_bg_color: null,
  theme_panel_color: null,
  theme_border_color: null,
  theme_bg_image_url: null
};

// ---------- Open the customizer ----------
async function openThemeEditor() {
  const profile = await DotoriStorage.getProfile();
  if (!profile) return;

  // Load existing theme into draft
  themeDraft = {
    theme_preset: profile.theme_preset || 'basic',
    theme_accent: profile.theme_accent || null,
    theme_bg_color: profile.theme_bg_color || null,
    theme_panel_color: profile.theme_panel_color || null,
    theme_border_color: profile.theme_border_color || null,
    theme_bg_image_url: profile.theme_bg_image_url || null
  };

  // Build preset buttons
  const presetBtns = Object.entries(THEME_PRESETS).map(([id, t]) => {
    const isActive = themeDraft.theme_preset === id && !themeDraft.theme_bg_image_url;
    return `
      <button class="theme-preset-btn ${isActive ? 'active' : ''}" data-preset="${id}">
        <div class="theme-preset-swatch" style="background: linear-gradient(135deg, ${t.bg_color} 0%, ${t.bg_color} 50%, ${t.accent} 50%, ${t.accent} 100%);"></div>
        <div class="theme-preset-name">${t.name}</div>
      </button>
    `;
  }).join('');

  showModal('🎨 테마 꾸미기',
    `<div class="theme-editor">
      <div class="theme-editor-preview">
        <div class="theme-editor-preview-label">미리보기</div>
        <div class="theme-editor-preview-stage" id="theme-preview-stage">
          <div class="theme-editor-preview-panel" id="theme-preview-panel">
            <div class="theme-editor-preview-title" id="theme-preview-title">내 미니홈피</div>
            <div class="theme-editor-preview-line">오늘도 화이팅 ♡</div>
          </div>
        </div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">프리셋 스킨</div>
        <div class="theme-presets">${presetBtns}</div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">포인트 색</div>
        <div class="theme-color-row">
          <input type="color" id="theme-accent-input" value="${themeDraft.theme_accent || '#FF9EC4'}" class="theme-color-input">
          <span class="theme-color-value" id="theme-accent-value">${themeDraft.theme_accent || '기본'}</span>
          <button class="theme-color-clear" data-target="accent">초기화</button>
        </div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">배경 색</div>
        <div class="theme-color-row">
          <input type="color" id="theme-bg-input" value="${themeDraft.theme_bg_color || '#F5F5F5'}" class="theme-color-input">
          <span class="theme-color-value" id="theme-bg-value">${themeDraft.theme_bg_color || '기본'}</span>
          <button class="theme-color-clear" data-target="bg">초기화</button>
        </div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">패널 색</div>
        <div class="theme-color-row">
          <input type="color" id="theme-panel-input" value="${themeDraft.theme_panel_color || '#FFFFFF'}" class="theme-color-input">
          <span class="theme-color-value" id="theme-panel-value">${themeDraft.theme_panel_color || '기본'}</span>
          <button class="theme-color-clear" data-target="panel">초기화</button>
        </div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">테두리 색</div>
        <div class="theme-color-row">
          <input type="color" id="theme-border-input" value="${themeDraft.theme_border_color || '#CCCCCC'}" class="theme-color-input">
          <span class="theme-color-value" id="theme-border-value">${themeDraft.theme_border_color || '기본'}</span>
          <button class="theme-color-clear" data-target="border">초기화</button>
        </div>
      </div>

      <div class="theme-editor-section">
        <div class="theme-editor-section-title">배경 이미지</div>
        <div class="theme-bg-upload">
          <input type="file" id="theme-bg-file" accept="image/*" style="display:none;">
          <button class="small-btn" id="theme-bg-pick-btn" style="width:100%;">
            🖼️ 이미지 올리기
          </button>
          <div class="theme-bg-preview-wrap hidden" id="theme-bg-preview-wrap">
            <img id="theme-bg-preview" class="theme-bg-preview" src="">
            <button class="small-btn" id="theme-bg-clear-btn" style="margin-top:6px; width:100%;">
              ✕ 배경 이미지 지우기
            </button>
          </div>
        </div>
      </div>
    </div>`,
    [
      { label: '취소', onClick: closeThemeEditor },
      { label: '저장', primary: true, onClick: saveThemeFromEditor }
    ]
  );

  // Wire everything
  setTimeout(() => {
    // Preset click
    document.querySelectorAll('.theme-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.dataset.preset;
        applyPresetToDraft(presetId);

        // Update input values
        const p = THEME_PRESETS[presetId];
        document.getElementById('theme-accent-input').value = p.accent;
        document.getElementById('theme-bg-input').value = p.bg_color;
        document.getElementById('theme-panel-input').value = p.panel_color;
        document.getElementById('theme-border-input').value = p.border_color;
        document.getElementById('theme-accent-value').textContent = p.accent;
        document.getElementById('theme-bg-value').textContent = p.bg_color;
        document.getElementById('theme-panel-value').textContent = p.panel_color;
        document.getElementById('theme-border-value').textContent = p.border_color;

        // Update preset active state
        document.querySelectorAll('.theme-preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        updateThemePreview();
      });
    });

    // Color pickers
    const colorInputs = [
      { input: 'theme-accent-input', value: 'theme-accent-value', key: 'theme_accent' },
      { input: 'theme-bg-input', value: 'theme-bg-value', key: 'theme_bg_color' },
      { input: 'theme-panel-input', value: 'theme-panel-value', key: 'theme_panel_color' },
      { input: 'theme-border-input', value: 'theme-border-value', key: 'theme_border_color' }
    ];

    colorInputs.forEach(({ input, value, key }) => {
      const inputEl = document.getElementById(input);
      const valueEl = document.getElementById(value);
      if (!inputEl) return;

      inputEl.addEventListener('input', (e) => {
        themeDraft[key] = e.target.value;
        valueEl.textContent = e.target.value;
        // Clear preset active state when customizing
        themeDraft.theme_preset = 'custom';
        document.querySelectorAll('.theme-preset-btn').forEach((b) => b.classList.remove('active'));
        updateThemePreview();
      });
    });

    // Clear buttons
    document.querySelectorAll('.theme-color-clear').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const map = {
          accent: { key: 'theme_accent', input: 'theme-accent-input', val: 'theme-accent-value', def: '#FF9EC4' },
          bg: { key: 'theme_bg_color', input: 'theme-bg-input', val: 'theme-bg-value', def: '#F5F5F5' },
          panel: { key: 'theme_panel_color', input: 'theme-panel-input', val: 'theme-panel-value', def: '#FFFFFF' },
          border: { key: 'theme_border_color', input: 'theme-border-input', val: 'theme-border-value', def: '#CCCCCC' }
        };
        const m = map[target];
        if (!m) return;
        themeDraft[m.key] = null;
        themeDraft.theme_preset = 'custom';
        document.getElementById(m.input).value = m.def;
        document.getElementById(m.val).textContent = '기본';
        document.querySelectorAll('.theme-preset-btn').forEach((b) => b.classList.remove('active'));
        updateThemePreview();
      });
    });

    // Background image upload
    const pickBtn = document.getElementById('theme-bg-pick-btn');
    const fileInput = document.getElementById('theme-bg-file');
    const previewWrap = document.getElementById('theme-bg-preview-wrap');
    const previewImg = document.getElementById('theme-bg-preview');
    const clearBtn = document.getElementById('theme-bg-clear-btn');

    if (themeDraft.theme_bg_image_url) {
      previewWrap.classList.remove('hidden');
      previewImg.src = themeDraft.theme_bg_image_url;
    }

    if (pickBtn && fileInput) {
      pickBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          alert('이미지는 2MB 이하만 올릴 수 있어요.');
          return;
        }
        pickBtn.disabled = true;
        pickBtn.textContent = '올리는 중...';
        try {
          const compressed = await compressImage(file, 1600, 0.85);
          const url = await DotoriStorage.uploadBackground(compressed);
          themeDraft.theme_bg_image_url = url;
          previewImg.src = url;
          previewWrap.classList.remove('hidden');
          updateThemePreview();
        } catch (err) {
          console.error('Background upload failed:', err);
          alert('이미지를 올릴 수 없어요: ' + (err.message || ''));
        } finally {
          pickBtn.disabled = false;
          pickBtn.textContent = '🖼️ 이미지 올리기';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm('배경 이미지를 지울까요?')) return;
        try {
          await DotoriStorage.clearBackground();
          themeDraft.theme_bg_image_url = null;
          previewWrap.classList.add('hidden');
          updateThemePreview();
        } catch (err) {
          console.error('Clear background failed:', err);
          alert('지울 수 없어요: ' + (err.message || ''));
        }
      });
    }

    updateThemePreview();
  }, 50);
}

function applyPresetToDraft(presetId) {
  const p = THEME_PRESETS[presetId];
  if (!p) return;
  themeDraft.theme_preset = presetId;
  themeDraft.theme_accent = p.accent;
  themeDraft.theme_bg_color = p.bg_color;
  themeDraft.theme_panel_color = p.panel_color;
  themeDraft.theme_border_color = p.border_color;
  // Preset keeps the background image (if one was uploaded)
}

function updateThemePreview() {
  const stage = document.getElementById('theme-preview-stage');
  const panel = document.getElementById('theme-preview-panel');
  const title = document.getElementById('theme-preview-title');
  if (!stage || !panel) return;

  const accent = themeDraft.theme_accent || '#FF9EC4';
  const bg = themeDraft.theme_bg_color || '#F5F5F5';
  const panelColor = themeDraft.theme_panel_color || '#FFFFFF';
  const border = themeDraft.theme_border_color || '#CCCCCC';

  // Stage background
  if (themeDraft.theme_bg_image_url) {
    stage.style.backgroundImage = `url("${themeDraft.theme_bg_image_url}")`;
    stage.style.backgroundSize = 'cover';
    stage.style.backgroundPosition = 'center';
  } else {
    stage.style.backgroundImage = 'none';
    stage.style.background = bg;
  }

  // Panel
  panel.style.background = panelColor;
  panel.style.borderColor = border;
  if (title) title.style.color = accent;
}

function closeThemeEditor() {
  closeModal();
}

async function saveThemeFromEditor() {
  const saveBtn = document.querySelector('.modal-footer .small-btn.primary');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }

  try {
    const ok = await DotoriStorage.saveTheme(themeDraft);
    if (ok) {
      // Apply to the current page immediately
      const profile = await DotoriStorage.getProfile();
      if (typeof applyTheme === 'function' && profile) {
        applyTheme(profile);
      }
      closeModal();
      if (typeof showToast === 'function') {
        showToast({
          mini_me: '🎨',
          title: '저장했어요',
          body: '테마가 저장되었어요.'
        });
      }
    } else {
      alert('저장할 수 없어요');
    }
  } catch (e) {
    console.error('Save theme failed:', e);
    alert('저장 실패: ' + (e.message || ''));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  }
}

// ---------- Apply theme to the whole page ----------
function applyTheme(profile) {
  if (!profile) return;

  const root = document.documentElement;

  // Accent color
  if (profile.theme_accent) {
    root.style.setProperty('--pink', profile.theme_accent);
    // Derive a darker shade for hover states
    root.style.setProperty('--pink-dark', darkenHex(profile.theme_accent, 0.15));
  } else {
    root.style.removeProperty('--pink');
    root.style.removeProperty('--pink-dark');
  }

  // Panel color
  if (profile.theme_panel_color) {
    root.style.setProperty('--panel', profile.theme_panel_color);
  } else {
    root.style.removeProperty('--panel');
  }

  // Border color
  if (profile.theme_border_color) {
    root.style.setProperty('--border', profile.theme_border_color);
  } else {
    root.style.removeProperty('--border');
  }

  // Background image (applied to body)
  const body = document.body;
  if (profile.theme_bg_image_url) {
    body.style.backgroundImage = `url("${profile.theme_bg_image_url}")`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
  } else if (profile.theme_bg_color) {
    body.style.backgroundImage = 'none';
    body.style.background = profile.theme_bg_color;
  } else {
    body.style.backgroundImage = 'none';
    body.style.background = '';
  }
}

// Small helper: darken a hex color by `amount` (0-1)
function darkenHex(hex, amount) {
  if (!hex || hex[0] !== '#') return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Expose
window.openThemeEditor = openThemeEditor;
window.applyTheme = applyTheme;
window.THEME_PRESETS = THEME_PRESETS;