import { icons } from './icons.js';

const routes = {}; // name -> { label, icon, render }

export function registerRoute(name, label, icon, render) {
  routes[name] = { label, icon, render };
}

export function startRouter(navEl, viewEl, defaultRoute) {
  function go(name) {
    const route = routes[name] || routes[defaultRoute];
    for (const btn of navEl.querySelectorAll('.nav-item')) {
      btn.classList.toggle('active', btn.dataset.route === name);
    }
    viewEl.innerHTML = '';
    route.render(viewEl);
    location.hash = name;
  }

  navEl.innerHTML = Object.entries(routes)
    .map(
      ([name, r]) =>
        `<button class="nav-item" data-route="${name}">${icons[r.icon] || ''}<span>${r.label}</span></button>`
    )
    .join('');

  for (const btn of navEl.querySelectorAll('.nav-item')) {
    btn.addEventListener('click', () => go(btn.dataset.route));
  }

  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  go(location.hash.slice(1) || defaultRoute);
}
