export function renderTopbar({ userName }) {
  return `
    <header class="topbar">
      <div class="brand">🚆 Falhas & Soluções</div>
      <div class="topbar-right">
        <small id="sync-status">Última sincronização há 0 segundos</small>
        <span class="user-name">${userName}</span>
        <button id="logout-btn" class="btn-secondary">Logout</button>
      </div>
    </header>
  `;
}
