import { listJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry, listFieldDefs } from './api.js';
import { mountAttachments } from './attachments-ui.js';
import { renderCustomFieldRows, readCustomFieldValues } from './custom-fields.js';
import { exportJournalEntry } from './export.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function excerpt(content) {
  const text = String(content ?? '').trim();
  return text.length > 140 ? text.slice(0, 140) + '…' : text;
}

export async function render(container) {
  let entries = await listJournalEntries();
  const customFieldDefs = (await listFieldDefs('journal')).filter((d) => !d.is_default);

  function renderList() {
    container.innerHTML = `
      <div class="filter-tabs">
        <h1 class="page-title" style="margin-right:auto">Journal</h1>
        <button class="btn btn-primary" id="new-entry">New Entry</button>
      </div>
      ${
        entries.length === 0
          ? '<p class="empty-placeholder">No journal entries yet.</p>'
          : `<div class="journal-list">
              ${entries
                .map(
                  (e) => `
                <div class="card journal-card" data-id="${e.id}">
                  <div class="journal-card-head">
                    <strong>${e.title ? esc(e.title) : '<span class="empty-placeholder">Untitled</span>'}</strong>
                    <span class="empty-placeholder">${esc(e.date)}${e.type ? ' &middot; ' + esc(e.type) : ''}</span>
                  </div>
                  <p>${esc(excerpt(e.content)) || '<span class="empty-placeholder">Empty</span>'}</p>
                </div>`
                )
                .join('')}
            </div>`
      }
    `;

    container.querySelectorAll('.journal-card').forEach((card) =>
      card.addEventListener('click', () => renderDetail(entries.find((e) => e.id === card.dataset.id)))
    );
    container.querySelector('#new-entry').addEventListener('click', async () => {
      const entry = await createJournalEntry({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        type: '',
        content: '',
        custom_fields: {},
      });
      entries.unshift(entry);
      renderDetail(entry);
    });
  }

  function field(label, inputHtml) {
    return `<div class="form-row"><label class="form-label">${label}</label>${inputHtml}</div>`;
  }

  function renderDetail(entry) {
    container.innerHTML = `
      <button class="btn btn-secondary" id="back">&larr; Back to Journal</button>
      <h1 class="page-title">Journal entry</h1>
      <div class="card detail-form">
        ${field('Title', `<input type="text" data-field="title" value="${esc(entry.title)}" placeholder="Empty" />`)}
        ${field('Date', `<input type="date" data-field="date" value="${esc(entry.date)}" />`)}
        ${field('Type', `<input type="text" data-field="type" value="${esc(entry.type)}" placeholder="Empty" />`)}
        ${field('Content', `<textarea data-field="content" rows="12" placeholder="Empty">${esc(entry.content)}</textarea>`)}
        ${renderCustomFieldRows(customFieldDefs, entry.custom_fields)}
      </div>
      <h2 class="section-title">Screenshots</h2>
      <div class="card" id="attachments"></div>
      <div style="display:flex; gap: var(--space-3); margin-top:16px">
        <button class="btn btn-secondary" id="export-entry">Export to PDF</button>
        <button class="btn btn-secondary negative" id="delete-entry">Delete entry</button>
      </div>
    `;

    mountAttachments(container.querySelector('#attachments'), 'journal', entry.id);

    async function save() {
      const form = container.querySelector('.detail-form');
      const patch = {
        title: form.querySelector('[data-field=title]').value,
        date: form.querySelector('[data-field=date]').value,
        type: form.querySelector('[data-field=type]').value,
        content: form.querySelector('[data-field=content]').value,
        custom_fields: readCustomFieldValues(form, customFieldDefs),
      };
      const updated = await updateJournalEntry(entry.id, patch);
      Object.assign(entry, updated);
    }

    container.querySelectorAll('.detail-form input, .detail-form select, .detail-form textarea').forEach((el) => {
      el.addEventListener('blur', save);
      if (el.tagName === 'SELECT' || el.type === 'checkbox') el.addEventListener('change', save);
    });

    container.querySelector('#back').addEventListener('click', async () => {
      entries = await listJournalEntries();
      renderList();
    });

    container.querySelector('#export-entry').addEventListener('click', () => exportJournalEntry(entry));

    container.querySelector('#delete-entry').addEventListener('click', async () => {
      if (!confirm('Delete this journal entry and its screenshots?')) return;
      await deleteJournalEntry(entry.id);
      entries = entries.filter((e) => e.id !== entry.id);
      renderList();
    });
  }

  renderList();
}
