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
    <div class="search-row"><input id="search-input" placeholder="Buscar por trem, falha ou palavra-chave" /><button id="search-btn">Buscar</button></div>
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
    const remoteResults = await Promise.all(parts.map((p) => searchFailures(p)));
    const merged = [...new Map([...localMatches, ...remoteResults.flat()].map((item) => [item.id, item])).values()];
    listEl.innerHTML = merged.length ? merged.map(failureCard).join('') : '<p class=\"muted\">Nenhum resultado encontrado.</p>';
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
