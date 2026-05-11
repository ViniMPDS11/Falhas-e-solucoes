import { modalShell } from './modal.js';

export function failureForm({ authorName }) {
  return modalShell(`
    <h2>Registrar Nova Falha</h2>
    <form id="failure-form" class="failure-form">
      <label>ID do Trem<input name="trainId" required pattern="^[HTRQUS][0-9]+$" /></label>
      <label>Falha
        <input name="type" required maxlength="50" placeholder="Ex: Porta travada" />
        <small class="muted" id="type-counter">0/50</small>
      </label>
      <label>Descrição
        <textarea name="description" rows="5" required maxlength="300"></textarea>
        <small class="muted" id="description-counter">0/300</small>
      </label>
      <label>Solução
        <textarea name="solution" rows="3"></textarea>
      </label>
      <p class="muted">Registrado por: ${authorName}</p>
      <div class="actions"><button type="submit" id="save-failure-btn">Salvar Falha</button><button type="button" id="cancel-failure-btn" class="btn-secondary">Cancelar</button></div>
    </form>
  `);
}
