// Thin wrapper over Tauri's invoke - the only file that touches @tauri-apps/api.
const { invoke } = window.__TAURI__.core;

export function getSettings() {
  return invoke('get_settings');
}
