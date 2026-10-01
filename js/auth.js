// ============================================
// 도토리숲 — Auth UI
// ============================================

function initAuth() {
  const welcomeScreen = document.getElementById('welcome-screen');
  const mainSite = document.getElementById('main-site');

  const nicknameInput = document.getElementById('nickname-input');
  const createBtn = document.getElementById('create-acorn-btn');
  const loadBtn = document.getElementById('load-acorn-btn');
  const logoutLink = document.getElementById('logout-link');

  const session = DotoriStorage.getSession();
  if (session && session.loggedIn) {
    showMainSite();
    return;
  }

  createBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
      showModal('알림', '닉네임을 입력해주세요.', [
        { label: '확인', primary: true, onClick: closeModal }
      ]);
      return;
    }

    if (nickname.length > 12) {
      showModal('알림', '닉네임은 12자 이하로 입력해주세요.', [
        { label: '확인', primary: true, onClick: closeModal }
      ]);
      return;
    }

    const profile = DotoriStorage.createAcorn(nickname);

    showModal('🌰 도토리가 만들어졌어요!',
      `당신의 도토리 ID는 <strong>${profile.dotori_id}</strong> 입니다.<br><br>` +
      `<span style="color:#888; font-size:11px;">이 ID를 꼭 저장해두세요. 다른 기기에서 불러올 때 필요해요.</span>`,
      [
        { label: '숲으로 들어가기', primary: true, onClick: () => {
          closeModal();
          showMainSite();
        }}
      ]
    );
  });

  loadBtn.addEventListener('click', () => {
    const profile = DotoriStorage.getProfile();

    if (!profile) {
      showModal('알림', '이 브라우저에는 저장된 도토리가 없어요.<br>새 도토리를 만들어주세요.', [
        { label: '확인', primary: true, onClick: closeModal }
      ]);
      return;
    }

    DotoriStorage.loadAcorn(profile.dotori_id);
    showMainSite();
  });

  nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createBtn.click();
  });

  logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('알림', '숲에서 나가시겠어요?<br>도토리는 이 브라우저에 그대로 저장됩니다.', [
      { label: '취소', onClick: closeModal },
      { label: '나가기', primary: true, onClick: () => {
        DotoriStorage.logout();
        closeModal();
        location.reload();
      }}
    ]);
  });

  function showMainSite() {
    welcomeScreen.classList.add('hidden');
    mainSite.classList.remove('hidden');

    const profile = DotoriStorage.getProfile();
    if (profile && window.initApp) {
      window.initApp(profile);
    }
  }
}