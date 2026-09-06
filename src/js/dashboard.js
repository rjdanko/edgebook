import { listTrades, listObjectives } from './api.js';

function fmtMoney(n) {
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return `${sign}${n.toFixed(2)}`;
}

function moneyClass(n) {
  return n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral-warn';
}

// Groups trades by calendar day for the given month, returning date -> net P/L.
function dailyPl(trades, year, month) {
  const map = new Map();
  for (const t of trades) {
    const d = new Date(t.date + 'T00:00:00');
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    map.set(t.date, (map.get(t.date) || 0) + t.net_pl);
  }
  return map;
}

// Objective pass rules: 'min' passes when current >= target, 'max' when current <= target,
// 'exact' when current === target. Discipline score is the plain pass rate over active objectives -
// a placeholder formula (PRD open question) until a real weighting is defined.
function evalObjective(o, currentValue) {
  let passed;
  if (o.comparison === 'min') passed = currentValue >= o.target_value;
  else if (o.comparison === 'max') passed = currentValue <= o.target_value;
  else passed = currentValue === o.target_value;
  return { ...o, current_value: currentValue, passed };
}

function metricValue(metric, trades, dailyMap) {
  if (metric === 'trading_days') return new Set(trades.map((t) => t.date)).size;
  if (metric === 'max_daily_loss') {
    const vals = [...dailyMap.values()];
    return vals.length ? Math.min(...vals) : 0;
  }
  return 0;
}

function renderCalendar(year, month, dailyMap) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push('<div class="calendar-cell empty"></div>');
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const pl = dailyMap.get(dateStr);
    const cls = pl === undefined ? '' : moneyClass(pl);
    cells.push(`
      <div class="calendar-cell ${cls}">
        <span class="calendar-day">${day}</span>
        ${pl === undefined ? '' : `<span class="calendar-pl">${fmtMoney(pl)}</span>`}
      </div>
    `);
  }

  return `
    <h2 class="section-title">${monthLabel}</h2>
    <div class="calendar-grid">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="calendar-dow">${d}</div>`).join('')}
      ${cells.join('')}
    </div>
  `;
}

export async function render(container) {
  const [trades, objectives] = await Promise.all([listTrades(), listObjectives()]);

  const now = new Date();
  const dailyMap = dailyPl(trades, now.getFullYear(), now.getMonth());

  const wins = trades.filter((t) => t.net_pl > 0).length;
  const losses = trades.filter((t) => t.net_pl < 0).length;
  const decided = wins + losses;
  const winRate = decided ? (wins / decided) * 100 : 0;
  const totalPl = trades.reduce((s, t) => s + t.net_pl, 0);
  const grossWin = trades.filter((t) => t.net_pl > 0).reduce((s, t) => s + t.net_pl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.net_pl < 0).reduce((s, t) => s + t.net_pl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const activeObjectives = objectives.filter((o) => o.active).map((o) => evalObjective(o, metricValue(o.metric, trades, dailyMap)));
  const disciplineScore = activeObjectives.length
    ? Math.round((activeObjectives.filter((o) => o.passed).length / activeObjectives.length) * 100)
    : 100;

  container.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <div class="card-grid">
      <div class="card"><span class="stat-label">Total trades</span><span class="stat-value">${trades.length}</span></div>
      <div class="card"><span class="stat-label">Win rate</span><span class="stat-value">${winRate.toFixed(1)}%</span></div>
      <div class="card"><span class="stat-label">Net P/L</span><span class="stat-value ${moneyClass(totalPl)}">${fmtMoney(totalPl)}</span></div>
      <div class="card"><span class="stat-label">Profit factor</span><span class="stat-value">${profitFactor === Infinity ? '&infin;' : profitFactor.toFixed(2)}</span></div>
      <div class="card"><span class="stat-label">Discipline score</span><span class="stat-value">${disciplineScore}%</span></div>
    </div>

    ${renderCalendar(now.getFullYear(), now.getMonth(), dailyMap)}

    <h2 class="section-title">Objectives</h2>
    <table class="data-table">
      <thead><tr><th>Objective</th><th>Target</th><th>Current</th><th>Status</th></tr></thead>
      <tbody>
        ${
          objectives.length === 0
            ? '<tr><td colspan="4" class="empty-placeholder">No objectives configured.</td></tr>'
            : objectives
                .map((o) => {
                  const evaluated = o.active ? activeObjectives.find((a) => a.id === o.id) : null;
                  return `
                  <tr>
                    <td>${o.label}${o.active ? '' : ' <span class="empty-placeholder">(inactive)</span>'}</td>
                    <td>${o.target_value}</td>
                    <td>${evaluated ? evaluated.current_value : '&mdash;'}</td>
                    <td>${evaluated ? `<span class="pill ${evaluated.passed ? 'positive' : 'negative'}">${evaluated.passed ? 'On track' : 'Off track'}</span>` : '&mdash;'}</td>
                  </tr>`;
                })
                .join('')
        }
      </tbody>
    </table>
  `;
}
