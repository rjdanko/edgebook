import { getSettings } from './api.js';
import { applyTheme } from './theme.js';
import { registerRoute, startRouter } from './router.js';
import * as dashboard from './dashboard.js';
import * as trades from './trades.js';
import * as journal from './journal.js';
import * as settings from './settings.js';

registerRoute('dashboard', 'Dashboard', 'dashboard', dashboard.render);
registerRoute('trades', 'Trades', 'trades', trades.render);
registerRoute('journal', 'Journal', 'journal', journal.render);
registerRoute('settings', 'Settings', 'settings', settings.render);

startRouter(document.getElementById('nav'), document.getElementById('view'), 'dashboard');

getSettings().then(applyTheme).catch((e) => console.error('failed to load settings', e));
