import { failureCard } from '../components/failure-card.js';
import { failureForm } from '../components/failure-form.js';
import { getFailuresPage, searchFailures, createFailure } from '../services/failures.js';
import { debounce } from '../utils/helpers.js';

let cursor = null;
let loading = false;
let loadedItems = [];

export function dashboardPage() {
  return `
  <section class="dashboard-page">
    <div class="dashboard-header"><h1>Falhas Registradas</h1><button id="new-failure-btn" class="fab">⊕ Registrar Falha</button></div>
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
    <div id="failure-list" class="failure-list"></div>
    <button id="load-more-btn" class="btn-secondary">Carregar mais</button>
  </section>`;
}

export async function wireDashboard({ navigate, user }) {
  const listEl = document.getElementById('failure-list');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const searchInput = document.getElementById('search-input');

  async function renderNextPage(reset = false) {
    if (loading) return;
    loading = true;
    try {
      const page = await getFailuresPage(reset ? null : cursor);
      cursor = page.lastDoc;
      if (reset) listEl.innerHTML = '';
      if (reset) loadedItems = [];
      loadedItems.push(...page.items);
      if (!page.items.length && reset) {
        listEl.innerHTML = '<p class=\"muted\">Nenhuma falha encontrada.</p>';
      } else {
        listEl.insertAdjacentHTML('beforeend', page.items.map(failureCard).join(''));
      }
      loadMoreBtn.classList.toggle('hidden', !page.hasMore);
    } catch (error) {
      console.error(error);
      if (reset) listEl.innerHTML = '<p class="muted">Não foi possível carregar as falhas agora.</p>';
      loadMoreBtn.classList.add('hidden');
    } finally {
      loading = false;
    }
  }

  async function runSearch() {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      cursor = null;
      await renderNextPage(true);
      return;
    }
    if (term.length < 3) {
      listEl.innerHTML = '<p class="muted">Digite ao menos 3 caracteres para buscar.</p>';
      loadMoreBtn.classList.add('hidden');
      return;
    }

    listEl.innerHTML = '<p class=\"muted\">Buscando...</p>';

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
      listEl.innerHTML = '<p class=\"muted\">Nenhum resultado encontrado.</p>';
    }

    if (remoteHasErrors) console.error('Falha parcial na busca remota.');

    loadMoreBtn.classList.add('hidden');
  }

  await renderNextPage(true);

  loadMoreBtn.onclick = () => renderNextPage(false);
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
      cursor = null;
      await renderNextPage(true);
    };
  };
}
