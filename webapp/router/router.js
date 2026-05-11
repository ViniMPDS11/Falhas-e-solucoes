export function createRouter({ mount, routes, basename = '' }) {
  const normalizedBase = basename && basename !== '/' ? `/${basename.replace(/^\/+|\/+$/g, '')}` : '';

  function withBase(path) {
    if (!normalizedBase) return path;
    return path.startsWith(normalizedBase) ? path : `${normalizedBase}${path}`;
  }

  function withoutBase(path) {
    if (!normalizedBase) return path;
    if (!path.startsWith(normalizedBase)) return path;
    const stripped = path.slice(normalizedBase.length);
    return stripped || '/';
  }

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

  async function render(fullPathname = window.location.pathname) {
    const pathname = withoutBase(fullPathname);
    const found = match(pathname);
    if (!found) return;
    mount.innerHTML = await found.route.component(found.params);
    await found.route.onMounted?.(found.params);
  }

  function navigate(path) {
    const target = withBase(path);
    window.history.pushState({}, '', target);
    render(target);
  }

  window.addEventListener('popstate', () => render(window.location.pathname));
  return { navigate, render, withBase, withoutBase };
}
