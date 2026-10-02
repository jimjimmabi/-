// ============================================
// 도토리숲 — Photo Album (사진첩)
// ============================================

// ---------- Init: my photo album ----------

async function initPhotoTab() {
  const container = document.getElementById('tab-album');
  if (!container) return;

  container.innerHTML = `
    <div class="photo-page">
      <div class="photo-header">
        <h2>📷 사진첩</h2>
        <p class="photo-purpose">
          소중한 순간들을 담아두는 곳이에요.
        </p>
      </div>

      <div class="photo-actions">
        <button id="photo-upload-btn" class="small-btn primary">📷 사진 올리기</button>
      </div>

      <div id="photo-grid" class="photo-grid">
        <p class="empty-message">불러오는 중...</p>
      </div>
    </div>
  `;

  const uploadBtn = document.getElementById('photo-upload-btn');
  if (uploadBtn) uploadBtn.addEventListener('click', openPhotoUploader);

  await loadPhotos();
}

async function loadPhotos() {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;

  let photos = [];
  try {
    photos = await DotoriStorage.getMyPhotos();
  } catch (e) {
    console.warn('Photos load failed:', e);
  }

  renderPhotoGrid(grid, photos, true);
}

function renderPhotoGrid(grid, photos, canDelete) {
  if (!Array.isArray(photos) || photos.length === 0) {
    grid.innerHTML = `
      <p class="empty-message">
        아직 사진이 없어요.<br>
        <span style="color:#BBB; font-size:11px;">첫 사진을 올려보세요.</span>
      </p>
    `;
    return;
  }

  grid.innerHTML = '';
  photos.forEach((photo) => {
    grid.appendChild(renderPhotoCard(photo, canDelete));
  });
}

function renderPhotoCard(photo, canDelete) {
  const card = document.createElement('div');
  card.className = 'photo-card';

  card.innerHTML = `
    <div class="photo-image-wrap">
      <img src="${photo.image_url}" alt="" class="photo-image" loading="lazy">
    </div>
    ${photo.caption ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>` : ''}
    <div class="photo-meta">${formatDate(photo.created_at)}</div>
    ${canDelete ? `<button class="photo-delete" title="삭제">✕</button>` : ''}
  `;

  // Click image → lightbox
  card.querySelector('.photo-image').addEventListener('click', () => {
    openPhotoLightbox(photo);
  });

  if (canDelete) {
    const delBtn = card.querySelector('.photo-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('이 사진을 삭제할까요?')) return;
        try {
          await DotoriStorage.deletePhoto(photo.id);
          await loadPhotos();
        } catch (err) {
          console.error('Delete failed:', err);
          alert('삭제할 수 없어요');
        }
      });
    }
  }

  return card;
}

// ---------- Photo Uploader ----------

function openPhotoUploader() {
  showModal('📷 사진 올리기',
    `<div class="editor-form">
      <label>사진 선택 <span class="hint">최대 5MB</span></label>
      <input type="file" id="photo-file" accept="image/*" style="display:none;">

      <div id="photo-preview-wrap" class="photo-preview-wrap">
        <button type="button" id="photo-pick-btn" class="photo-pick-btn">
          <span class="photo-pick-icon">+</span>
          <span>사진을 선택하세요</span>
        </button>
      </div>

      <label>설명 <span class="hint">선택사항</span></label>
      <input type="text" id="photo-caption" maxlength="80"
        placeholder="사진에 대한 짧은 설명"
        class="editor-input">

      <div id="photo-upload-status" class="photo-upload-status"></div>
    </div>`,
    [
      { label: '취소', onClick: closeModal },
      { label: '올리기', primary: true, onClick: handlePhotoUpload }
    ]
  );

  setTimeout(() => {
    const fileInput = document.getElementById('photo-file');
    const pickBtn = document.getElementById('photo-pick-btn');
    const caption = document.getElementById('photo-caption');

    if (pickBtn && fileInput) {
      pickBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        previewPhoto(file);
      });
    }

    if (caption) caption.focus();
  }, 50);
}

function previewPhoto(file) {
  const wrap = document.getElementById('photo-preview-wrap');
  if (!wrap) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    wrap.innerHTML = `
      <img src="${e.target.result}" class="photo-preview-img" alt="">
      <button type="button" id="photo-change-btn" class="small-btn" style="margin-top:8px;">다른 사진 선택</button>
    `;
    document.getElementById('photo-change-btn').addEventListener('click', () => {
      document.getElementById('photo-file').click();
    });
  };
  reader.readAsDataURL(file);
}

async function handlePhotoUpload() {
  const fileInput = document.getElementById('photo-file');
  const caption = document.getElementById('photo-caption');
  const status = document.getElementById('photo-upload-status');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (status) status.innerHTML = `<span style="color:#E87BA8;">사진을 선택해주세요.</span>`;
    return;
  }

  const file = fileInput.files[0];
  const captionText = caption ? caption.value.trim() : '';

  if (file.size > 5 * 1024 * 1024) {
    if (status) status.innerHTML = `<span style="color:#E87BA8;">사진은 5MB 이하여야 해요.</span>`;
    return;
  }

  if (status) status.innerHTML = `<span style="color:#888;">사진을 압축하고 있어요...</span>`;

  try {
    // Compress before upload
    const compressed = await compressImage(file, 1200, 0.82);

    if (status) status.innerHTML = `<span style="color:#888;">올리는 중...</span>`;

    await DotoriStorage.uploadPhoto(compressed, captionText);

    closeModal();
    await loadPhotos();

    showModal('🌰 사진을 올렸어요',
      '사진첩에 새 사진이 담겼어요.',
      [{ label: '확인', primary: true, onClick: closeModal }]
    );
  } catch (err) {
    console.error('Upload failed:', err);
    if (status) status.innerHTML = `<span style="color:#E87BA8;">${escapeHtml(err.message || '업로드 실패')}</span>`;
  }
}

// ---------- Image compression ----------

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('압축 실패'));
          const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], newName, { type: 'image/jpeg' });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('이미지를 읽을 수 없어요'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없어요'));
    reader.readAsDataURL(file);
  });
}

// ---------- Lightbox ----------

function openPhotoLightbox(photo) {
  showModal('📷 사진',
    `<div class="photo-lightbox">
      <img src="${photo.image_url}" alt="" class="photo-lightbox-img">
      ${photo.caption ? `<p class="photo-lightbox-caption">${escapeHtml(photo.caption)}</p>` : ''}
      <p class="photo-lightbox-date">${formatDate(photo.created_at)}</p>
    </div>`,
    [{ label: '닫기', primary: true, onClick: closeModal }]
  );
}

// ---------- Photos in visit modal ----------

async function renderPhotosForVisit(ownerDotoriId) {
  try {
    const photos = await DotoriStorage.getPhotosByDotoriId(ownerDotoriId);
    return photos || [];
  } catch (e) {
    console.warn('Visit photos failed:', e);
    return [];
  }
}