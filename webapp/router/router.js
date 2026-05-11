export function createRouter({ mount, routes, basename = '', mode = 'history' }) {
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

  function getCurrentPath() {
    if (mode === 'hash') {
      const hashPath = window.location.hash.replace(/^#/, '');
      return hashPath || '/dashboard';
    }
    return withoutBase(window.location.pathname);
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

  async function render(pathname = getCurrentPath()) {
    const found = match(pathname);
    if (!found) return;
    mount.innerHTML = await found.route.component(found.params);
    await found.route.onMounted?.(found.params);
  }

  function navigate(path) {
    if (mode === 'hash') {
      const nextHash = `#${path}`;
      if (window.location.hash === nextHash) {
        render(path);
      } else {
        window.location.hash = path;
      }
      return;
    }
    const target = withBase(path);
    window.history.pushState({}, '', target);
    render(path);
  }

  if (mode === 'hash') {
    window.addEventListener('hashchange', () => render(getCurrentPath()));
  } else {
    window.addEventListener('popstate', () => render(getCurrentPath()));
  }

  return { navigate, render, getCurrentPath, withBase, withoutBase };
}
