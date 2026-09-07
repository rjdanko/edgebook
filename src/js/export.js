// Builds a print-friendly HTML document and hands it to the OS print dialog,
// where "Save as PDF" / "Microsoft Print to PDF" produces the file - avoids
// pulling in a PDF-layout dependency for something the platform already does.
import { listTrades, listJournalEntries, listAttachments } from './api.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function tradeSection(t) {
  const images = await listAttachments('trade', t.id);
  return `
    <section class="export-item">
      <h2>${esc(t.date)} &middot; ${esc(t.symbol) || 'Trade'}</h2>
      <table class="export-fields">
        <tr><th>Position</th><td>${esc(t.position)}</td><th>Session</th><td>${esc(t.session)}</td></tr>
        <tr><th>Net P/L</th><td>${t.net_pl.toFixed(2)}</td><th>Lots</th><td>${t.lots}</td></tr>
      </table>
      ${t.confluences ? `<h3>Confluences</h3><p>${esc(t.confluences)}</p>` : ''}
      ${t.narrative ? `<h3>Narrative</h3><p>${esc(t.narrative)}</p>` : ''}
      ${t.emotions ? `<h3>Emotions</h3><p>${esc(t.emotions)}</p>` : ''}
      ${images.length ? `<div class="export-images">${images.map((i) => `<img src="${i.data_url}" />`).join('')}</div>` : ''}
    </section>
  `;
}

async function resolveJournalImages(content, entryId) {
  if (!content || !content.includes('data-attachment-id')) return content;
  const attachments = await listAttachments('journal', entryId);
  const byId = new Map(attachments.map((a) => [a.id, a.data_url]));
  return content.replace(/<img([^>]*)data-attachment-id="([^"]+)"([^>]*)>/g, (match, before, id, after) => {
    const url = byId.get(id);
    return url ? `<img${before}src="${url}"${after}>` : match;
  });
}

async function journalSection(e) {
  const content = await resolveJournalImages(e.content, e.id);
  return `
    <section class="export-item">
      <h2>${esc(e.date)} &middot; ${esc(e.title) || 'Untitled'}${e.type ? ` (${esc(e.type)})` : ''}</h2>
      ${content ? `<div class="export-journal-content">${content}</div>` : ''}
    </section>
  `;
}

const PRINT_CSS = `
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; margin-bottom: 20px; }
  .export-item { break-inside: avoid; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5; }
  .export-item h2 { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .export-item h3 { font-size: 12px; font-weight: 500; color: #666; margin: 12px 0 2px; }
  .export-fields { border-collapse: collapse; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
  .export-fields th { text-align: left; color: #666; font-weight: 500; padding: 2px 8px 2px 0; }
  .export-fields td { padding: 2px 16px 2px 0; }
  .export-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .export-images img { max-width: 260px; max-height: 180px; object-fit: contain; border: 1px solid #e5e5e5; border-radius: 6px; }
  .export-journal-content { font-size: 13px; line-height: 1.6; }
  .export-journal-content img { max-width: 100%; border: 1px solid #e5e5e5; border-radius: 6px; margin: 8px 0; }
`;

async function openPrintWindow(title, sectionsHtml) {
  const win = window.open('', '_blank');
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>${PRINT_CSS}</style></head>
    <body><h1>${esc(title)}</h1>${sectionsHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
  // Some webviews fire onload before write() settles - fall back to a short delay too.
  setTimeout(() => win.print(), 300);
}

export async function exportTrade(trade) {
  await openPrintWindow(`Trade - ${trade.date}`, await tradeSection(trade));
}

export async function exportJournalEntry(entry) {
  await openPrintWindow(`Journal - ${entry.date}`, await journalSection(entry));
}

export async function exportSelectedTrades(trades) {
  const parts = [];
  for (const t of trades) parts.push(await tradeSection(t));
  await openPrintWindow(`EdgeBook Export - ${trades.length} trade${trades.length === 1 ? '' : 's'}`, parts.join(''));
}

export async function exportSelectedJournalEntries(entries) {
  const parts = [];
  for (const e of entries) parts.push(await journalSection(e));
  await openPrintWindow(`EdgeBook Export - ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`, parts.join(''));
}

// kind: 'trades' | 'journal' | 'both'. from/to are 'YYYY-MM-DD' strings, or empty for no bound.
export async function exportRange({ kind, from, to }) {
  const inRange = (d) => (!from || d >= from) && (!to || d <= to);
  const parts = [];

  if (kind === 'trades' || kind === 'both') {
    const trades = (await listTrades()).filter((t) => inRange(t.date));
    for (const t of trades) parts.push(await tradeSection(t));
  }
  if (kind === 'journal' || kind === 'both') {
    const entries = (await listJournalEntries()).filter((e) => inRange(e.date));
    for (const e of entries) parts.push(await journalSection(e));
  }

  if (parts.length === 0) {
    alert('No entries in the selected range.');
    return;
  }
  const label = from || to ? `${from || 'start'} to ${to || 'now'}` : 'All entries';
  await openPrintWindow(`EdgeBook Export - ${label}`, parts.join(''));
}
