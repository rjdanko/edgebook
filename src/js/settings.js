import {
  getSettings,
  updateSetting,
  listFieldDefs,
  createFieldDef,
  updateFieldDef,
  deleteFieldDef,
  listObjectives,
  createObjective,
  updateObjective,
  deleteObjective,
} from './api.js';
import { applyTheme } from './theme.js';
import { icons } from './icons.js';
import { confirmDialog } from './confirm-dialog.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const KIND_LABELS = {
  text: 'Text',
  long_text: 'Paragraph',
  number: 'Number',
  boolean: 'Yes / No',
  enum: 'Choice list',
  tag: 'Tags',
  date: 'Date',
};
const KINDS = Object.keys(KIND_LABELS);
// Common prop-firm evaluation rules: minimum trading days, max daily loss, overall
// profit target, max drawdown from equity peak, and the "no single day dominates
// total profit" consistency rule.
const METRIC_META = {
  trading_days: { label: 'Trading days', unit: 'days', prefix: false },
  max_daily_loss: { label: 'Max daily loss', unit: '$', prefix: true },
  profit_target: { label: 'Profit target', unit: '$', prefix: true },
  max_drawdown: { label: 'Max drawdown', unit: '$', prefix: true },
  consistency: { label: 'Consistency (best day vs. total)', unit: '%', prefix: false },
};
const METRICS = Object.keys(METRIC_META);
const COMPARISON_LABELS = {
  min: 'At least',
  max: 'At most',
  exact: 'Exactly',
};
const COMPARISONS = Object.keys(COMPARISON_LABELS);
const THEMES = [
  { value: 'system', label: 'Match system', icon: icons.monitor },
  { value: 'light', label: 'Light', icon: icons.sun },
  { value: 'dark', label: 'Dark', icon: icons.moon },
];

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
              <td>${KIND_LABELS[d.kind] || d.kind}${d.is_default ? ' <span class="empty-placeholder">(default)</span>' : ''}</td>
              <td><input type="checkbox" class="field-hidden" ${d.hidden ? 'checked' : ''} /></td>
              <td>${d.is_default ? '' : '<button class="btn btn-secondary negative field-delete">Delete</button>'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="card" style="margin-top: var(--space-4); margin-bottom: var(--space-6)">
        <div class="form-row">
          <label class="form-label">Add custom field</label>
          <div style="display:flex; gap: var(--space-2)">
            <input type="text" class="new-field-label" placeholder="Field label" style="flex:1" />
            <select class="new-field-kind">${KINDS.map((k) => `<option value="${k}">${KIND_LABELS[k]}</option>`).join('')}</select>
            <button class="btn btn-primary new-field-add">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function metricOptions(selected) {
  return METRICS.map((m) => `<option value="${m}"${m === selected ? ' selected' : ''}>${METRIC_META[m].label}</option>`).join('');
}

function comparisonOptions(selected) {
  return COMPARISONS.map((c) => `<option value="${c}"${c === selected ? ' selected' : ''}>${COMPARISON_LABELS[c]}</option>`).join('');
}

function targetWrap(metric, value, cls) {
  const unit = METRIC_META[metric].unit;
  const prefix = METRIC_META[metric].prefix;
  return `
    <div class="objective-target-wrap${prefix ? ' prefix' : ''}">
      <input type="number" step="any" class="${cls}" value="${value}" />
      <span class="objective-unit">${unit}</span>
    </div>
  `;
}

// cls picks the class used for the edit-row controls ('objective-*') vs. the add-row controls
// ('new-objective-*') so both markups share one builder.
function objectiveRule(metric, comparison, target, cls = 'objective') {
  return `
    <div class="objective-rule">
      <select class="${cls}-metric">${metricOptions(metric)}</select>
      <select class="${cls}-comparison">${comparisonOptions(comparison)}</select>
      ${targetWrap(metric, target, `${cls}-target`)}
    </div>
  `;
}

function objectivesSection(objectives) {
  return `
    <div class="objectives-section">
      <h2 class="section-title">Objectives</h2>
      <table class="data-table">
        <thead><tr><th>Label</th><th>Rule</th><th>Active</th><th></th></tr></thead>
        <tbody>
          ${objectives
            .map(
              (o) => `
            <tr data-id="${o.id}">
              <td><input type="text" class="objective-label" value="${esc(o.label)}" /></td>
              <td class="objective-rule-cell">${objectiveRule(o.metric, o.comparison, o.target_value)}</td>
              <td class="objective-active-cell"><input type="checkbox" class="objective-active" ${o.active ? 'checked' : ''} /></td>
              <td><button class="btn btn-secondary negative objective-delete">Delete</button></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="card" style="margin-top: var(--space-4); margin-bottom: var(--space-6)">
        <div class="form-row">
          <label class="form-label">Add objective</label>
          <input type="text" class="new-objective-label" placeholder="Objective label" />
        </div>
        <div class="form-row" style="margin-bottom: 0">
          <label class="form-label">Rule</label>
          <div style="display:flex; align-items:center; gap: var(--space-2)">
            ${objectiveRule(METRICS[0], COMPARISONS[0], 0, 'new-objective')}
            <button class="btn btn-primary new-objective-add" style="margin-left:auto">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function render(container) {
  container.innerHTML = `<h1 class="page-title">Settings</h1><p class="empty-placeholder">Loading...</p>`;
  const [settings, tradeFields, journalFields, objectives] = await Promise.all([
    getSettings(),
    listFieldDefs('trade'),
    listFieldDefs('journal'),
    listObjectives(),
  ]);

  container.innerHTML = `
    <h1 class="page-title">Settings</h1>

    <h2 class="section-title">Appearance</h2>
    <div class="card" style="margin-bottom: var(--space-6)">
      <div class="form-row">
        <label class="form-label">Theme</label>
        <div class="theme-toggle" id="theme-toggle">
          <span class="theme-toggle-thumb" style="transform: translateX(${THEMES.findIndex((t) => t.value === (settings.theme || 'system')) * 34}px)"></span>
          ${THEMES.map((t) => `<button type="button" class="theme-option${(settings.theme || 'system') === t.value ? ' active' : ''}" data-theme="${t.value}" title="${t.label}" aria-label="${t.label}">${t.icon}</button>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Accent color</label>
        <input type="color" id="accent-input" value="${settings.accent || '#5E6AD2'}" style="width:60px; padding: 2px" />
      </div>
      <div class="form-row">
        <label class="form-label">Starting balance</label>
        <input type="number" step="0.01" id="balance-input" value="${settings.starting_balance || 0}" />
      </div>
    </div>

    ${objectivesSection(objectives)}
    ${fieldSection('trade', 'Trade', tradeFields)}
    ${fieldSection('journal', 'Journal', journalFields)}
  `;

  container.querySelectorAll('#theme-toggle .theme-option').forEach((btn, i) => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      container.querySelectorAll('#theme-toggle .theme-option').forEach((b) => b.classList.toggle('active', b === btn));
      container.querySelector('.theme-toggle-thumb').style.transform = `translateX(${i * 34}px)`;
      settings.theme = theme;
      await updateSetting('theme', theme);
      applyTheme({ theme, accent: settings.accent });
    });
  });
  container.querySelector('#accent-input').addEventListener('change', async (e) => {
    await updateSetting('accent', e.target.value);
    applyTheme({ theme: settings.theme, accent: e.target.value });
  });
  container.querySelector('#balance-input').addEventListener('blur', (e) => {
    updateSetting('starting_balance', e.target.value);
  });

  const objectivesEl = container.querySelector('.objectives-section');
  objectivesEl.querySelectorAll('.objective-rule').forEach((ruleEl) => {
    const metricSelect = ruleEl.querySelector('select');
    const wrap = ruleEl.querySelector('.objective-target-wrap');
    metricSelect.addEventListener('change', () => {
      const meta = METRIC_META[metricSelect.value];
      wrap.classList.toggle('prefix', meta.prefix);
      wrap.querySelector('.objective-unit').textContent = meta.unit;
    });
  });
  objectivesEl.querySelectorAll('tbody tr').forEach((row) => {
    const id = row.dataset.id;
    const save = () =>
      updateObjective(
        id,
        row.querySelector('.objective-label').value,
        parseFloat(row.querySelector('.objective-target').value) || 0,
        row.querySelector('.objective-comparison').value,
        row.querySelector('.objective-metric').value,
        row.querySelector('.objective-active').checked
      );
    row.querySelector('.objective-label').addEventListener('blur', save);
    row.querySelector('.objective-target').addEventListener('blur', save);
    row.querySelector('.objective-comparison').addEventListener('change', save);
    row.querySelector('.objective-metric').addEventListener('change', save);
    row.querySelector('.objective-active').addEventListener('change', save);
    row.querySelector('.objective-delete').addEventListener('click', async () => {
      if (!(await confirmDialog('This objective will no longer count toward the discipline score.', { title: `Delete objective "${row.querySelector('.objective-label').value}"?` }))) return;
      await deleteObjective(id);
      render(container);
    });
  });
  objectivesEl.querySelector('.new-objective-add').addEventListener('click', async () => {
    const label = objectivesEl.querySelector('.new-objective-label').value.trim();
    if (!label) return;
    const metric = objectivesEl.querySelector('.new-objective-metric').value;
    const comparison = objectivesEl.querySelector('.new-objective-comparison').value;
    const target_value = parseFloat(objectivesEl.querySelector('.new-objective-target').value) || 0;
    await createObjective({ label, metric, comparison, target_value });
    render(container);
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
          if (!(await confirmDialog(`Existing data in this field is kept but hidden.`, { title: `Delete field "${def.label}"?` }))) return;
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
