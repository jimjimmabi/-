// ============================================
// 도토리숲 — Profile, Taste, Settings (Supabase-ready)
// ============================================

const MINI_ME_OPTIONS = ['🌰', '🦊', '🐰', '🐱', '🐻', '🌱', '🍀', '🌸'];

const MINI_ME_BG_OPTIONS = [
  { name: '하늘', value: '#EAF6FF' },
  { name: '크림', value: '#FFF8F0' },
  { name: '핑크', value: '#FFE8F0' },
  { name: '민트', value: '#E8F6EE' },
  { name: '라벤더', value: '#F0EAF8' },
  { name: '살구', value: '#FFEEE0' }
];

const INTEREST_OPTIONS = [
  '영화', '요리', '게임', '독서', '산책', '사진', '음악 만들기',
  '그림', '여행', '커피', '반려동물', '식물', '수집', '만화'
];

const MUSIC_OPTIONS = [
  '발라드', '인디', '클래식', '90년대 팝', '재즈',
  '게임 OST', 'Lo-fi', 'R&B', '록', 'K-POP'
];

const MOOD_OPTIONS = [
  '따뜻한', '조용한', '몽글몽글', '시크한', '유쾌한',
  '새벽감성', '포근한', '차분한', '활기찬'
];

// ---------- Profile Editor ----------

async function openProfileEditor() {
  const profile = await DotoriStorage.getProfile();
  if (!profile) return;

  // Which sub-tab is active: 'avatar' or 'pet'
  // Default: show the tab that matches the current mode
  let activeTab = profile.mini_me_image_url ? 'avatar' : 'pet';

  // Prepare pet tab content
  const miniMeBtns = MINI_ME_OPTIONS.map((emoji) => {
    const isActive = profile.mini_me === emoji;
    return `<button class="mini-me-option ${isActive ? 'active' : ''}" data-emoji="${emoji}">${emoji}</button>`;
  }).join('');

  const bgBtns = MINI_ME_BG_OPTIONS.map((bg) => {
    const isActive = profile.mini_me_bg === bg.value;
    return `<button class="bg-option ${isActive ? 'active' : ''}"
      data-bg="${bg.value}" style="background:${bg.value};"
      title="${bg.name}"></button>`;
  }).join('');

  // Birthday dropdown values
  const birthdayParts = profile.birthday ? profile.birthday.split('-') : ['', ''];

  showModal('프로필 수정',
    `<div class="editor-form profile-editor">
      <label>닉네임</label>
      <input type="text" id="edit-nickname" maxlength="12"
        value="${escapeHtml(profile.nickname)}" class="editor-input">

      <label>상태 메시지</label>
      <input type="text" id="edit-status" maxlength="40"
        value="${escapeHtml(profile.status_message || '')}" class="editor-input">

      <label>생일 <span class="hint">월·일 (선택사항)</span></label>
      <div class="birthday-inputs">
        <select id="edit-birthday-month" class="editor-input birthday-select">
          <option value="">월</option>
          ${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const monthStr = String(m).padStart(2, '0');
            const isSelected = birthdayParts[0] === monthStr;
            return `<option value="${monthStr}" ${isSelected ? 'selected' : ''}>${m}월</option>`;
          }).join('')}
        </select>
        <select id="edit-birthday-day" class="editor-input birthday-select">
          <option value="">일</option>
          ${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
            const dayStr = String(d).padStart(2, '0');
            const isSelected = birthdayParts[1] === dayStr;
            return `<option value="${dayStr}" ${isSelected ? 'selected' : ''}>${d}일</option>`;
          }).join('')}
        </select>
      </div>

      <label style="margin-top:18px;">미니미</label>
      <div class="profile-subtabs">
        <button class="profile-subtab ${activeTab === 'avatar' ? 'active' : ''}" data-subtab="avatar">
          🖼️ 아바타
        </button>
        <button class="profile-subtab ${activeTab === 'pet' ? 'active' : ''}" data-subtab="pet">
          🐱 펫
        </button>
      </div>

      <div class="profile-subtab-content ${activeTab === 'avatar' ? 'active' : ''}" data-subtab-content="avatar">
        <div class="mini-me-preview-wrap">
          <div class="mini-me-preview" id="avatar-preview" style="background:${profile.mini_me_bg || '#EAF6FF'};">
            ${profile.mini_me_image_url
              ? `<img src="${profile.mini_me_image_url}" alt="" class="mini-me-preview-img" id="avatar-preview-img">`
              : `<span class="mini-me-preview-emoji" id="avatar-preview-emoji">${profile.mini_me || '🌰'}</span>`}
          </div>
          <div class="mini-me-preview-actions">
            <button type="button" class="small-btn" id="upload-avatar-btn">🖼️ 이미지 올리기</button>
            ${profile.mini_me_image_url
              ? `<button type="button" class="small-btn" id="clear-avatar-btn">🗑️ 이미지 지우기</button>`
              : ''}
          </div>
          <input type="file" id="avatar-file" accept="image/*" style="display:none;">
          <p class="hint" style="margin-top:8px; color:#888; font-size:10px; text-align:center;">
            이미지를 올리면 프로필에 사진이 표시됩니다.<br>
            지우면 펫 이모지로 돌아가요.
          </p>
        </div>
      </div>

      <div class="profile-subtab-content ${activeTab === 'pet' ? 'active' : ''}" data-subtab-content="pet">
        <label>펫 선택</label>
        <div class="mini-me-options">${miniMeBtns}</div>

        <label>배경색</label>
        <div class="bg-options">${bgBtns}</div>
      </div>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '저장', primary: true, onClick: async () => {
        const nickname = document.getElementById('edit-nickname').value.trim();
        if (!nickname) return;

        const statusMessage = document.getElementById('edit-status').value.trim();
        const monthVal = document.getElementById('edit-birthday-month').value;
        const dayVal = document.getElementById('edit-birthday-day').value;
        const birthday = (monthVal && dayVal) ? `${monthVal}-${dayVal}` : null;

        // Build the update object
        const updates = {
          nickname: nickname,
          status_message: statusMessage,
          birthday: birthday
        };

        if (activeTab === 'pet') {
          // Pet tab: pick the emoji + bg, and clear any image
          const activeEmoji = document.querySelector('.mini-me-option.active');
          const activeBg = document.querySelector('.bg-option.active');

          updates.mini_me = activeEmoji ? activeEmoji.dataset.emoji : profile.mini_me;
          updates.mini_me_bg = activeBg ? activeBg.dataset.bg : profile.mini_me_bg;
          updates.mini_me_image_url = null; // pet choice wins
        } else {
          // Avatar tab: keep whatever image state was set by upload/clear
          // (uploadAvatar/clearAvatar already wrote to the DB directly)
          // Just preserve the bg if the user didn't change it
          // No mini_me_image_url update here — the avatar actions handle it
        }

        try {
          await DotoriStorage.updateProfile(updates);
          closeModal();
          const updated = await DotoriStorage.getProfile();
          await renderHome(updated);
        } catch (err) {
          const isTaken = err && err.message && err.message.includes('닉네임');
          if (isTaken) {
            let suggestionsHtml = '';
            try {
              const suggestions = await DotoriStorage.suggestNicknames(nickname, 5);
              if (suggestions.length > 0) {
                suggestionsHtml = `
                  <p style="font-size:11px; color:#888; margin-top:12px; margin-bottom:6px;">
                    이런 이름은 어떠세요?
                  </p>
                  <div class="nickname-suggestions">
                    ${suggestions.map((s) => `
                      <button class="nickname-suggestion-btn" data-nickname="${escapeHtml(s)}">
                        ${escapeHtml(s)}
                      </button>
                    `).join('')}
                  </div>
                `;
              }
            } catch (e) {
              console.warn('Suggestion failed:', e);
            }
            showModal('이미 사용 중인 닉네임이에요',
              `누군가 <strong>${escapeHtml(nickname)}</strong>을(를) 사용하고 있어요.<br>
              <span style="color:#888; font-size:11px;">다른 이름을 골라주세요.</span>
              ${suggestionsHtml}`,
              [{ label: '확인', primary: true, onClick: closeModal }]
            );
            setTimeout(() => {
              document.querySelectorAll('.nickname-suggestion-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                  const chosen = btn.dataset.nickname;
                  closeModal();
                  setTimeout(() => openProfileEditor(), 100);
                });
              });
            }, 50);
          } else {
            alert(err.message || '저장할 수 없어요');
          }
        }
      }}
    ]
  );

  // ---------- Wire up after modal opens ----------

  setTimeout(() => {
    // Sub-tab switching
    document.querySelectorAll('.profile-subtab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.subtab;
        activeTab = target;

        // Toggle active tab button
        document.querySelectorAll('.profile-subtab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Toggle active content
        document.querySelectorAll('.profile-subtab-content').forEach((c) => c.classList.remove('active'));
        const targetContent = document.querySelector(`.profile-subtab-content[data-subtab-content="${target}"]`);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // Pet emoji selection
    document.querySelectorAll('.mini-me-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mini-me-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Background color selection
    document.querySelectorAll('.bg-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bg-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Live-update the avatar preview background
        const preview = document.getElementById('avatar-preview');
        if (preview) preview.style.backgroundColor = btn.dataset.bg;
      });
    });

    // Avatar upload
    const uploadBtn = document.getElementById('upload-avatar-btn');
    const clearBtn = document.getElementById('clear-avatar-btn');
    const fileInput = document.getElementById('avatar-file');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          alert('이미지는 2MB 이하만 올릴 수 있어요.');
          return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = '올리는 중...';

        try {
          // Compress before upload (same helper as photo album)
          const compressed = await compressImage(file, 400, 0.85);
          await DotoriStorage.uploadAvatar(compressed);
          closeModal();
          const updated = await DotoriStorage.getProfile();
          await renderHome(updated);
          // Reopen editor to show the new image
          setTimeout(() => openProfileEditor(), 100);
        } catch (err) {
          console.error('Avatar upload failed:', err);
          alert('이미지를 올릴 수 없어요: ' + (err.message || ''));
          uploadBtn.disabled = false;
          uploadBtn.textContent = '🖼️ 이미지 올리기';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm('이미지를 지우고 펫 이모지로 돌아갈까요?')) return;

        try {
          await DotoriStorage.clearAvatar();
          closeModal();
          const updated = await DotoriStorage.getProfile();
          await renderHome(updated);
          setTimeout(() => openProfileEditor(), 100);
        } catch (err) {
          console.error('Clear avatar failed:', err);
          alert('지울 수 없어요: ' + (err.message || ''));
        }
      });
    }
  }, 50);
}

// ---------- Taste Editor ----------

async function openTasteEditor() {
  const tastes = await DotoriStorage.getTastes();

  const interestChips = renderChips(INTEREST_OPTIONS, tastes.interests);
  const musicChips = renderChips(MUSIC_OPTIONS, tastes.music);
  const moodChips = renderChips(MOOD_OPTIONS, tastes.mood);

  showModal('취향 편집',
    `<div class="editor-form">
      <label>관심사 <span class="hint">여러 개 선택 가능</span></label>
      <div class="chip-group" id="chip-interests">${interestChips}</div>

      <label>음악 취향</label>
      <div class="chip-group" id="chip-music">${musicChips}</div>

      <label>감성</label>
      <div class="chip-group" id="chip-mood">${moodChips}</div>

      <label>좋아하는 것 <span class="hint">쉼표로 구분</span></label>
      <input type="text" id="taste-favorites" maxlength="80"
        placeholder="비 오는 날, 코코아, 오래된 만화"
        value="${escapeHtml(tastes.favorites || '')}" class="editor-input">

      <label>요즘 하는 것</label>
      <input type="text" id="taste-currently" maxlength="60"
        placeholder="기타 배우는 중"
        value="${escapeHtml(tastes.currently || '')}" class="editor-input">

      <label>지금 필요한 것 <span class="hint">한 문장</span></label>
      <input type="text" id="taste-needs" maxlength="60"
        placeholder="조용히 들어줄 사람"
        value="${escapeHtml(tastes.needs || '')}" class="editor-input">
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '저장', primary: true, onClick: async () => {
        const newTastes = {
          interests: getSelectedChips('chip-interests'),
          music: getSelectedChips('chip-music'),
          mood: getSelectedChips('chip-mood'),
          favorites: document.getElementById('taste-favorites').value.trim(),
          currently: document.getElementById('taste-currently').value.trim(),
          needs: document.getElementById('taste-needs').value.trim()
        };
        await DotoriStorage.updateTastes(newTastes);
        closeModal();
        const updated = await DotoriStorage.getProfile();
        await renderHome(updated);
      }}
    ]
  );

  setTimeout(() => {
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
      });
    });
  }, 50);
}

function renderChips(options, selected) {
  return options.map((opt) => {
    const isActive = (selected || []).includes(opt);
    return `<button class="chip ${isActive ? 'active' : ''}" data-value="${opt}">${opt}</button>`;
  }).join('');
}

function getSelectedChips(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return [];
  return Array.from(group.querySelectorAll('.chip.active')).map((c) => c.dataset.value);
}

// ---------- Settings ----------

async function openSettings() {
  const profile = await DotoriStorage.getProfile();
  if (!profile) return;

  showModal('설정',
    `<div class="settings-form">
      <div class="settings-row">
        <span class="settings-label">닉네임</span>
        <span class="settings-value">${escapeHtml(profile.nickname)}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">도토리 ID</span>
        <span class="settings-value">
          <code id="settings-dotori-id">${profile.dotori_id}</code>
          <button class="copy-btn" data-copy="${profile.dotori_id}">복사</button>
        </span>
      </div>
      <p class="settings-hint">
        이 ID를 친구에게 알려주세요. 그들이 당신의 페이지를 방문할 수 있어요.
      </p>
    </div>`,
    [{ label: '닫기', primary: true, onClick: closeModal }]
  );

  setTimeout(() => {
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyBtn.dataset.copy);
        copyBtn.textContent = '복사됨!';
        setTimeout(() => { copyBtn.textContent = '복사'; }, 1500);
      });
    }
  }, 50);
}

// ---------- Guestbook writer ----------

async function openGuestbookWriter(ownerDotoriId) {
  showModal('방명록 남기기',
    `<div class="editor-form">
      <label>메시지</label>
      <textarea id="guestbook-message" maxlength="200" rows="3"
        placeholder="따뜻한 한마디를 남겨주세요." class="editor-input"></textarea>
      <label class="checkbox-label">
        <input type="checkbox" id="guestbook-secret">
        비밀글로 남기기
      </label>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '남기기', primary: true, onClick: async () => {
        const message = document.getElementById('guestbook-message').value.trim();
        if (!message) return;

        const isSecret = document.getElementById('guestbook-secret').checked;

        try {
          await DotoriStorage.addGuestbookEntry({
            message: message,
            is_secret: isSecret
          }, ownerDotoriId);

          closeModal();

          if (ownerDotoriId) {
            await renderGuestbookPreview(ownerDotoriId);
            await renderGuestbookTab(ownerDotoriId);
          } else {
            const updated = await DotoriStorage.getProfile();
            await renderHome(updated);
          }
        } catch (err) {
          console.error('Guestbook write failed:', err);
          alert('방명록을 남길 수 없어요: ' + (err.message || '알 수 없는 오류'));
        }
      }}
    ]
  );
}