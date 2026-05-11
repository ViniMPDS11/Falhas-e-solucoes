import { formatDate } from '../utils/helpers.js';

export function failureCard(failure) {
  return `
  <article class="failure-card" data-id="${failure.id}">
    <div class="line1"><span>🚆 ${failure.trainId}</span><span class="badge">${failure.type}</span></div>
    <p class="summary">${failure.summary}</p>
    <div class="line3"><small>${failure.authorName} • ${formatDate(failure.createdAt)}</small><button class="btn-link" data-open-details="${failure.id}">Ver detalhes</button></div>
  </article>`;
}
