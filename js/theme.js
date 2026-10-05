// ============================================
// 도토리숲 — Theme Customizer
// ============================================

// Presets — each one is a set of CSS variables
const THEME_PRESETS = [
  {
    id: 'default',
    label: '기본',
    emoji: '🌰',
    vars: {
      '--pink': '#FF9EC4',
      '--pink-dark': '#E87BA8',
      '--acorn-dark': '#8B5E2E',
      '--cream': '#FFF8F0',
      '--cream-dark': '#F0E4D4',
      '--blue': '#A8D8FF'
    }
  },
  {
    id: 'spring',
    label: '봄',
    emoji: '🌸',
    vars: {
      '--pink': '#FFB8D4',
      '--pink-dark': '#E88CB0',
      '--acorn-dark': '#A8638A',
      '--cream': '#FFF5F8',
      '--cream-dark': '#FFE4EE',
      '--blue': '#D4E8F8'
    }
  },
  {
    id: 'summer',
    label: '여름',
    emoji: '🌿',
    vars: {
      '--pink': '#88D4B8',
      '--pink-dark': '#5CB098',
      '--acorn-dark': '#3E6B5A',
      '--cream': '#F0FBF7',
      '--cream-dark': '#D8EFE6',
      '--blue': '#A8E0D0'
    }
  },
  {
    id: 'autumn',
    label: '가을',
    emoji: '🍂',
    vars: {
      '--pink': '#E8A878',
      '--pink-dark': '#C88858',
      '--acorn-dark': '#8B5E2E',
      '--cream': '#FFF6EC',
      '--cream-dark': '#F5E4CC',
      '--blue': '#D4C8A8'
    }
  },
  {
    id: 'winter',
    label: '겨울',
    emoji: '❄️',
    vars: {
      '--pink': '#B8D4E8',
      '--pink-dark': '#88B0D4',
      '--acorn-dark': '#4A6B8B',
      '--cream': '#F5FAFF',
      '--cream-dark': '#E0ECF5',
      '--blue': '#C8E0F8'
    }
  },
  {
    id: 'night',
    label: '밤',
    emoji: '🌙',
    vars: {
      '--pink': '#9E88D4',
      '--pink-dark': '#7860B0',
      '--acorn-dark': '#4A3E6B',
      '--cream': '#F5F0FF',
      '--cream-dark': '#E0D4F0',
      '--blue': '#B8A8E0'
    }
  }
];

// Variable metadata for the color pickers
const THEME_VARS = [
  { key: '--pink',      label: '포인트' },
  { key: '--pink-dark', label: '포인트 (진한)' },
  { key: '--acorn-dark', label: '글자' },
  { key: '--cream',     label: '배경 (밝은)' },
  { key: '--cream-dark', label: '배경 (테두리)' }
];

// ---------- Open the modal ----------

async function openThemeEditor() {
  // Load current theme
  let current = { theme: {}, bg_image_url: null };
  try {
    current = await DotoriStorage.getMyTheme();
  } catch (e) {
    console.warn('Theme load failed:', e);
  }

  // Merge with defaults so nothing is missing
  const defaults = THEME_PRESETS[0].vars;
  const themeVars = { ...defaults, ...(current.theme || {}) };

  const presetBtns = THEME_PRESETS.map((p) => {
    const isActive = p.id === (current.theme && current.theme.__preset);
    return `
      <button class="theme-preset-btn ${isActive ? 'active' : ''}" data-preset="${p.id}">
        <span class="theme-preset-emoji">${p.emoji}</span>
        <span class="theme-preset-label">${p.label}</span>
      </button>
    `;
  }).join('');

  const colorRows = THEME_VARS.map((v) => `
    <div class="theme-color-row">
      <label>${v.label}</label>
      <div class="theme-color-input-wrap">
        <input type="color" class="theme-color-input" data-var="${v.key}" value="${themeVars[v.key]}">
        <span class="theme-color-value">${themeVars[v.key]}</span>
      </div>
    </div>
  `).join('');

  const bgPreview = current.bg_image_url
    ? `<img src="${current.bg_image_url}" alt="" class="theme-bg-preview">`
    : `<div class="theme-bg-empty">아직 배경 이미지가 없어요</div>`;

  showModal('🎨 테마',
    `<div class="theme-editor">
      <p class="theme-editor-hint">나의 페이지 분위기를 바꿔보세요.</p>

      <label class="theme-section-label">프리셋</label>
      <div class="theme-preset-grid">${presetBtns}</div>

      <label class="theme-section-label">색상</label>
      <div class="theme-color-list">${colorRows}</div>

      <label class="theme-section-label">배경 이미지</label>
      <input type="file" id="theme-bg-file" accept="image/*" style="display:none;">
      <div class="theme-bg-wrap" id="theme-bg-wrap">${bgPreview}</div>
      <div class="theme-bg-actions">
        <button class="small-btn" id="theme-bg-upload-btn">배경 올리기</button>
        ${current.bg_image_url ? `<button class="small-btn" id="theme-bg-clear-btn">지우기</button>` : ''}
      </div>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '저장', primary: true, onClick: () => saveThemeAndClose() }
    ]
  );

  // ---------- Wiring ----------

  setTimeout(() => {
    // Presets
    document.querySelectorAll('.theme-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = THEME_PRESETS.find((p) => p.id === btn.dataset.preset);
        if (!preset) return;

        // Update active state
        document.querySelectorAll('.theme-preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Fill the color pickers
        THEME_VARS.forEach((v) => {
          const input = document.querySelector(`.theme-color-input[data-var="${v.key}"]`);
          if (input) {
            input.value = preset.vars[v.key];
            const valueEl = input.parentElement.querySelector('.theme-color-value');
            if (valueEl) valueEl.textContent = preset.vars[v.key];
          }
        });

        // Live preview
        applyVars(preset.vars);
      });
    });

    // Color pickers — live update on change
    document.querySelectorAll('.theme-color-input').forEach((input) => {
      input.addEventListener('input', () => {
        const valueEl = input.parentElement.querySelector('.theme-color-value');
        if (valueEl) valueEl.textContent = input.value;

        const vars = {};
        document.querySelectorAll('.theme-color-input').forEach((i) => {
          vars[i.dataset.var] = i.value;
        });
        applyVars(vars);
      });
    });

    // Background upload
    const fileInput = document.getElementById('theme-bg-file');
    const uploadBtn = document.getElementById('theme-bg-upload-btn');
    const clearBtn = document.getElementById('theme-bg-clear-btn');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
          alert('배경 이미지는 3MB 이하만 올릴 수 있어요.');
          return;
        }
        uploadBtn.disabled = true;
        uploadBtn.textContent = '올리는 중...';
        try {
          const compressed = await compressImage(file, 1600, 0.82);
          const url = await uploadThemeBackground(compressed);
          if (url) {
            const wrap = document.getElementById('theme-bg-wrap');
            if (wrap) wrap.innerHTML = `<img src="${url}" alt="" class="theme-bg-preview">`;
            if (clearBtn) clearBtn.style.display = '';
            window.__themePendingBg = url;
          }
        } catch (err) {
          console.error('Background upload failed:', err);
          alert('배경 이미지를 올릴 수 없어요: ' + (err.message || ''));
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = '배경 올리기';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        window.__themePendingBg = '__clear__';
        const wrap = document.getElementById('theme-bg-wrap');
        if (wrap) wrap.innerHTML = `<div class="theme-bg-empty">아직 배경 이미지가 없어요</div>`;
        clearBtn.style.display = 'none';
      });
    }
  }, 50);
}

// ---------- Apply helpers ----------

function applyVars(vars) {
  const root = document.documentElement;
  Object.keys(vars).forEach((k) => {
    root.style.setProperty(k, vars[k]);
  });
}

async function applyMyTheme() {
  try {
    const current = await DotoriStorage.getMyTheme();
    if (current.theme && Object.keys(current.theme).length > 0) {
      applyVars(current.theme);
    }
    if (current.bg_image_url) {
      document.body.style.backgroundImage = `url("${current.bg_image_url}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  } catch (e) {
    console.warn('Apply theme failed:', e);
  }
}

// ---------- Upload helper (uses the avatars bucket) ----------

async function uploadThemeBackground(file) {
  const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${user.id}/bg-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('avatars')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabaseClient.storage
    .from('avatars')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

// ---------- Save ----------

async function saveThemeAndClose() {
  // Collect the current color values
  const vars = {};
  document.querySelectorAll('.theme-color-input').forEach((i) => {
    vars[i.dataset.var] = i.value;
  });

  // Which preset was active (for re-opening)
  const activePreset = document.querySelector('.theme-preset-btn.active');
  if (activePreset) {
    vars.__preset = activePreset.dataset.preset;
  }

  // Background — either unchanged, changed, or cleared
  let bgUrl;
  const current = await DotoriStorage.getMyTheme();
  if (window.__themePendingBg === '__clear__') {
    bgUrl = null;
  } else if (window.__themePendingBg) {
    bgUrl = window.__themePendingBg;
  } else {
    bgUrl = current.bg_image_url;
  }
  window.__themePendingBg = null;

  try {
    const ok = await DotoriStorage.saveMyTheme(vars, bgUrl);
    if (!ok) {
      alert('테마를 저장할 수 없어요');
      return;
    }
    closeModal();
    applyVars(vars);
    if (bgUrl) {
      document.body.style.backgroundImage = `url("${bgUrl}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  } catch (e) {
    console.error('Save theme failed:', e);
    alert('테마 저장 실패: ' + (e.message || ''));
  }
}

// ---------- Expose ----------

window.openThemeEditor = openThemeEditor;
window.applyMyTheme = applyMyTheme;