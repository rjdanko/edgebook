import { listTrades, createTrade, updateTrade, deleteTrade, listFieldDefs } from './api.js';
import { mountAttachments } from './attachments-ui.js';
import { renderCustomFieldRows, readCustomFieldValues } from './custom-fields.js';
import { exportTrade, exportSelectedTrades } from './export.js';
import { mountTagSelect, tagPillHtml } from './tag-select.js';
import { confirmDialog } from './confirm-dialog.js';

function category(trade) {
  if (trade.net_pl > 0) return 'profit';
  if (trade.net_pl < 0) return 'loss';
  return 'breakeven';
}

function fmtMoney(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function moneyClass(n) {
  return n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral-warn';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const FILTERS = [
  { key: 'all', label: 'All Trades' },
  { key: 'profit', label: 'Profit' },
  { key: 'loss', label: 'Loss' },
  { key: 'breakeven', label: 'Breakeven' },
];

export async function render(container) {
  let trades = await listTrades();
  const allFieldDefs = await listFieldDefs('trade');
  const customFieldDefs = allFieldDefs.filter((d) => !d.is_default);
  const symbolDef = allFieldDefs.find((d) => d.key === 'symbol');
  const sessionDef = allFieldDefs.find((d) => d.key === 'session');
  let activeFilter = 'all';
  const selectedIds = new Set();

  function renderList() {
    const filtered = activeFilter === 'all' ? trades : trades.filter((t) => category(t) === activeFilter);
    const sum = filtered.reduce((s, t) => s + t.net_pl, 0);
    selectedIds.forEach((id) => { if (!filtered.some((t) => t.id === id)) selectedIds.delete(id); });

    container.innerHTML = `
      <h1 class="page-title">Trades</h1>
      <div class="filter-tabs">
        ${FILTERS.map((f) => `<button class="filter-tab${f.key === activeFilter ? ' active' : ''}" data-filter="${f.key}">${f.label}</button>`).join('')}
        <button class="btn btn-primary" id="new-trade" style="margin-left:auto">New Trade</button>
      </div>
      <div class="bulk-toolbar${selectedIds.size ? ' visible' : ''}">
        <span class="bulk-count">${selectedIds.size} selected</span>
        <button class="btn btn-secondary" id="bulk-export">Export</button>
        <button class="btn btn-secondary negative" id="bulk-delete">Delete</button>
        <button class="btn btn-secondary" id="bulk-cancel">Cancel</button>
      </div>
      <table class="data-table${selectedIds.size ? ' has-selection' : ''}">
        <thead>
          <tr><th class="select-col"></th><th>Date</th><th>Symbol</th><th>Position</th><th>Session</th><th class="numeric">Net P/L</th></tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (t) => `
            <tr class="trade-row${selectedIds.has(t.id) ? ' selected' : ''}" data-id="${t.id}">
              <td class="select-col"><input type="checkbox" class="row-check" data-id="${t.id}"${selectedIds.has(t.id) ? ' checked' : ''} /></td>
              <td>${esc(t.date)}</td>
              <td>${tagPillHtml(symbolDef.options, t.symbol)}</td>
              <td>${esc(t.position)}</td>
              <td>${tagPillHtml(sessionDef.options, t.session)}</td>
              <td class="numeric ${moneyClass(t.net_pl)}">${fmtMoney(t.net_pl)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <p class="table-footer">${filtered.length} trade${filtered.length === 1 ? '' : 's'} &middot; <span class="${moneyClass(sum)}">${fmtMoney(sum)}</span></p>
    `;

    container.querySelectorAll('.filter-tab').forEach((btn) =>
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        renderList();
      })
    );
    container.querySelectorAll('.trade-row').forEach((row) =>
      row.addEventListener('click', (e) => {
        if (e.target.closest('.select-col')) return;
        renderDetail(trades.find((t) => t.id === row.dataset.id));
      })
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
      exportSelectedTrades(trades.filter((t) => selectedIds.has(t.id)));
    });
    container.querySelector('#bulk-delete')?.addEventListener('click', async () => {
      if (!(await confirmDialog(`Delete ${selectedIds.size} selected trade${selectedIds.size === 1 ? '' : 's'} and their screenshots? This cannot be undone.`, { title: 'Delete trades' }))) return;
      for (const id of selectedIds) await deleteTrade(id);
      trades = trades.filter((t) => !selectedIds.has(t.id));
      selectedIds.clear();
      renderList();
    });
    container.querySelector('#new-trade').addEventListener('click', () => {
      renderDetail({
        date: new Date().toISOString().slice(0, 10),
        symbol: '',
        position: 'Long',
        session: '',
        net_pl: 0,
        lots: 0,
        confluences: '',
        narrative: '',
        emotions: '',
        custom_fields: {},
      });
    });
  }

  function field(label, inputHtml) {
    return `<div class="form-row"><label class="form-label">${label}</label>${inputHtml}</div>`;
  }

  function renderDetail(trade, { hideActions = false } = {}) {
    const isNew = !trade.id;

    container.innerHTML = `
      <button class="btn btn-secondary" id="back">&larr; Back to Trades</button>
      <h1 class="page-title">Trade detail</h1>
      <div class="card detail-form">
        ${field('Date', `<input type="date" data-field="date" value="${esc(trade.date)}" />`)}
        ${field('Symbol', `<div id="symbol-select"></div>`)}
        ${field(
          'Position',
          `<select data-field="position"><option${trade.position === 'Long' ? ' selected' : ''}>Long</option><option${trade.position === 'Short' ? ' selected' : ''}>Short</option></select>`
        )}
        ${field('Session', `<div id="session-select"></div>`)}
        ${field('Net P/L', `<input type="number" step="0.01" data-field="net_pl" value="${trade.net_pl}" />`)}
        ${field('Lots', `<input type="number" step="0.01" data-field="lots" value="${trade.lots}" />`)}
        ${field('Confluences', `<textarea data-field="confluences" placeholder="Empty">${esc(trade.confluences)}</textarea>`)}
        ${field('Narrative', `<textarea data-field="narrative" placeholder="Empty">${esc(trade.narrative)}</textarea>`)}
        ${field('Emotions', `<textarea data-field="emotions" placeholder="Empty">${esc(trade.emotions)}</textarea>`)}
        ${renderCustomFieldRows(customFieldDefs, trade.custom_fields)}
      </div>
      ${
        isNew
          ? `<div class="detail-actions"><button class="btn btn-primary" id="save-trade">Save trade</button></div>`
          : `<h2 class="section-title">Screenshots</h2>
             <div class="card" id="attachments"></div>
             ${
               hideActions
                 ? ''
                 : `<div class="detail-actions">
               <button class="btn btn-secondary" id="export-trade">Export to PDF</button>
               <button class="btn btn-secondary negative" id="delete-trade">Delete trade</button>
             </div>`
             }`
      }
    `;

    if (!isNew) mountAttachments(container.querySelector('#attachments'), 'trade', trade.id);

    let symbolValue = trade.symbol;
    let sessionValue = trade.session;
    mountTagSelect({
      trigger: container.querySelector('#symbol-select'),
      fieldDef: symbolDef,
      value: symbolValue,
      onChange: (v) => { symbolValue = v; if (!isNew) save(); },
    });
    mountTagSelect({
      trigger: container.querySelector('#session-select'),
      fieldDef: sessionDef,
      value: sessionValue,
      onChange: (v) => { sessionValue = v; if (!isNew) save(); },
    });

    function readForm() {
      const form = container.querySelector('.detail-form');
      return {
        date: form.querySelector('[data-field=date]').value,
        symbol: symbolValue,
        position: form.querySelector('[data-field=position]').value,
        session: sessionValue,
        net_pl: parseFloat(form.querySelector('[data-field=net_pl]').value) || 0,
        lots: parseFloat(form.querySelector('[data-field=lots]').value) || 0,
        confluences: form.querySelector('[data-field=confluences]').value,
        narrative: form.querySelector('[data-field=narrative]').value,
        emotions: form.querySelector('[data-field=emotions]').value,
        custom_fields: readCustomFieldValues(form, customFieldDefs),
      };
    }

    async function save() {
      const updated = await updateTrade(trade.id, readForm());
      Object.assign(trade, updated);
    }

    if (isNew) {
      container.querySelector('#save-trade').addEventListener('click', async () => {
        const created = await createTrade(readForm());
        trades.unshift(created);
        renderDetail(created, { hideActions: true });
      });
    } else {
      container.querySelectorAll('.detail-form input, .detail-form select, .detail-form textarea').forEach((el) => {
        el.addEventListener('blur', save);
        if (el.tagName === 'SELECT' || el.type === 'checkbox') el.addEventListener('change', save);
      });
    }

    container.querySelector('#back').addEventListener('click', async () => {
      trades = await listTrades();
      renderList();
    });

    if (!isNew && !hideActions) {
      container.querySelector('#export-trade').addEventListener('click', () => exportTrade(trade));
      container.querySelector('#delete-trade').addEventListener('click', async () => {
        if (!(await confirmDialog('Delete this trade and its screenshots? This cannot be undone.', { title: 'Delete trade' }))) return;
        await deleteTrade(trade.id);
        trades = trades.filter((t) => t.id !== trade.id);
        renderList();
      });
    }
  }

  renderList();
}
