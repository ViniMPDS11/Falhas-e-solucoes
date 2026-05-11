import { getFailureById } from '../services/failures.js';
import { formatDate } from '../utils/helpers.js';

export async function failureDetailsPage(id) {
  const item = await getFailureById(id);
  if (!item) return '<section class="card"><p>Falha não encontrada.</p></section>';
  return `
  <section class="details-page card">
    <h2>Detalhes da Falha</h2>
    <p><strong>ID do Trem:</strong> ${item.trainId}</p>
    <p><strong>Tipo:</strong> ${item.type}</p>
    <p><strong>Descrição:</strong> ${item.description}</p>
    <p><strong>Solução:</strong> ${item.solution || '-'}</p>
    <p><strong>Autor:</strong> ${item.authorName}</p>
    <p><strong>Data/Hora:</strong> ${formatDate(item.createdAt)}</p>
    <button id="back-dashboard" class="btn-secondary">Voltar</button>
  </section>`;
}
