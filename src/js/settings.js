import { getSettings } from './api.js';

export async function render(container) {
  container.innerHTML = `<h1 class="page-title">Settings</h1><p class="empty-placeholder">Loading...</p>`;
  const settings = await getSettings();
  container.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <p class="empty-placeholder">Appearance, field customization, and data folder controls land in Phase 5.</p>
    <h2 class="section-title">Current settings</h2>
    <div class="card">
      <pre>${JSON.stringify(settings, null, 2)}</pre>
    </div>
  `;
}
