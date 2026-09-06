// Applies theme + accent from settings, and keeps a localStorage mirror so the
// next launch can paint correctly before the DB settings have loaded (see the
// inline boot script in index.html).

function relativeLuminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function accentForeground(hex) {
  try {
    return relativeLuminance(hex) > 0.45 ? '#1f1f1f' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

export function applyTheme({ theme, accent }) {
  const root = document.documentElement;
  if (theme && theme !== 'system') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-fg', accentForeground(accent));
  }
  try {
    if (theme) localStorage.setItem('eb-theme', theme);
    if (accent) localStorage.setItem('eb-accent', accent);
  } catch {}
}
