import { getSettings, updateSetting, listFieldDefs, createFieldDef, updateFieldDef, deleteFieldDef } from './api.js';
import { applyTheme } from './theme.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const KINDS = ['text', 'long_text', 'number', 'boolean', 'enum', 'tag', 'date'];

function fieldSection(entity, title, defs) {
  return `
    <div class="field-section" data-entity="${entity}">
      <h2 class="section-title">${title} fields</h2>
      <table class="data-table">
        <thead><tr><th>Label</th><th>Kind</th><th>Hidden</th><th></th></tr></thead>
        <tbody>
          ${defs
            .map(
              (d) => `
            <tr data-id="${d.id}">
              <td><input type="text" class="field-label" value="${esc(d.label)}" /></td>
              <td>${d.kind}${d.is_default ? ' <span class="empty-placeholder">(default)</span>' : ''}</td>
              <td><input type="checkbox" class="field-hidden" ${d.hidden ? 'checked' : ''} /></td>
              <td>${d.is_default ? '' : '<button class="btn btn-secondary negative field-delete">Delete</button>'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="card" style="margin-bottom: var(--space-6)">
        <div class="form-row">
          <label class="form-label">Add custom field</label>
          <div style="display:flex; gap: var(--space-2)">
            <input type="text" class="new-field-label" placeholder="Field label" style="flex:1" />
            <select class="new-field-kind">${KINDS.map((k) => `<option value="${k}">${k}</option>`).join('')}</select>
            <button class="btn btn-primary new-field-add">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function render(container) {
  container.innerHTML = `<h1 class="page-title">Settings</h1><p class="empty-placeholder">Loading...</p>`;
  const [settings, tradeFields, journalFields] = await Promise.all([
    getSettings(),
    listFieldDefs('trade'),
    listFieldDefs('journal'),
  ]);

  container.innerHTML = `
    <h1 class="page-title">Settings</h1>

    <h2 class="section-title">Appearance</h2>
    <div class="card" style="margin-bottom: var(--space-6)">
      ${'<div class="form-row"><label class="form-label">Theme</label><select id="theme-select">' +
        ['system', 'light', 'dark'].map((t) => `<option value="${t}"${settings.theme === t ? ' selected' : ''}>${t}</option>`).join('') +
        '</select></div>'}
      <div class="form-row">
        <label class="form-label">Accent color</label>
        <input type="color" id="accent-input" value="${settings.accent || '#2A9D8F'}" style="width:60px; padding: 2px" />
      </div>
      <div class="form-row">
        <label class="form-label">Starting balance</label>
        <input type="number" step="0.01" id="balance-input" value="${settings.starting_balance || 0}" />
      </div>
    </div>

    ${fieldSection('trade', 'Trade', tradeFields)}
    ${fieldSection('journal', 'Journal', journalFields)}
  `;

  container.querySelector('#theme-select').addEventListener('change', async (e) => {
    await updateSetting('theme', e.target.value);
    applyTheme({ theme: e.target.value, accent: settings.accent });
  });
  container.querySelector('#accent-input').addEventListener('change', async (e) => {
    await updateSetting('accent', e.target.value);
    applyTheme({ theme: settings.theme, accent: e.target.value });
  });
  container.querySelector('#balance-input').addEventListener('blur', (e) => {
    updateSetting('starting_balance', e.target.value);
  });

  for (const [entity, defs] of [['trade', tradeFields], ['journal', journalFields]]) {
    const section = container.querySelector(`.field-section[data-entity="${entity}"]`);

    section.querySelectorAll('tbody tr').forEach((row) => {
      const id = row.dataset.id;
      const def = defs.find((d) => d.id === id);
      const save = () =>
        updateFieldDef(id, row.querySelector('.field-label').value, row.querySelector('.field-hidden').checked, def.sort_order, def.options);
      row.querySelector('.field-label').addEventListener('blur', save);
      row.querySelector('.field-hidden').addEventListener('change', save);
      const del = row.querySelector('.field-delete');
      if (del)
        del.addEventListener('click', async () => {
          if (!confirm(`Delete field "${def.label}"? Existing data in this field is kept but hidden.`)) return;
          await deleteFieldDef(id);
          render(container);
        });
    });

    section.querySelector('.new-field-add').addEventListener('click', async () => {
      const label = section.querySelector('.new-field-label').value.trim();
      if (!label) return;
      const kind = section.querySelector('.new-field-kind').value;
      await createFieldDef({ entity, label, kind, options: [] });
      render(container);
    });
  }
}
