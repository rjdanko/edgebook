import { listJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry, listFieldDefs, saveAttachment, listAttachments, deleteAttachment } from './api.js';
import { renderCustomFieldRows, readCustomFieldValues } from './custom-fields.js';
import { exportJournalEntry, exportSelectedJournalEntries } from './export.js';
import { blobToBase64, extFor } from './attachments-ui.js';
import { mountTagSelect, tagPillHtml } from './tag-select.js';
import { confirmDialog } from './confirm-dialog.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function excerpt(content) {
  const text = String(content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 140 ? text.slice(0, 140) + '…' : text;
}

function mimeForExt(ext) {
  return { png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
}

export async function render(container) {
  let entries = await listJournalEntries();
  const allFieldDefs = await listFieldDefs('journal');
  const customFieldDefs = allFieldDefs.filter((d) => !d.is_default);
  const typeDef = allFieldDefs.find((d) => d.key === 'type');
  const selectedIds = new Set();

  function renderList() {
    selectedIds.forEach((id) => { if (!entries.some((e) => e.id === id)) selectedIds.delete(id); });

    container.innerHTML = `
      <div class="filter-tabs">
        <h1 class="page-title" style="margin-right:auto">Journal</h1>
        <button class="btn btn-primary" id="new-entry">New Entry</button>
      </div>
      <div class="bulk-toolbar${selectedIds.size ? ' visible' : ''}">
        <span class="bulk-count">${selectedIds.size} selected</span>
        <button class="btn btn-secondary" id="bulk-export">Export</button>
        <button class="btn btn-secondary negative" id="bulk-delete">Delete</button>
        <button class="btn btn-secondary" id="bulk-cancel">Cancel</button>
      </div>
      ${
        entries.length === 0
          ? '<p class="empty-placeholder">No journal entries yet.</p>'
          : `<div class="journal-list${selectedIds.size ? ' has-selection' : ''}">
              ${entries
                .map(
                  (e) => `
                <div class="journal-list-item${selectedIds.has(e.id) ? ' selected' : ''}" data-id="${e.id}">
                  <span class="select-col"><input type="checkbox" class="row-check" data-id="${e.id}"${selectedIds.has(e.id) ? ' checked' : ''} /></span>
                  <div class="card journal-card" data-id="${e.id}">
                    <div class="journal-card-head">
                      <strong>${e.title ? esc(e.title) : '<span class="empty-placeholder">Untitled</span>'}</strong>
                      <span class="journal-card-meta"><span class="empty-placeholder">${esc(e.date)}</span>${e.type ? tagPillHtml(typeDef.options, e.type) : ''}</span>
                    </div>
                    <p>${esc(excerpt(e.content)) || '<span class="empty-placeholder">Empty</span>'}</p>
                  </div>
                </div>`
                )
                .join('')}
            </div>`
      }
    `;

    container.querySelectorAll('.journal-card').forEach((card) =>
      card.addEventListener('click', () => renderDetail(entries.find((entry) => entry.id === card.dataset.id)))
    );
    container.querySelectorAll('.row-check').forEach((cb) =>
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.dataset.id);
        else selectedIds.delete(cb.dataset.id);
        renderList();
      })
    );
    container.querySelector('#bulk-cancel')?.addEventListener('click', () => {
      selectedIds.clear();
      renderList();
    });
    container.querySelector('#bulk-export')?.addEventListener('click', () => {
      exportSelectedJournalEntries(entries.filter((e) => selectedIds.has(e.id)));
    });
    container.querySelector('#bulk-delete')?.addEventListener('click', async () => {
      if (!(await confirmDialog(`Delete ${selectedIds.size} selected entr${selectedIds.size === 1 ? 'y' : 'ies'} and their screenshots? This cannot be undone.`, { title: 'Delete entries' }))) return;
      for (const id of selectedIds) await deleteJournalEntry(id);
      entries = entries.filter((e) => !selectedIds.has(e.id));
      selectedIds.clear();
      renderList();
    });
    container.querySelector('#new-entry').addEventListener('click', () => {
      renderDetail({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        type: '',
        content: '',
        custom_fields: {},
      });
    });
  }

  function renderDetail(entry) {
    let isNew = !entry.id;

    container.innerHTML = `
      <button class="btn btn-secondary" id="back">&larr; Back to Journal</button>
      <input type="text" class="journal-title-input" id="entry-title" value="${esc(entry.title)}" placeholder="Untitled" />
      <div class="journal-meta">
        <span>${esc(entry.date)}</span>
        <span>&middot;</span>
        <div class="tag-select-trigger compact" id="entry-type"></div>
      </div>
      <div class="journal-editor" id="entry-content" contenteditable="true" data-placeholder="Start writing... paste or drop screenshots anywhere">${entry.content || ''}</div>
      ${customFieldDefs.length ? `<h2 class="section-title">Fields</h2><div class="card">${renderCustomFieldRows(customFieldDefs, entry.custom_fields)}</div>` : ''}
      <div class="detail-actions">${isNew ? '' : savedActionsHtml()}</div>
    `;

    const editor = container.querySelector('#entry-content');

    let typeValue = entry.type;
    mountTagSelect({
      trigger: container.querySelector('#entry-type'),
      fieldDef: typeDef,
      value: typeValue,
      placeholder: 'Add type',
      onChange: (v) => { typeValue = v; save(); },
    });

    // Images are stored as real files (via saveAttachment); the content column only
    // keeps a data-attachment-id reference, resolved back to a displayable data_url here.
    async function resolveImages() {
      const imgs = [...editor.querySelectorAll('img[data-attachment-id]:not([src])')];
      if (imgs.length === 0) return;
      const attachments = await listAttachments('journal', entry.id);
      const byId = new Map(attachments.map((a) => [a.id, a.data_url]));
      for (const img of imgs) {
        const url = byId.get(img.dataset.attachmentId);
        if (url) img.src = url;
      }
    }
    if (!isNew) resolveImages();

    function serializeContent() {
      const clone = editor.cloneNode(true);
      clone.querySelectorAll('img[data-attachment-id]').forEach((img) => img.removeAttribute('src'));
      return clone.innerHTML;
    }

    function savedActionsHtml() {
      return `
        <button class="btn btn-secondary" id="export-entry">Export to PDF</button>
        <button class="btn btn-secondary negative" id="delete-entry">Delete entry</button>
      `;
    }

    async function ensureCreated(force) {
      if (!isNew) return;
      const form = readForm();
      if (!force && !form.title.trim() && !form.type.trim() && !editor.textContent.trim()) return;
      const created = await createJournalEntry(form);
      Object.assign(entry, created);
      entries.unshift(entry);
      isNew = false;
    }

    function readForm() {
      return {
        title: container.querySelector('#entry-title').value,
        date: entry.date,
        type: typeValue,
        content: serializeContent(),
        custom_fields: readCustomFieldValues(container, customFieldDefs),
      };
    }

    async function save() {
      if (isNew) {
        await ensureCreated();
        return;
      }
      const updated = await updateJournalEntry(entry.id, readForm());
      Object.assign(entry, updated);
      await cleanupOrphanedAttachments();
    }

    async function cleanupOrphanedAttachments() {
      const referenced = new Set([...editor.querySelectorAll('img[data-attachment-id]')].map((img) => img.dataset.attachmentId));
      const attachments = await listAttachments('journal', entry.id);
      for (const a of attachments) if (!referenced.has(a.id)) await deleteAttachment(a.id);
    }

    async function insertImage(blob, range) {
      await ensureCreated(true);
      const base64 = await blobToBase64(blob);
      const ext = extFor(blob.type);
      const attachment = await saveAttachment('journal', entry.id, base64, ext);
      const img = `<img src="data:${mimeForExt(ext)};base64,${base64}" data-attachment-id="${attachment.id}">`;
      const sel = window.getSelection();
      sel.removeAllRanges();
      if (range) sel.addRange(range);
      else {
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
        sel.addRange(r);
      }
      document.execCommand('insertHTML', false, img);
      await save();
    }

    container.querySelector('#entry-title').addEventListener('blur', save);
    editor.addEventListener('blur', save);

    editor.addEventListener('paste', async (e) => {
      const items = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/'));
      if (items.length === 0) return;
      e.preventDefault();
      const sel = window.getSelection();
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      for (const item of items) {
        const blob = item.getAsFile();
        if (blob) await insertImage(blob, range);
      }
    });

    editor.addEventListener('dragover', (e) => e.preventDefault());
    editor.addEventListener('drop', async (e) => {
      const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
      for (const file of files) await insertImage(file, range);
    });

    container.querySelector('#back').addEventListener('click', async () => {
      entries = await listJournalEntries();
      renderList();
    });

    function wireSavedActions() {
      container.querySelector('#export-entry').addEventListener('click', () => exportJournalEntry(entry));
      container.querySelector('#delete-entry').addEventListener('click', async () => {
        if (!(await confirmDialog('Delete this journal entry and its screenshots? This cannot be undone.', { title: 'Delete entry' }))) return;
        await deleteJournalEntry(entry.id);
        entries = entries.filter((e) => e.id !== entry.id);
        renderList();
      });
    }

    if (!isNew) wireSavedActions();
  }

  renderList();
}
