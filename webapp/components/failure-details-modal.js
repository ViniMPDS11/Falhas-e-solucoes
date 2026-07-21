import { addFailureComment, deleteFailure, deleteFailureComment, getFailureById, getFailureComments } from '../services/failures.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';

function commentMarkup(comment, user) {
  const canDelete = comment.authorUid && comment.authorUid === user.uid;
  return `
    <article class="failure-comment" data-comment-id="${escapeHtml(comment.id)}">
      <div class="failure-comment-avatar" aria-hidden="true">${escapeHtml((comment.authorName || '?').trim().charAt(0).toUpperCase() || '?')}</div>
      <div class="failure-comment-body">
        <div class="failure-comment-meta">
          <div class="failure-comment-author">
            <strong>${escapeHtml(comment.authorName || 'Sem nome')}</strong>
            <span>${formatDate(comment.createdAt)}</span>
          </div>
          ${canDelete ? `<button class="comment-delete-btn" type="button" data-delete-comment="${escapeHtml(comment.id)}" aria-label="Excluir comentário">Excluir</button>` : ''}
        </div>
        <p>${escapeHtml(comment.text)}</p>
      </div>
    </article>`;
}

function commentsMarkup(comments, user) {
  if (!comments.length) {
    return '<p class="failure-comments-empty">Ainda não há comentários. Seja o primeiro a registrar uma observação.</p>';
  }
  return comments.map((comment) => commentMarkup(comment, user)).join('');
}

function buildDetailsMarkup(item, comments, user) {
  const canDeleteFailure = item.authorUid && item.authorUid === user.uid;
  return `
    <div class="failure-details-shell" role="dialog" aria-modal="true" aria-labelledby="failure-details-title">
      <div class="failure-details-head">
        <p class="failure-details-kicker">Registro operacional</p>
        <div class="failure-details-head-actions">
          ${canDeleteFailure ? '<button id="delete-failure-btn" class="failure-delete-btn" type="button">Excluir falha</button>' : ''}
          <button id="close-failure-details" class="failure-details-close" type="button" aria-label="Fechar">✕</button>
        </div>
      </div>
      <h3 id="failure-details-title">Detalhes da falha</h3>
      <p class="failure-details-summary">${escapeHtml(item.summary || '-')}</p>
      <div class="failure-details-grid">
        <div><span>Trem</span><strong>${escapeHtml(item.trainId || '-')}</strong></div>
        <div><span>Tipo</span><strong>${escapeHtml(item.type || '-')}</strong></div>
        <div><span>Autor</span><strong>${escapeHtml(item.authorName || '-')}</strong></div>
        <div><span>Data/Hora</span><strong>${formatDate(item.createdAt)}</strong></div>
      </div>
      <div class="failure-details-block">
        <h4>Descrição</h4>
        <p>${escapeHtml(item.description || '-')}</p>
      </div>
      <div class="failure-details-block solution">
        <h4>Solução aplicada</h4>
        <p>${escapeHtml(item.solution || 'Ainda não informada.')}</p>
      </div>
      <section class="failure-comments-panel" aria-labelledby="failure-comments-title">
        <div class="failure-comments-head">
          <div>
            <p class="failure-comments-kicker">Colaboração da equipe</p>
            <h4 id="failure-comments-title">Comentários</h4>
          </div>
          <span id="failure-comments-count" class="failure-comments-count">${comments.length}</span>
        </div>
        <div id="failure-comments-list" class="failure-comments-list">${commentsMarkup(comments, user)}</div>
        <form id="failure-comment-form" class="failure-comment-form">
          <label for="failure-comment-text">Adicionar comentário</label>
          <textarea id="failure-comment-text" name="comment" maxlength="600" rows="3" placeholder="Compartilhe uma atualização, dúvida ou complemento sobre esta falha..." required></textarea>
          <div class="failure-comment-actions">
            <span id="failure-comment-counter">0/600</span>
            <button id="save-comment-btn" type="submit">Comentar</button>
          </div>
        </form>
      </section>
    </div>`;
}

export async function openFailureDetailsModal(id, user, { onFailureDeleted } = {}) {
  const [item, comments] = await Promise.all([getFailureById(id), getFailureComments(id)]);
  if (!item) throw new Error('Falha não encontrada');
  const backdrop = document.createElement('div');
  backdrop.className = 'failure-details-backdrop';
  backdrop.id = 'failure-details-backdrop';
  backdrop.innerHTML = buildDetailsMarkup(item, comments, user);
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

  async function refreshComments() {
    const nextComments = await getFailureComments(id);
    list.innerHTML = commentsMarkup(nextComments, user);
    count.textContent = String(nextComments.length);
  }

  document.getElementById('close-failure-details').onclick = close;
  const deleteFailureBtn = document.getElementById('delete-failure-btn');
  if (deleteFailureBtn) {
    deleteFailureBtn.onclick = async () => {
      if (!confirm('Excluir esta falha e seus comentários? Esta ação não pode ser desfeita.')) return;
      deleteFailureBtn.disabled = true;
      deleteFailureBtn.textContent = 'Excluindo...';
      try {
        await deleteFailure(id, user);
        close();
        if (typeof onFailureDeleted === 'function') await onFailureDeleted();
      } catch (error) {
        console.error(error);
        alert('Não foi possível excluir esta falha agora.');
        deleteFailureBtn.disabled = false;
        deleteFailureBtn.textContent = 'Excluir falha';
      }
    };
  }
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeyDown);

  const form = document.getElementById('failure-comment-form');
  const textarea = document.getElementById('failure-comment-text');
  const counter = document.getElementById('failure-comment-counter');
  const saveBtn = document.getElementById('save-comment-btn');
  const list = document.getElementById('failure-comments-list');
  const count = document.getElementById('failure-comments-count');

  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length}/600`;
  });

  list.addEventListener('click', async (event) => {
    const commentId = event.target.dataset.deleteComment;
    if (!commentId) return;
    if (!confirm('Excluir este comentário?')) return;
    event.target.disabled = true;
    event.target.textContent = 'Excluindo...';
    try {
      await deleteFailureComment(id, commentId, user);
      await refreshComments();
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir este comentário agora.');
      event.target.disabled = false;
      event.target.textContent = 'Excluir';
    }
  });

  form.onsubmit = async (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Enviando...';
    try {
      await addFailureComment(id, { text, user });
      await refreshComments();
      form.reset();
      counter.textContent = '0/600';
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar o comentário agora.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Comentar';
    }
  };
}
