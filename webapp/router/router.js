export function createRouter({ mount, routes }) {
  function match(path) {
    for (const route of routes) {
      const keys = [];
      const regex = new RegExp(`^${route.path.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; })}$`);
      const result = path.match(regex);
      if (result) {
        const params = Object.fromEntries(keys.map((k, i) => [k, result[i + 1]]));
        return { route, params };
      }
    }
    return null;
  }

  async function render(pathname = window.location.pathname) {
    const found = match(pathname);
    if (!found) return;
    mount.innerHTML = await found.route.component(found.params);
    await found.route.onMounted?.(found.params);
  }

  function navigate(path) {
    window.history.pushState({}, '', path);
    render(path);
  }

  window.addEventListener('popstate', () => render(window.location.pathname));
  return { navigate, render };
}
