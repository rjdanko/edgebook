// Thin wrapper over Tauri's invoke - the only file that touches @tauri-apps/api.
const { invoke } = window.__TAURI__.core;

export function getSettings() {
  return invoke('get_settings');
}

export function listTrades() {
  return invoke('list_trades');
}

export function createTrade(input) {
  return invoke('create_trade', { input });
}

export function updateTrade(id, input) {
  return invoke('update_trade', { id, input });
}

export function deleteTrade(id) {
  return invoke('delete_trade', { id });
}

export function saveAttachment(ownerType, ownerId, dataBase64, ext) {
  return invoke('save_attachment', { ownerType, ownerId, dataBase64, ext });
}

export function listAttachments(ownerType, ownerId) {
  return invoke('list_attachments', { ownerType, ownerId });
}

export function deleteAttachment(id) {
  return invoke('delete_attachment', { id });
}
