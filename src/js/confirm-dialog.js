// Styled replacement for window.confirm() - matches app chrome instead of the native OS dialog.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function confirmDialog(message, { title = 'Are you sure?', confirmLabel = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-panel" role="alertdialog" aria-modal="true">
        <h2 class="dialog-title">${esc(title)}</h2>
        <p class="dialog-message">${esc(message)}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" id="dialog-cancel">Cancel</button>
          <button class="btn btn-secondary${danger ? ' negative' : ' btn-primary'}" id="dialog-confirm">${esc(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function close(result) {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      resolve(result);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') close(false);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector('#dialog-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#dialog-confirm').addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector('#dialog-confirm').focus();
  });
}
