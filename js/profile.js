// ============================================
// 도토리숲 — Profile, Taste, Settings editors
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

function openProfileEditor() {
  const profile = DotoriStorage.getProfile();
  if (!profile) return;

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

  showModal('프로필 수정',
    `<div class="editor-form">
      <label>닉네임</label>
      <input type="text" id="edit-nickname" maxlength="12" value="${escapeHtml(profile.nickname)}" class="editor-input">

      <label>미니미</label>
      <div class="mini-me-options">${miniMeBtns}</div>

      <label>미니미 배경</label>
      <div class="bg-options">${bgBtns}</div>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '저장', primary: true, onClick: () => {
        const nickname = document.getElementById('edit-nickname').value.trim();
        if (!nickname) return;

        const activeEmoji = document.querySelector('.mini-me-option.active');
        const activeBg = document.querySelector('.bg-option.active');

        DotoriStorage.updateProfile({
          nickname: nickname,
          mini_me: activeEmoji ? activeEmoji.dataset.emoji : profile.mini_me,
          mini_me_bg: activeBg ? activeBg.dataset.bg : profile.mini_me_bg
        });

        closeModal();
        renderHome(DotoriStorage.getProfile());
      }}
    ]
  );

  setTimeout(() => {
    document.querySelectorAll('.mini-me-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mini-me-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.querySelectorAll('.bg-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bg-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }, 50);
}

// ---------- Taste Editor ----------

function openTasteEditor() {
  const tastes = DotoriStorage.getTastes();

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
      { label: '저장', primary: true, onClick: () => {
        const newTastes = {
          interests: getSelectedChips('chip-interests'),
          music: getSelectedChips('chip-music'),
          mood: getSelectedChips('chip-mood'),
          favorites: document.getElementById('taste-favorites').value.trim(),
          currently: document.getElementById('taste-currently').value.trim(),
          needs: document.getElementById('taste-needs').value.trim()
        };

        DotoriStorage.updateTastes(newTastes);
        closeModal();
        renderHome(DotoriStorage.getProfile());
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

function openSettings() {
  const profile = DotoriStorage.getProfile();
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
        이 ID를 저장해두세요. 다른 기기에서 불러올 때 필요해요.
      </p>
      <div class="settings-actions">
        <button class="small-btn" id="export-btn">도토리 내보내기</button>
        <button class="small-btn" id="import-btn">도토리 불러오기</button>
      </div>
      <input type="file" id="import-file" accept=".dotori,.json" style="display:none;">
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

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = DotoriStorage.exportAcorn();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = profile.dotori_id + '.dotori';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (DotoriStorage.importAcorn(data)) {
              closeModal();
              location.reload();
            } else {
              alert('파일을 불러올 수 없어요.');
            }
          } catch (err) {
            alert('파일이 올바르지 않아요.');
          }
        };
        reader.readAsText(file);
      });
    }
  }, 50);
}

// ---------- Guestbook writer ----------

function openGuestbookWriter() {
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
      { label: '남기기', primary: true, onClick: () => {
        const message = document.getElementById('guestbook-message').value.trim();
        if (!message) return;

        const isSecret = document.getElementById('guestbook-secret').checked;

        DotoriStorage.addGuestbookEntry({
          author_name: '나',
          message: message,
          is_secret: isSecret
        });

        closeModal();
        renderHome(DotoriStorage.getProfile());
      }}
    ]
  );
}