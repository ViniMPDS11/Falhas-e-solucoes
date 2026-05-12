import { failureCard } from '../components/failure-card.js';
import { failureForm } from '../components/failure-form.js';
import { getFailuresPage, getFailuresTotal, searchFailures, createFailure } from '../services/failures.js';
import { debounce } from '../utils/helpers.js';

let loading = false;
let loadedItems = [];
let currentPage = 1;
const pageSize = 5;
let pageCursors = [null];
let hasNextPage = false;
let totalItems = 0;
let sortDir = 'desc';
const SERIES_OPTIONS = [
  { value: 'H', label: 'H - Hotel' },
  { value: 'Q', label: 'Q - Quebec' },
  { value: 'R', label: 'R - Romeu' },
  { value: 'S', label: 'S - Sierra' },
  { value: 'T', label: 'T - Tango' },
  { value: 'U', label: 'U - Uniform' },
];

function normalizeSeriesList(values = []) {
  const allowed = new Set(SERIES_OPTIONS.map((option) => option.value));
  return [...new Set(values.map((value) => String(value || '').toUpperCase()).filter((value) => allowed.has(value)))].sort();
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawSeries = params.get('series') || '';
  return {
    series: normalizeSeriesList(rawSeries.split(',').filter(Boolean)),
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
  };
}

function readPaginationFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: Math.max(1, Number(params.get('page') || 1)),
    sortDir: params.get('sortDir') === 'asc' ? 'asc' : 'desc',
  };
}

function persistState({ series, dateFrom, dateTo, page, order }) {
  const params = new URLSearchParams(window.location.search);
  const normalizedSeries = normalizeSeriesList(series);
  if (normalizedSeries.length) params.set('series', normalizedSeries.join(','));
  else params.delete('series');
  if (dateFrom) params.set('dateFrom', dateFrom); else params.delete('dateFrom');
  if (dateTo) params.set('dateTo', dateTo); else params.delete('dateTo');
  params.set('page', String(page));
  params.set('sortBy', 'createdAt');
  params.set('sortDir', order);
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', next);
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
    <div class="search-row">
      <div class="InputContainer" role="search">
        <input id="search-input" class="input" placeholder="Buscar por trem, falha ou palavra-chave" type="text" />
        <button id="search-btn" class="search-trigger" type="button" aria-label="Buscar">
          <svg class="searchIcon" viewBox="0 0 512 512" aria-hidden="true">
            <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path>
          </svg>
        </button>
      </div>
      <button id="open-filters-btn" class="filters-btn" type="button" aria-label="Abrir filtros" title="Abrir filtros">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M19 3H5C3.58579 3 2.87868 3 2.43934 3.4122C2 3.8244 2 4.48782 2 5.81466V6.50448C2 7.54232 2 8.06124 2.2596 8.49142C2.5192 8.9216 2.99347 9.18858 3.94202 9.72255L6.85504 11.3624C7.49146 11.7206 7.80967 11.8998 8.03751 12.0976C8.51199 12.5095 8.80408 12.9935 8.93644 13.5872C9 13.8722 9 14.2058 9 14.8729L9 17.5424C9 18.452 9 18.9067 9.25192 19.2613C9.50385 19.6158 9.95128 19.7907 10.8462 20.1406C12.7248 20.875 13.6641 21.2422 14.3321 20.8244C15 20.4066 15 19.4519 15 17.5424V14.8729C15 14.2058 15 13.8722 15.0636 13.5872C15.1959 12.9935 15.488 12.5095 15.9625 12.0976C16.1903 11.8998 16.5085 11.7206 17.145 11.3624L20.058 9.72255C21.0065 9.18858 21.4808 8.9216 21.7404 8.49142C22 8.06124 22 7.54232 22 6.50448V5.81466C22 4.48782 22 3.8244 21.5607 3.4122C21.1213 3 20.4142 3 19 3Z" stroke-width="1.5"></path>
        </svg>
        <span>Filtros</span>
      </button>
    </div>
    <p class="series-legend muted">Legenda operacional: cada letra no início do ID do trem indica uma série específica.</p>
    <div id="filters-modal" class="filters-modal-backdrop hidden">
      <div class="filters-modal" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        <div class="filters-head">
          <h3 id="filters-title">Filtros da listagem</h3>
          <button id="close-filters-btn" class="filters-close-btn" type="button" aria-label="Fechar filtros">✕</button>
        </div>
        <p class="filters-subtitle">Refine por série e período de abertura.</p>
        <div class="series-chip-group" title="Cada letra do ID do trem representa uma série operacional.">
          ${SERIES_OPTIONS.map((option) => `<label class="series-chip"><input type="checkbox" value="${option.value}" data-series-filter /> <span>${option.label}</span></label>`).join('')}
        </div>
        <div class="date-filter-grid">
          <label>De<input id="date-from-filter" type="date" /></label>
          <label>Até<input id="date-to-filter" type="date" /></label>
        </div>
        <div class="filters-actions">
          <button id="clear-filters-btn" class="btn-secondary" type="button">Limpar</button>
          <button id="apply-filters-btn" class="filters-apply-btn" type="button">Aplicar filtros</button>
        </div>
      </div>
    </div>
    <div id="failure-list" class="failure-list"></div>
    <div id="pagination" class="pagination hidden">
      <button id="first-page-btn" class="pagination-btn" type="button" aria-label="Primeira página">«</button>
      <button id="prev-page-btn" class="pagination-btn" type="button" aria-label="Página anterior">‹</button>
      <span id="page-indicator" class="page-indicator">Página 1 de 1 · 0 itens</span>
      <button id="next-page-btn" class="pagination-btn" type="button" aria-label="Próxima página">›</button>
      <button id="last-page-btn" class="pagination-btn" type="button" aria-label="Última página">»</button>
    </div>
  </section>`;
}

export async function wireDashboard({ navigate, user }) {
  const listEl = document.getElementById('failure-list');
  const paginationEl = document.getElementById('pagination');
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  const firstPageBtn = document.getElementById('first-page-btn');
  const lastPageBtn = document.getElementById('last-page-btn');
  const pageIndicator = document.getElementById('page-indicator');
  const searchInput = document.getElementById('search-input');
  const filtersModal = document.getElementById('filters-modal');
  const openFiltersBtn = document.getElementById('open-filters-btn');
  const closeFiltersBtn = document.getElementById('close-filters-btn');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const dateFromFilter = document.getElementById('date-from-filter');
  const dateToFilter = document.getElementById('date-to-filter');
  const seriesInputs = [...document.querySelectorAll('[data-series-filter]')];
  let activeFilters = readFiltersFromUrl();
  const state = readPaginationFromUrl();
  currentPage = state.page;
  sortDir = state.sortDir;

  function syncFilterUI() {
    const selected = new Set(activeFilters.series);
    seriesInputs.forEach((input) => { input.checked = selected.has(input.value); });
    dateFromFilter.value = activeFilters.dateFrom || '';
    dateToFilter.value = activeFilters.dateTo || '';
  }

  function collectFiltersFromUI() {
    return {
      series: normalizeSeriesList(seriesInputs.filter((input) => input.checked).map((input) => input.value)),
      dateFrom: dateFromFilter.value || '',
      dateTo: dateToFilter.value || '',
    };
  }

  function updatePaginationUI() {
    paginationEl.classList.remove('hidden');
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages} · ${totalItems} itens`;
    firstPageBtn.disabled = currentPage === 1 || loading;
    prevPageBtn.disabled = currentPage === 1 || loading;
    nextPageBtn.disabled = !hasNextPage || loading;
    lastPageBtn.disabled = currentPage >= totalPages || loading;
  }

  function resetPaginationState() {
    currentPage = 1;
    pageCursors = [null];
    hasNextPage = false;
  }

  async function ensureCursorForPage(targetPage) {
    if ((activeFilters.series || []).length) return;
    if (targetPage <= 1) return;
    for (let page = 1; page < targetPage; page += 1) {
      if (pageCursors[page]) continue;
      const prevCursor = pageCursors[page - 1] ?? null;
      // eslint-disable-next-line no-await-in-loop
      const chunk = await getFailuresPage({ cursorDoc: prevCursor, pageSize, sortBy: 'createdAt', sortDir, filters: activeFilters });
      if (!chunk.lastDoc) break;
      pageCursors[page] = chunk.lastDoc;
    }
  }

  async function renderPage(pageNumber = 1, reset = false) {
    if (loading) return;
    loading = true;
    try {
      if (reset) resetPaginationState();
      totalItems = await getFailuresTotal(activeFilters);
      await ensureCursorForPage(pageNumber);
      const cursorForPage = pageCursors[pageNumber - 1] ?? null;
      const page = await getFailuresPage({ cursorDoc: cursorForPage, page: pageNumber, pageSize, sortBy: 'createdAt', sortDir, filters: activeFilters });
      if (page.lastDoc && !pageCursors[pageNumber]) pageCursors[pageNumber] = page.lastDoc;
      hasNextPage = page.hasMore;
      currentPage = pageNumber;

      loadedItems = [...page.items];
      if (!page.items.length) {
        listEl.innerHTML = '<p class="muted">Nenhuma falha encontrada.</p>';
      } else {
        listEl.innerHTML = page.items.map(failureCard).join('');
      }
      persistState({ ...activeFilters, page: currentPage, order: sortDir });
    } catch (error) {
      console.error(error);
      listEl.innerHTML = '<p class="muted">Não foi possível carregar as falhas agora.</p>';
      paginationEl.classList.add('hidden');
    } finally {
      loading = false;
      updatePaginationUI();
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

    const merged = [...new Map([...localMatches, ...remoteMatches].map((item) => [item.id, item])).values()];

    if (merged.length) {
      listEl.innerHTML = merged.map(failureCard).join('');
    } else if (remoteHasErrors) {
      listEl.innerHTML = '<p class="muted">Não foi possível concluir a busca completa agora. Mostrando apenas resultados disponíveis.</p>';
    } else {
      listEl.innerHTML = '<p class="muted">Nenhum resultado encontrado.</p>';
    }

    if (remoteHasErrors) console.error('Falha parcial na busca remota.');

    paginationEl.classList.add('hidden');
  }

  await renderPage(1, true);

  prevPageBtn.onclick = () => {
    if (currentPage > 1) renderPage(currentPage - 1);
  };
  firstPageBtn.onclick = () => renderPage(1, true);
  nextPageBtn.onclick = () => {
    if (hasNextPage) renderPage(currentPage + 1);
  };
  lastPageBtn.onclick = async () => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalPages > 1) await renderPage(totalPages);
  };
  document.getElementById('search-btn').onclick = runSearch;
  openFiltersBtn.onclick = () => { syncFilterUI(); filtersModal.classList.remove('hidden'); };
  closeFiltersBtn.onclick = () => filtersModal.classList.add('hidden');
  filtersModal.addEventListener('click', (event) => { if (event.target === filtersModal) filtersModal.classList.add('hidden'); });
  applyFiltersBtn.onclick = async () => {
    const nextFilters = collectFiltersFromUI();
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateFrom > nextFilters.dateTo) {
      alert('A data inicial não pode ser maior que a data final.');
      return;
    }
    activeFilters = nextFilters;
    persistState({ ...activeFilters, page: 1, order: sortDir });
    filtersModal.classList.add('hidden');
    await runSearch();
  };
  clearFiltersBtn.onclick = async () => {
    activeFilters = { series: [], dateFrom: '', dateTo: '' };
    syncFilterUI();
    persistState({ ...activeFilters, page: 1, order: sortDir });
    filtersModal.classList.add('hidden');
    await runSearch();
  };
  syncFilterUI();
  searchInput.addEventListener('input', debounce(() => {
    if (!searchInput.value.trim()) runSearch();
  }, 400));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

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
