import { modalShell } from './modal.js';

export function failureForm({ authorName }) {
  return modalShell(`
    <h2>Registrar Nova Falha</h2>
    <form id="failure-form" class="failure-form">
      <label>ID do Trem<input name="trainId" required pattern="^[HTRQUS][0-9]+$" /></label>
      <label>Tipo de Falha
        <select name="type" required>
          <option>Elétrica</option><option>Freio</option><option>Porta</option><option>Comunicação</option><option>Ar-condicionado</option><option>Sistema</option><option>Outro</option>
        </select>
      </label>
      <label>Descrição<textarea name="description" rows="5" required></textarea></label>
      <label>Solução<textarea name="solution" rows="3"></textarea></label>
      <p class="muted">Registrado por: ${authorName}</p>
      <div class="actions"><button type="submit" id="save-failure-btn">Salvar Falha</button><button type="button" id="cancel-failure-btn" class="btn-secondary">Cancelar</button></div>
    </form>
  `);
}
