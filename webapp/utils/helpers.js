export function debounce(fn, wait = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function toKeywords({ trainId, type, description, solution }) {
  const text = `${trainId} ${type} ${description} ${solution || ''}`.toLowerCase();
  return [...new Set(text.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3))].slice(0, 30);
}

export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function summarize(text, max = 120) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}


export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
