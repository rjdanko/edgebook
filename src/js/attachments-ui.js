// Shared attachment widget: paste-to-upload + file picker + thumbnail grid.
// Reused by the trade detail view now, and the journal editor in Phase 3.
import { saveAttachment, listAttachments, deleteAttachment } from './api.js';

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function extFor(mimeOrName) {
  const match = /(?:image\/|\.)(\w+)$/.exec(mimeOrName);
  const ext = (match ? match[1] : 'jpg').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

export function mountAttachments(container, ownerType, ownerId) {
  container.innerHTML = `
    <div class="attachment-toolbar">
      <label class="btn btn-secondary">
        Add screenshot
        <input type="file" accept="image/*" multiple hidden />
      </label>
      <span class="empty-placeholder">or paste (Ctrl+V) anywhere in this panel</span>
    </div>
    <div class="attachment-grid"></div>
  `;
  const grid = container.querySelector('.attachment-grid');
  const fileInput = container.querySelector('input[type=file]');

  async function refresh() {
    const items = await listAttachments(ownerType, ownerId);
    grid.innerHTML = items
      .map(
        (a) => `
        <div class="attachment-thumb" data-id="${a.id}">
          <img src="${a.data_url}" />
          <button class="attachment-remove" title="Remove" data-id="${a.id}">&times;</button>
        </div>`
      )
      .join('');
  }

  async function upload(blob) {
    const base64 = await blobToBase64(blob);
    await saveAttachment(ownerType, ownerId, base64, extFor(blob.type));
    await refresh();
  }

  fileInput.addEventListener('change', async () => {
    for (const file of fileInput.files) await upload(file);
    fileInput.value = '';
  });

  container.addEventListener('paste', async (e) => {
    const items = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/'));
    for (const item of items) {
      const blob = item.getAsFile();
      if (blob) await upload(blob);
    }
  });

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.attachment-remove');
    if (!btn) return;
    await deleteAttachment(btn.dataset.id);
    await refresh();
  });

  container.tabIndex = 0; // paste events need a focusable target
  refresh();
}
