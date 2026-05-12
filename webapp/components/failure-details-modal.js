import { getFailureById } from '../services/failures.js';
import { formatDate } from '../utils/helpers.js';

function buildDetailsMarkup(item) {
  return `
    <div class="failure-details-shell" role="dialog" aria-modal="true" aria-labelledby="failure-details-title">
      <div class="failure-details-head">
        <p class="failure-details-kicker">Registro operacional</p>
        <button id="close-failure-details" class="failure-details-close" type="button" aria-label="Fechar">✕</button>
      </div>
      <h3 id="failure-details-title">Detalhes da falha</h3>
      <p class="failure-details-summary">${item.summary || '-'}</p>
      <div class="failure-details-grid">
        <div><span>Trem</span><strong>${item.trainId || '-'}</strong></div>
        <div><span>Tipo</span><strong>${item.type || '-'}</strong></div>
        <div><span>Autor</span><strong>${item.authorName || '-'}</strong></div>
        <div><span>Data/Hora</span><strong>${formatDate(item.createdAt)}</strong></div>
      </div>
      <div class="failure-details-block">
        <h4>Descrição</h4>
        <p>${item.description || '-'}</p>
      </div>
      <div class="failure-details-block solution">
        <h4>Solução aplicada</h4>
        <p>${item.solution || 'Ainda não informada.'}</p>
      </div>
    </div>`;
}

export async function openFailureDetailsModal(id) {
  const item = await getFailureById(id);
  if (!item) throw new Error('Falha não encontrada');
  const backdrop = document.createElement('div');
  backdrop.className = 'failure-details-backdrop';
  backdrop.id = 'failure-details-backdrop';
  backdrop.innerHTML = buildDetailsMarkup(item);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  function close() {
    backdrop.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);
  }
  function onKeyDown(event) {
    if (event.key === 'Escape') close();
  }

  document.getElementById('close-failure-details').onclick = close;
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeyDown);
}
