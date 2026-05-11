import { failureCard } from '../components/failure-card.js';
import { failureForm } from '../components/failure-form.js';
import { getFailuresPage, searchFailures, createFailure } from '../services/failures.js';
import { debounce } from '../utils/helpers.js';

let cursor = null;
let loading = false;

export function dashboardPage() {
  return `
  <section class="dashboard-page">
    <div class="dashboard-header"><h1>Falhas Registradas</h1><button id="new-failure-btn" class="fab">⊕ Registrar Falha</button></div>
    <input id="search-input" placeholder="Buscar por trem, tipo ou palavra-chave" />
    <div id="failure-list" class="failure-list"></div>
    <button id="load-more-btn" class="btn-secondary">Carregar mais</button>
  </section>`;
}

export async function wireDashboard({ navigate, user }) {
  const listEl = document.getElementById('failure-list');
  const loadMoreBtn = document.getElementById('load-more-btn');

  async function renderNextPage(reset = false) {
    if (loading) return;
    loading = true;
    try {
      const page = await getFailuresPage(reset ? null : cursor);
      cursor = page.lastDoc;
      if (reset) listEl.innerHTML = '';
      if (!page.items.length && reset) {
        listEl.innerHTML = '<p class="muted">Nenhuma falha encontrada.</p>';
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

  await renderNextPage(true);

  loadMoreBtn.onclick = () => renderNextPage(false);

  document.getElementById('search-input').addEventListener('input', debounce(async (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (!term) return renderNextPage(true);
    if (term.length < 3) return;
    const items = await searchFailures(term);
    listEl.innerHTML = items.map(failureCard).join('');
    loadMoreBtn.classList.add('hidden');
  }, 400));

  listEl.addEventListener('click', (e) => {
    const id = e.target.dataset.openDetails;
    if (id) navigate(`/failure/${id}`);
  });

  document.getElementById('new-failure-btn').onclick = () => {
    document.body.insertAdjacentHTML('beforeend', failureForm({ authorName: user.displayName || user.email }));
    const form = document.getElementById('failure-form');
    form.trainId.addEventListener('input', () => { form.trainId.value = form.trainId.value.toUpperCase(); });
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
