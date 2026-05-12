import { failureCard } from '../components/failure-card.js';
import { failureForm } from '../components/failure-form.js';
import { getFailuresPage, searchFailures, createFailure } from '../services/failures.js';
import { debounce } from '../utils/helpers.js';

let cursor = null;
let loading = false;
let loadedItems = [];
let displayedItems = [];
const PAGE_SIZE = 5;
let currentPage = 1;
let pageCursors = [null];
let hasNextPage = false;

const filterState = {
  selectedSeries: [],
  dateFrom: '',
  dateTo: '',
};

function filterIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.75C3 4.78 3.78 4 4.75 4h14.5c.97 0 1.75.78 1.75 1.75 0 .42-.15.82-.43 1.14L14 14v4.25c0 .37-.2.7-.52.88l-2.5 1.5A1 1 0 0 1 9.5 19.75V14l-6.57-7.11A1.74 1.74 0 0 1 3 5.75Z"></path></svg>`;
}

export function dashboardPage() {
  return `
  <section class="dashboard-page">
    <div class="dashboard-header">
      <div>
        <p class="dashboard-kicker">Painel operacional</p>
        <h1 class="dashboard-title">Falhas Registradas</h1>
      </div>
      <button id="new-failure-btn" class="add-failure-btn noselect" aria-label="Registrar falha" title="Registrar falha">
        <svg viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z"></path>
        </svg>
      </button>
    </div>

    <div class="filters-desktop-panel">
      <div class="filters-section-title">${filterIcon()} <span>Filtros</span></div>
      <div class="filters-grid">
        <label class="filter-field">
          <span>Série</span>
          <select id="series-filter" multiple></select>
        </label>
        <label class="filter-field">
          <span>De</span>
          <input id="date-from-filter" type="date" />
        </label>
        <label class="filter-field">
          <span>Até</span>
          <input id="date-to-filter" type="date" />
        </label>
        <div class="filter-actions">
          <button id="apply-filter-btn" type="button" class="filter-btn primary">Aplicar</button>
          <button id="clear-filter-btn" type="button" class="filter-btn secondary">Limpar</button>
        </div>
      </div>
    </div>

    <button id="open-filter-drawer-btn" class="mobile-filter-trigger" type="button" aria-label="Abrir filtros">${filterIcon()} Filtros</button>

    <div id="active-filter-chips" class="active-filter-chips"></div>

    <div class="search-row">
      <div class="InputContainer" role="search">
        <input id="search-input" class="input" placeholder="Buscar por trem, falha ou palavra-chave" type="text" />
        <button id="search-btn" class="search-trigger" type="button" aria-label="Buscar">
          <svg class="searchIcon" viewBox="0 0 512 512" aria-hidden="true">
            <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path>
          </svg>
        </button>
      </div>
    </div>

    <div id="filter-drawer" class="filter-drawer hidden">
      <div id="filter-drawer-overlay" class="filter-drawer-overlay"></div>
      <aside class="filter-drawer-panel">
        <div class="filter-drawer-head">
          <strong>${filterIcon()} Filtros</strong>
          <button id="close-filter-drawer-btn" type="button" class="btn-link">Fechar</button>
        </div>
        <div class="filters-grid mobile">
          <label class="filter-field"><span>Série</span><select id="series-filter-mobile" multiple></select></label>
          <label class="filter-field"><span>De</span><input id="date-from-filter-mobile" type="date" /></label>
          <label class="filter-field"><span>Até</span><input id="date-to-filter-mobile" type="date" /></label>
          <div class="filter-actions">
            <button id="apply-filter-btn-mobile" type="button" class="filter-btn primary">Aplicar</button>
            <button id="clear-filter-btn-mobile" type="button" class="filter-btn secondary">Limpar</button>
          </div>
        </div>
      </aside>
    </div>

    <div id="failure-list" class="failure-list"></div>
    <div id="pagination" class="pagination hidden">
      <button id="prev-page-btn" class="pagination-btn" type="button">← Anterior</button>
      <span id="page-indicator" class="page-indicator">Página 1</span>
      <button id="next-page-btn" class="pagination-btn" type="button">Próxima →</button>
    </div>
  </section>`;
}

export async function wireDashboard({ navigate, user }) {
  const listEl = document.getElementById('failure-list');
  const paginationEl = document.getElementById('pagination');
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');
  const searchInput = document.getElementById('search-input');

  function updateFilterOptions(items) {
    const series = [...new Set(items.map((item) => item.trainId).filter(Boolean))].sort();
    const mk = (selected = []) => series.map((s) => `<option value="${s}" ${selected.includes(s) ? 'selected' : ''}>${s}</option>`).join('');
    document.getElementById('series-filter').innerHTML = mk(filterState.selectedSeries);
    document.getElementById('series-filter-mobile').innerHTML = mk(filterState.selectedSeries);
  }

  function syncFilterInputs() {
    const syncSelect = (id) => {
      const select = document.getElementById(id);
      [...select.options].forEach((opt) => { opt.selected = filterState.selectedSeries.includes(opt.value); });
    };
    syncSelect('series-filter');
    syncSelect('series-filter-mobile');
    document.getElementById('date-from-filter').value = filterState.dateFrom;
    document.getElementById('date-to-filter').value = filterState.dateTo;
    document.getElementById('date-from-filter-mobile').value = filterState.dateFrom;
    document.getElementById('date-to-filter-mobile').value = filterState.dateTo;
  }

  function readFilters(source = 'desktop') {
    const suffix = source === 'mobile' ? '-mobile' : '';
    filterState.selectedSeries = [...document.getElementById(`series-filter${suffix}`).selectedOptions].map((o) => o.value);
    filterState.dateFrom = document.getElementById(`date-from-filter${suffix}`).value;
    filterState.dateTo = document.getElementById(`date-to-filter${suffix}`).value;
    syncFilterInputs();
  }

  function renderFilterChips() {
    const chipsEl = document.getElementById('active-filter-chips');
    const chips = [];
    filterState.selectedSeries.forEach((serie) => chips.push(`<span class="filter-chip">Série: ${serie}</span>`));
    if (filterState.dateFrom) chips.push(`<span class="filter-chip">De: ${filterState.dateFrom}</span>`);
    if (filterState.dateTo) chips.push(`<span class="filter-chip">Até: ${filterState.dateTo}</span>`);
    chipsEl.innerHTML = chips.length ? chips.join('') : '<span class="muted">Nenhum filtro ativo.</span>';
  }

  function applyFiltersAndRender() {
    const filtered = displayedItems.filter((item) => {
      const seriesOk = !filterState.selectedSeries.length || filterState.selectedSeries.includes(item.trainId);
      const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || item.date || Date.now());
      const fromOk = !filterState.dateFrom || itemDate >= new Date(`${filterState.dateFrom}T00:00:00`);
      const toOk = !filterState.dateTo || itemDate <= new Date(`${filterState.dateTo}T23:59:59`);
      return seriesOk && fromOk && toOk;
    });

    listEl.innerHTML = filtered.length
      ? filtered.map(failureCard).join('')
      : '<p class="muted">Nenhuma falha encontrada com os filtros selecionados.</p>';
    renderFilterChips();
  }

  function updatePaginationUI() {
    paginationEl.classList.remove('hidden');
    pageIndicator.textContent = `Página ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1 || loading;
    nextPageBtn.disabled = !hasNextPage || loading;
  }

  function resetPaginationState() {
    cursor = null;
    currentPage = 1;
    pageCursors = [null];
    hasNextPage = false;
  }

  async function renderPage(pageNumber = 1, reset = false) {
    if (loading) return;
    loading = true;
    try {
      if (reset) resetPaginationState();
      const cursorForPage = pageCursors[pageNumber - 1] ?? null;
      const page = await getFailuresPage(cursorForPage, PAGE_SIZE);
      cursor = page.lastDoc;
      if (page.lastDoc && !pageCursors[pageNumber]) pageCursors[pageNumber] = page.lastDoc;
      hasNextPage = page.hasMore;
      currentPage = pageNumber;

      loadedItems = [...page.items];
      displayedItems = [...page.items];
      updateFilterOptions(displayedItems);
      applyFiltersAndRender();
      updatePaginationUI();
    } catch (error) {
      console.error(error);
      listEl.innerHTML = '<p class="muted">Não foi possível carregar as falhas agora.</p>';
      paginationEl.classList.add('hidden');
    } finally {
      loading = false;
    }
  }

  async function runSearch() {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      await renderPage(1, true);
      return;
    }
    if (term.length < 3) {
      listEl.innerHTML = '<p class="muted">Digite ao menos 3 caracteres para buscar.</p>';
      paginationEl.classList.add('hidden');
      return;
    }

    listEl.innerHTML = '<p class="muted">Buscando...</p>';

    const parts = term.split(/\s+/).filter(Boolean);
    const localMatches = loadedItems.filter((item) => {
      const text = `${item.trainId} ${item.type} ${item.summary}`.toLowerCase();
      return parts.every((p) => text.includes(p));
    });

    const remoteResults = await Promise.allSettled(parts.map((p) => searchFailures(p)));
    const remoteMatches = remoteResults
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);
    const remoteHasErrors = remoteResults.some((result) => result.status === 'rejected');

    displayedItems = [...new Map([...localMatches, ...remoteMatches].map((item) => [item.id, item])).values()];

    updateFilterOptions(displayedItems);
    applyFiltersAndRender();

    if (!displayedItems.length && remoteHasErrors) {
      listEl.innerHTML = '<p class="muted">Não foi possível concluir a busca completa agora. Mostrando apenas resultados disponíveis.</p>';
    }

    if (remoteHasErrors) console.error('Falha parcial na busca remota.');

    paginationEl.classList.add('hidden');
  }

  await renderPage(1, true);

  prevPageBtn.onclick = () => {
    if (currentPage > 1) renderPage(currentPage - 1);
  };
  nextPageBtn.onclick = () => {
    if (hasNextPage) renderPage(currentPage + 1);
  };
  document.getElementById('search-btn').onclick = runSearch;
  searchInput.addEventListener('input', debounce(() => {
    if (!searchInput.value.trim()) runSearch();
  }, 400));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  document.getElementById('apply-filter-btn').onclick = () => { readFilters('desktop'); applyFiltersAndRender(); };
  document.getElementById('clear-filter-btn').onclick = () => {
    filterState.selectedSeries = []; filterState.dateFrom = ''; filterState.dateTo = ''; syncFilterInputs(); applyFiltersAndRender();
  };
  document.getElementById('apply-filter-btn-mobile').onclick = () => {
    readFilters('mobile'); applyFiltersAndRender(); document.getElementById('filter-drawer').classList.add('hidden');
  };
  document.getElementById('clear-filter-btn-mobile').onclick = () => {
    filterState.selectedSeries = []; filterState.dateFrom = ''; filterState.dateTo = ''; syncFilterInputs(); applyFiltersAndRender();
  };

  document.getElementById('open-filter-drawer-btn').onclick = () => document.getElementById('filter-drawer').classList.remove('hidden');
  document.getElementById('close-filter-drawer-btn').onclick = () => document.getElementById('filter-drawer').classList.add('hidden');
  document.getElementById('filter-drawer-overlay').onclick = () => document.getElementById('filter-drawer').classList.add('hidden');

  listEl.addEventListener('click', (e) => {
    const id = e.target.dataset.openDetails;
    if (id) navigate(`/failure/${id}`);
  });

  document.getElementById('new-failure-btn').onclick = () => {
    document.body.insertAdjacentHTML('beforeend', failureForm({ authorName: user.displayName || user.email }));
    const form = document.getElementById('failure-form');
    form.trainId.addEventListener('input', () => { form.trainId.value = form.trainId.value.toUpperCase(); });
    form.type.addEventListener('input', () => { document.getElementById('type-counter').textContent = `${form.type.value.length}/50`; });
    form.description.addEventListener('input', () => { document.getElementById('description-counter').textContent = `${form.description.value.length}/300`; });
    document.getElementById('cancel-failure-btn').onclick = () => document.getElementById('modal-backdrop').remove();
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const saveBtn = document.getElementById('save-failure-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
      await createFailure({
        trainId: form.trainId.value,
        type: form.type.value,
        description: form.description.value,
        solution: form.solution.value,
        user,
      });
      document.getElementById('modal-backdrop').remove();
      await renderPage(1, true);
    };
  };
}
