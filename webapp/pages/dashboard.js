import { failureCard } from '../components/failure-card.js';
import { failureForm } from '../components/failure-form.js';
import { getFailuresPage, searchFailures, createFailure } from '../services/failures.js';
import { debounce } from '../utils/helpers.js';

let cursor = null;
let loading = false;
let loadedItems = [];
const PAGE_SIZE = 5;
let currentPage = 1;
let pageCursors = [null];
let hasNextPage = false;
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

function getSelectedSeriesFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('series') || '';
  return normalizeSeriesList(raw.split(',').filter(Boolean));
}

function persistSelectedSeries(values) {
  const selected = normalizeSeriesList(values);
  const params = new URLSearchParams(window.location.search);
  if (selected.length) params.set('series', selected.join(','));
  else params.delete('series');
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', next);
}

function applySeriesFilter(items, selectedSeries) {
  if (!selectedSeries.length) return items;
  const series = new Set(selectedSeries);
  return items.filter((item) => series.has(String(item.trainId || '').charAt(0).toUpperCase()));
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
      <div class="series-filter" title="Cada letra do ID do trem representa uma série operacional.">
        <label for="series-filter-select" class="series-filter-label">Série do trem</label>
        <select id="series-filter-select" class="series-filter-select" multiple aria-label="Filtrar por série do trem">
          ${SERIES_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="series-legend muted">Legenda operacional: cada letra no início do ID do trem indica uma série específica.</p>
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
  const seriesFilterSelect = document.getElementById('series-filter-select');
  let selectedSeries = getSelectedSeriesFromUrl();

  function syncSeriesFilterUI() {
    const selected = new Set(selectedSeries);
    [...seriesFilterSelect.options].forEach((option) => {
      option.selected = selected.has(option.value);
    });
  }

  function getSelectedSeriesFromControl() {
    return normalizeSeriesList([...seriesFilterSelect.selectedOptions].map((option) => option.value));
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
      const filteredItems = applySeriesFilter(page.items, selectedSeries);
      if (!filteredItems.length) {
        listEl.innerHTML = '<p class="muted">Nenhuma falha encontrada.</p>';
      } else {
        listEl.innerHTML = filteredItems.map(failureCard).join('');
      }
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

    const merged = [...new Map([...localMatches, ...remoteMatches].map((item) => [item.id, item])).values()];

    const filteredMerged = applySeriesFilter(merged, selectedSeries);
    if (filteredMerged.length) {
      listEl.innerHTML = filteredMerged.map(failureCard).join('');
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
  nextPageBtn.onclick = () => {
    if (hasNextPage) renderPage(currentPage + 1);
  };
  document.getElementById('search-btn').onclick = runSearch;
  seriesFilterSelect.addEventListener('change', async () => {
    selectedSeries = getSelectedSeriesFromControl();
    persistSelectedSeries(selectedSeries);
    await runSearch();
  });
  syncSeriesFilterUI();
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
