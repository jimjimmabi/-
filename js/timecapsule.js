// ============================================
// 도토리숲 — Time Capsule (2008 ↔ 2026)
// ============================================

const TC_STATE_KEY = 'dotori_time_capsule_state';
let tcCurrentState = '2008';
let tcFutureNoteTimer = null;
let tcIsAnimating = false;

// ---------- Init ----------

function initTimeCapsule() {
  const link = document.getElementById('time-capsule-link');
  if (!link) return;

  try {
    const saved = localStorage.getItem(TC_STATE_KEY);
    if (saved === '2026') {
      applyTimeCapsuleState('2026', { animate: false, noteDelay: 0 });
    } else {
      applyTimeCapsuleState('2008', { animate: false });
    }
  } catch (e) {
    applyTimeCapsuleState('2008', { animate: false });
  }

  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (tcIsAnimating) return;
    if (tcCurrentState === '2008') {
      triggerTransitionTo('2026');
    } else {
      triggerTransitionTo('2008');
    }
  });
}

// ---------- Transition ----------

function triggerTransitionTo(target) {
  tcIsAnimating = true;
  document.body.classList.add('time-capsule-animating');

  setTimeout(() => {
    showFlashMessage(target === '2026'
      ? '이 페이지는 2008년에 저장되었습니다.'
      : '2008년으로 돌아갑니다.'
    );

    setTimeout(() => {
      applyTimeCapsuleState(target, { animate: true });

      setTimeout(() => {
        hideFlashMessage();
        document.body.classList.remove('time-capsule-animating');
        setTimeout(() => {
          tcIsAnimating = false;
        }, 500);
      }, 900);
    }, 900);
  }, 900);
}

function showFlashMessage(text) {
  let flash = document.getElementById('time-capsule-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'time-capsule-flash';
    flash.innerHTML = '<div class="flash-message"></div>';
    document.body.appendChild(flash);
  }
  flash.querySelector('.flash-message').textContent = text;
  void flash.offsetWidth;
  flash.classList.add('active');
}

function hideFlashMessage() {
  const flash = document.getElementById('time-capsule-flash');
  if (!flash) return;
  flash.classList.remove('active');
}

// ---------- Apply state ----------

function applyTimeCapsuleState(state, options) {
  options = options || {};
  tcCurrentState = state;

  try {
    localStorage.setItem(TC_STATE_KEY, state);
  } catch (e) {}

  const mainSiteEl = document.getElementById('main-site');
  if (mainSiteEl) {
    if (state === '2026') {
      mainSiteEl.classList.add('time-capsule-2026');
    } else {
      mainSiteEl.classList.remove('time-capsule-2026');
    }
  }

  const dateEl = document.getElementById('header-date');
  if (dateEl) {
    dateEl.textContent = state === '2026' ? '2026년 10월 4일' : '2008년 3월 14일';
  }

  const link = document.getElementById('time-capsule-link');
  if (link) {
    link.textContent = state === '2026'
      ? '[ 저장된 시간: 2026.10.04 ]'
      : '[ 저장된 시간: 2008.03.14 ]';
  }

  if (state === '2026') {
    scheduleFutureNote(options.noteDelay != null ? options.noteDelay : 5000);
  } else {
    removeFutureNote();
  }
}

// ---------- The note from your future self ----------

function scheduleFutureNote(delayMs) {
  removeFutureNote();
  if (delayMs <= 0) {
    showFutureNote();
    return;
  }
  tcFutureNoteTimer = setTimeout(() => {
    showFutureNote();
  }, delayMs);
}

function showFutureNote() {
  const homeTab = document.getElementById('tab-home');
  if (!homeTab) return;

  const old = document.getElementById('tc-future-note');
  if (old) old.remove();

  const note = document.createElement('div');
  note.id = 'tc-future-note';
  note.className = 'tc-future-note';
  note.innerHTML = `
    <div class="note-header">— 2026년의 나로부터 —</div>
    <div class="note-body">
2008년의 나에게.
그때는 많이 외로웠지. 많이 아팠고.
그런데 괜찮아졌어. 진짜로.
네가 지금 만드는 이 숲에, 언젠가 누군가가 찾아올 거야.
그 사람도, 너처럼 외로웠을 거야.
그 사람에게 네가 해준 것처럼, 잘 해줘.

<span class="en">To me, in 2008. You were so lonely then. It hurt so much. But it got better. Really. Someone will find this forest you're building. They'll be lonely too — just like you were. Treat them the way you wish someone had treated you.</span>
    </div>
  `;

  homeTab.insertBefore(note, homeTab.firstChild);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      note.classList.add('visible');
    });
  });

  const returnBtn = document.createElement('button');
  returnBtn.id = 'tc-return-btn';
  returnBtn.className = 'tc-return-btn';
  returnBtn.textContent = '← 2008년으로 돌아가기';
  returnBtn.addEventListener('click', () => {
    if (tcIsAnimating) return;
    triggerTransitionTo('2008');
  });

  note.parentNode.insertBefore(returnBtn, note.nextSibling);
}

function removeFutureNote() {
  if (tcFutureNoteTimer) {
    clearTimeout(tcFutureNoteTimer);
    tcFutureNoteTimer = null;
  }
  const note = document.getElementById('tc-future-note');
  if (note) note.remove();

  const btn = document.getElementById('tc-return-btn');
  if (btn) btn.remove();
}

// ---------- Expose ----------

window.initTimeCapsule = initTimeCapsule;
window.applyTimeCapsuleState = applyTimeCapsuleState;