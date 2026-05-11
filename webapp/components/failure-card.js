import { formatDate } from '../utils/helpers.js';

export function failureCard(failure) {
  return `
  <article class="failure-card" data-id="${failure.id}">
    <div class="body">
      <p class="failure-title">Falha registrada</p>
      <p class="text">${failure.summary}</p>
      <span class="username">${failure.authorName}</span>
      <div class="footer">
        <div class="meta-item" aria-label="Trem">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21,3H11A5.0057,5.0057,0,0,0,6,8V20a4.99,4.99,0,0,0,3.582,4.77L7.7693,29H9.9451l1.7143-4h8.6812l1.7143,4h2.1758L22.418,24.77A4.99,4.99,0,0,0,26,20V8A5.0057,5.0057,0,0,0,21,3ZM11,5H21a2.9948,2.9948,0,0,1,2.8157,2H8.1843A2.9948,2.9948,0,0,1,11,5ZM24,19H21v2h2.8157A2.9948,2.9948,0,0,1,21,23H11a2.9948,2.9948,0,0,1-2.8157-2H11V19H8V17H24Zm0-4H8V9H24Z"></path></svg>
          <span>${failure.trainId}</span>
        </div>
        <div class="meta-item" aria-label="Data de registro">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 10V7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 3V7M16 3V7" stroke-width="2" stroke-linecap="round"></path><rect x="6" y="12" width="3" height="3" rx="0.5"></rect><rect x="10.5" y="12" width="3" height="3" rx="0.5"></rect><rect x="15" y="12" width="3" height="3" rx="0.5"></rect></svg>
          <span>${formatDate(failure.createdAt)}</span>
        </div>
        <button class="btn-link" data-open-details="${failure.id}">Ver detalhes</button>
      </div>
    </div>
  </article>`;
}
