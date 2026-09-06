import { listTrades, createTrade, updateTrade, deleteTrade, listFieldDefs } from './api.js';
import { mountAttachments } from './attachments-ui.js';
import { renderCustomFieldRows, readCustomFieldValues } from './custom-fields.js';

function category(trade) {
  if (trade.is_breakeven) return 'breakeven';
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
  const customFieldDefs = (await listFieldDefs('trade')).filter((d) => !d.is_default);
  let activeFilter = 'all';

  function renderList() {
    const filtered = activeFilter === 'all' ? trades : trades.filter((t) => category(t) === activeFilter);
    const sum = filtered.reduce((s, t) => s + t.net_pl, 0);

    container.innerHTML = `
      <h1 class="page-title">Trades</h1>
      <div class="filter-tabs">
        ${FILTERS.map((f) => `<button class="filter-tab${f.key === activeFilter ? ' active' : ''}" data-filter="${f.key}">${f.label}</button>`).join('')}
        <button class="btn btn-primary" id="new-trade" style="margin-left:auto">New Trade</button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Symbol</th><th>Position</th><th>Session</th><th class="numeric">Net P/L</th></tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (t) => `
            <tr class="trade-row" data-id="${t.id}">
              <td>${esc(t.date)}</td>
              <td>${t.symbol ? esc(t.symbol) : '<span class="empty-placeholder">Empty</span>'}</td>
              <td>${esc(t.position)}</td>
              <td>${esc(t.session)}</td>
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
      row.addEventListener('click', () => renderDetail(trades.find((t) => t.id === row.dataset.id)))
    );
    container.querySelector('#new-trade').addEventListener('click', async () => {
      const trade = await createTrade({
        date: new Date().toISOString().slice(0, 10),
        symbol: '',
        position: 'Long',
        session: '',
        net_pl: 0,
        lots: 0,
        is_breakeven: false,
        confluences: '',
        narrative: '',
        emotions: '',
        custom_fields: {},
      });
      trades.unshift(trade);
      renderDetail(trade);
    });
  }

  function field(label, inputHtml) {
    return `<div class="form-row"><label class="form-label">${label}</label>${inputHtml}</div>`;
  }

  function renderDetail(trade) {
    container.innerHTML = `
      <button class="btn btn-secondary" id="back">&larr; Back to Trades</button>
      <h1 class="page-title">Trade detail</h1>
      <div class="card detail-form">
        ${field('Date', `<input type="date" data-field="date" value="${esc(trade.date)}" />`)}
        ${field('Symbol', `<input type="text" data-field="symbol" value="${esc(trade.symbol)}" placeholder="Empty" />`)}
        ${field(
          'Position',
          `<select data-field="position"><option${trade.position === 'Long' ? ' selected' : ''}>Long</option><option${trade.position === 'Short' ? ' selected' : ''}>Short</option></select>`
        )}
        ${field('Session', `<input type="text" data-field="session" value="${esc(trade.session)}" placeholder="Empty" />`)}
        ${field('Net P/L', `<input type="number" step="0.01" data-field="net_pl" value="${trade.net_pl}" />`)}
        ${field('Lots', `<input type="number" step="0.01" data-field="lots" value="${trade.lots}" />`)}
        ${field('Breakeven', `<input type="checkbox" data-field="is_breakeven"${trade.is_breakeven ? ' checked' : ''} />`)}
        ${field('Confluences', `<textarea data-field="confluences" placeholder="Empty">${esc(trade.confluences)}</textarea>`)}
        ${field('Narrative', `<textarea data-field="narrative" placeholder="Empty">${esc(trade.narrative)}</textarea>`)}
        ${field('Emotions', `<textarea data-field="emotions" placeholder="Empty">${esc(trade.emotions)}</textarea>`)}
        ${renderCustomFieldRows(customFieldDefs, trade.custom_fields)}
      </div>
      <h2 class="section-title">Screenshots</h2>
      <div class="card" id="attachments"></div>
      <button class="btn btn-secondary negative" id="delete-trade" style="margin-top:16px">Delete trade</button>
    `;

    mountAttachments(container.querySelector('#attachments'), 'trade', trade.id);

    async function save() {
      const form = container.querySelector('.detail-form');
      const patch = {
        date: form.querySelector('[data-field=date]').value,
        symbol: form.querySelector('[data-field=symbol]').value,
        position: form.querySelector('[data-field=position]').value,
        session: form.querySelector('[data-field=session]').value,
        net_pl: parseFloat(form.querySelector('[data-field=net_pl]').value) || 0,
        lots: parseFloat(form.querySelector('[data-field=lots]').value) || 0,
        is_breakeven: form.querySelector('[data-field=is_breakeven]').checked,
        confluences: form.querySelector('[data-field=confluences]').value,
        narrative: form.querySelector('[data-field=narrative]').value,
        emotions: form.querySelector('[data-field=emotions]').value,
        custom_fields: readCustomFieldValues(form, customFieldDefs),
      };
      const updated = await updateTrade(trade.id, patch);
      Object.assign(trade, updated);
    }

    container.querySelectorAll('.detail-form input, .detail-form select, .detail-form textarea').forEach((el) => {
      el.addEventListener('blur', save);
      if (el.tagName === 'SELECT' || el.type === 'checkbox') el.addEventListener('change', save);
    });

    container.querySelector('#back').addEventListener('click', async () => {
      trades = await listTrades();
      renderList();
    });

    container.querySelector('#delete-trade').addEventListener('click', async () => {
      if (!confirm('Delete this trade and its screenshots?')) return;
      await deleteTrade(trade.id);
      trades = trades.filter((t) => t.id !== trade.id);
      renderList();
    });
  }

  renderList();
}
