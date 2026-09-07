// Shared colored tag/select control for recurring free-text values (Symbol, Session, Journal Type).
// Options + colors persist on the owning field_def's `options` JSON column via updateFieldDef.
import { updateFieldDef } from './api.js';

export const TAG_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function colorFor(options, value) {
  return (options.find((o) => o.value === value) || {}).color || 'gray';
}

export function tagPillHtml(options, value) {
  if (!value) return '<span class="empty-placeholder">Empty</span>';
  return `<span class="tag-pill ${colorFor(options || [], value)}">${esc(value)}</span>`;
}

function nextColor(options) {
  return TAG_COLORS[options.length % TAG_COLORS.length];
}

async function persist(fieldDef) {
  await updateFieldDef(fieldDef.id, fieldDef.label, fieldDef.hidden, fieldDef.sort_order, fieldDef.options);
}

export function mountTagSelect({ trigger, fieldDef, value, onChange, placeholder = 'Select an option...' }) {
  let current = value || '';

  function renderTrigger() {
    trigger.innerHTML = `
      <span class="tag-select-value">${current ? `<span class="tag-pill ${colorFor(fieldDef.options, current)}">${esc(current)}</span>` : `<span class="tag-select-placeholder">${esc(placeholder)}</span>`}</span>
      ${current ? '<button type="button" class="tag-select-clear" aria-label="Clear">&times;</button>' : ''}
    `;
    const clearBtn = trigger.querySelector('.tag-select-clear');
    if (clearBtn) clearBtn.addEventListener('click', (e) => { e.stopPropagation(); select(''); });
  }

  function select(newValue) {
    current = newValue;
    onChange(newValue);
    renderTrigger();
  }

  function openPanel() {
    const rect = trigger.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.className = 'tag-select-panel';
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.width = `${Math.max(rect.width, 220)}px`;

    panel.innerHTML = `
      <input type="text" class="tag-select-search" placeholder="Search for an option..." />
      <div class="tag-select-hint">Select an option or create one</div>
      <div class="tag-select-options"></div>
    `;
    const search = panel.querySelector('.tag-select-search');
    const optionsEl = panel.querySelector('.tag-select-options');

    function draw(query) {
      const q = query.trim().toLowerCase();
      const matches = fieldDef.options.filter((o) => o.value.toLowerCase().includes(q));
      const exact = fieldDef.options.some((o) => o.value.toLowerCase() === q);
      optionsEl.innerHTML = `
        ${matches
          .map(
            (o) => `
          <div class="tag-select-option" data-value="${esc(o.value)}">
            <span class="tag-pill ${o.color}">${esc(o.value)}</span>
            <button type="button" class="tag-select-color-dot ${o.color}" data-value="${esc(o.value)}" title="Change color" aria-label="Change color"></button>
            <button type="button" class="tag-select-delete" data-value="${esc(o.value)}" aria-label="Delete option">&times;</button>
          </div>`
          )
          .join('')}
        ${
          q && !exact
            ? `<div class="tag-select-option tag-select-create" data-create="${esc(query.trim())}">+ Create <span class="tag-pill gray">${esc(query.trim())}</span></div>`
            : ''
        }
      `;

      optionsEl.querySelectorAll('.tag-select-option[data-value]').forEach((row) => {
        row.addEventListener('click', () => {
          select(row.dataset.value);
          closePanel();
        });
      });
      optionsEl.querySelectorAll('.tag-select-color-dot').forEach((dot) => {
        dot.addEventListener('click', async (e) => {
          e.stopPropagation();
          const opt = fieldDef.options.find((o) => o.value === dot.dataset.value);
          opt.color = TAG_COLORS[(TAG_COLORS.indexOf(opt.color) + 1) % TAG_COLORS.length];
          await persist(fieldDef);
          if (current === opt.value) renderTrigger();
          draw(search.value);
        });
      });
      optionsEl.querySelectorAll('.tag-select-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          fieldDef.options = fieldDef.options.filter((o) => o.value !== btn.dataset.value);
          await persist(fieldDef);
          draw(search.value);
        });
      });
      const create = optionsEl.querySelector('.tag-select-create');
      if (create) {
        create.addEventListener('click', async () => {
          const newValue = create.dataset.create;
          fieldDef.options.push({ value: newValue, color: nextColor(fieldDef.options) });
          await persist(fieldDef);
          select(newValue);
          closePanel();
        });
      }
    }

    search.addEventListener('input', () => draw(search.value));
    search.addEventListener('click', (e) => e.stopPropagation());
    search.addEventListener('keydown', (e) => e.stopPropagation());

    draw('');
    document.body.appendChild(panel);
    search.focus();

    function onOutsideClick(e) {
      if (!panel.contains(e.target) && e.target !== trigger) closePanel();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') closePanel();
    }
    function closePanel() {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onKeydown);
      panel.remove();
    }
    setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 0);
    document.addEventListener('keydown', onKeydown);
  }

  trigger.classList.add('tag-select-trigger');
  trigger.tabIndex = 0;
  trigger.addEventListener('click', openPanel);
  renderTrigger();
}
