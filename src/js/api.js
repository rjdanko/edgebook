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

export function listJournalEntries() {
  return invoke('list_journal_entries');
}

export function createJournalEntry(input) {
  return invoke('create_journal_entry', { input });
}

export function updateJournalEntry(id, input) {
  return invoke('update_journal_entry', { id, input });
}

export function deleteJournalEntry(id) {
  return invoke('delete_journal_entry', { id });
}

export function listObjectives() {
  return invoke('list_objectives');
}

export function createObjective(input) {
  return invoke('create_objective', { input });
}

export function updateObjective(id, label, targetValue, comparison, metric, active) {
  return invoke('update_objective', { id, label, targetValue, comparison, metric, active });
}

export function deleteObjective(id) {
  return invoke('delete_objective', { id });
}

export function updateSetting(key, value) {
  return invoke('update_setting', { key, value });
}

export function listFieldDefs(entity) {
  return invoke('list_field_defs', { entity });
}

export function createFieldDef(input) {
  return invoke('create_field_def', { input });
}

export function updateFieldDef(id, label, hidden, sortOrder, options) {
  return invoke('update_field_def', { id, label, hidden, sortOrder, options });
}

export function deleteFieldDef(id) {
  return invoke('delete_field_def', { id });
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
