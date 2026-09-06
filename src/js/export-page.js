import { exportRange } from './export.js';

export function render(container) {
  container.innerHTML = `
    <h1 class="page-title">Export</h1>
    <div class="card detail-form">
      <div class="form-row">
        <label class="form-label">Include</label>
        <select id="export-kind">
          <option value="both">Trades + Journal</option>
          <option value="trades">Trades only</option>
          <option value="journal">Journal only</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">From (optional)</label>
        <input type="date" id="export-from" />
      </div>
      <div class="form-row">
        <label class="form-label">To (optional)</label>
        <input type="date" id="export-to" />
      </div>
      <button class="btn btn-primary" id="export-go">Generate PDF</button>
      <p class="empty-placeholder" style="margin-top:8px">Leave dates empty to export everything. The print dialog opens next - choose "Save as PDF".</p>
    </div>
  `;

  container.querySelector('#export-go').addEventListener('click', () => {
    exportRange({
      kind: container.querySelector('#export-kind').value,
      from: container.querySelector('#export-from').value,
      to: container.querySelector('#export-to').value,
    });
  });
}
