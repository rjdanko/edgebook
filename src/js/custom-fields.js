// Renders/reads the user-defined custom_fields inputs shared by the Trade and Journal detail forms.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inputFor(def, value) {
  const attr = `data-custom="${def.key}"`;
  switch (def.kind) {
    case 'number':
      return `<input type="number" step="any" ${attr} value="${value ?? ''}" />`;
    case 'boolean':
      return `<input type="checkbox" ${attr} ${value ? 'checked' : ''} />`;
    case 'date':
      return `<input type="date" ${attr} value="${esc(value)}" />`;
    case 'long_text':
      return `<textarea ${attr} placeholder="Empty">${esc(value)}</textarea>`;
    case 'enum': {
      const options = Array.isArray(def.options) ? def.options : [];
      return `<select ${attr}>
        <option value=""></option>
        ${options.map((o) => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.value)}</option>`).join('')}
      </select>`;
    }
    case 'tag':
      return `<input type="text" ${attr} value="${esc(Array.isArray(value) ? value.join(', ') : value)}" placeholder="comma, separated, tags" />`;
    default:
      return `<input type="text" ${attr} value="${esc(value)}" placeholder="Empty" />`;
  }
}

export function renderCustomFieldRows(fieldDefs, customFields) {
  return fieldDefs
    .filter((d) => !d.hidden)
    .map((d) => `<div class="form-row"><label class="form-label">${esc(d.label)}</label>${inputFor(d, customFields[d.key])}</div>`)
    .join('');
}

export function readCustomFieldValues(container, fieldDefs) {
  const out = {};
  for (const d of fieldDefs.filter((f) => !f.hidden)) {
    const el = container.querySelector(`[data-custom="${d.key}"]`);
    if (!el) continue;
    if (d.kind === 'boolean') out[d.key] = el.checked;
    else if (d.kind === 'number') out[d.key] = parseFloat(el.value) || 0;
    else if (d.kind === 'tag') out[d.key] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
    else out[d.key] = el.value;
  }
  return out;
}
