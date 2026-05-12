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
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-stroke" aria-hidden="true"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9 15H15M6.86852 21H17.1315C17.9302 21 18.4066 20.1099 17.9635 19.4453L17.2969 18.4453C17.1114 18.1671 16.7992 18 16.4648 18H7.53518C7.20083 18 6.8886 18.1671 6.70313 18.4453L6.03647 19.4453C5.59343 20.1099 6.06982 21 6.86852 21ZM8 7H16C16.5523 7 17 7.44772 17 8V11C17 11.5523 16.5523 12 16 12H8C7.44772 12 7 11.5523 7 11V8C7 7.44772 7.44772 7 8 7ZM7 18H17C18.1046 18 19 17.1046 19 16V6C19 4.89543 18.1046 4 17 4H7C5.89543 4 5 4.89543 5 6V16C5 17.1046 5.89543 18 7 18Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"></path> </g></svg>
          <span>${failure.trainId}</span>
        </div>
        <div class="meta-item" aria-label="Data de registro">
          <svg fill="#60758b" viewBox="0 0 35 35" data-name="Layer 2" id="a866a81f-2948-4418-8bd5-1a5193c5f74e" xmlns="http://www.w3.org/2000/svg" class="icon-stroke" aria-hidden="true"><g id="SVGRepo_bgCarrier" stroke-width="1.7"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M29.545,34.75H5.455a5.211,5.211,0,0,1-5.2-5.2V8.56a5.21,5.21,0,0,1,5.205-5.2h24.09a5.21,5.21,0,0,1,5.2,5.205V29.545A5.211,5.211,0,0,1,29.545,34.75ZM5.455,5.855A2.708,2.708,0,0,0,2.75,8.56V29.545a2.709,2.709,0,0,0,2.705,2.7h24.09a2.708,2.708,0,0,0,2.7-2.7V8.56a2.707,2.707,0,0,0-2.7-2.7Z"></path><path d="M33.5,17.331H1.541a1.25,1.25,0,0,1,0-2.5H33.5a1.25,1.25,0,0,1,0,2.5Z"></path><path d="M9.459,9.155a1.249,1.249,0,0,1-1.25-1.25V1.5a1.25,1.25,0,0,1,2.5,0V7.905A1.25,1.25,0,0,1,9.459,9.155Z"></path><path d="M25.542,9.155a1.249,1.249,0,0,1-1.25-1.25V1.5a1.25,1.25,0,0,1,2.5,0V7.905A1.25,1.25,0,0,1,25.542,9.155Z"></path></g></svg>
          <span>${formatDate(failure.createdAt)}</span>
        </div>
        <button class="btn-link" data-open-details="${failure.id}">Ver detalhes</button>
      </div>
    </div>
  </article>`;
}
