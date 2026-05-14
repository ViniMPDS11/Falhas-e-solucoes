import { modalShell } from './modal.js';

export function failureForm({ authorName }) {
  return modalShell(`
    <h2 class="failure-form-title">Registrar Nova Falha</h2>
    <p class="failure-form-subtitle">Preencha os dados com o máximo de contexto para facilitar a tratativa.</p>
    <form id="failure-form" class="failure-form" autocomplete="off">
      <label>ID do Trem<input name="trainId" required pattern="^[HTRQUS][0-9]+$" placeholder="Ex: H504" /></label>
      <label>Falha
        <input name="type" required maxlength="50" placeholder="Ex: Porta não fecha" />
        <small class="muted" id="type-counter">0/50</small>
      </label>
      <label>Descrição
        <textarea name="description" rows="5" required maxlength="300" placeholder="Ex: Porta 5 do carro H503 não fecha e consta desconhecida no IHM-Cosmos."></textarea>
        <small class="muted" id="description-counter">0/300</small>
      </label>
      <label>Solução
        <textarea name="solution" rows="3" placeholder="Ex: A porta foi normalizada após a realização do reset no módulo DCU da própria porta."></textarea>
        <textarea name="description" rows="5" required maxlength="300" placeholder="Ex: Porta da cabine não fechou após comando de partida."></textarea>
        <small class="muted" id="description-counter">0/300</small>
      </label>
      <label>Solução
        <textarea name="solution" rows="3" placeholder="Ex: Reinício do módulo da porta e teste funcional concluído."></textarea>
      </label>
      <p class="muted">Registrado por: ${authorName}</p>
      <div class="actions"><button type="submit" id="save-failure-btn">Salvar Falha</button><button type="button" id="cancel-failure-btn" class="btn-secondary">Cancelar</button></div>
    </form>
  `);
}
