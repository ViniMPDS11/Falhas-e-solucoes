import {
  addDoc,
  collection,
  getCountFromServer,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { db } from './firebase.js';
import { summarize, toKeywords } from '../utils/helpers.js';

const failuresCol = collection(db, 'failures');
const cache = new Map();

function commentsCol(failureId) {
  return collection(db, 'failures', failureId, 'comments');
}

function mapCommentDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    text: data.text || '',
    authorName: data.authorName || 'Sem nome',
    authorUid: data.authorUid || '',
    createdAt: data.createdAt?.toDate?.() || null,
  };
}

function toDateBounds(dateFrom, dateTo) {
  const bounds = [];
  if (dateFrom) bounds.push(where('createdAt', '>=', new Date(`${dateFrom}T00:00:00`)));
  if (dateTo) bounds.push(where('createdAt', '<=', new Date(`${dateTo}T23:59:59`)));
  return bounds;
}

function buildFilterConstraints(filters = {}) {
  const constraints = [];
  constraints.push(...toDateBounds(filters.dateFrom, filters.dateTo));
  return constraints;
}

function hasSeriesPrefix(trainId, selectedSeries = []) {
  if (!selectedSeries.length) return true;
  const normalized = String(trainId || '').toUpperCase();
  return selectedSeries.some((series) => normalized.startsWith(String(series || '').toUpperCase()));
}

function mapDocToItem(d) {
  const data = d.data();
  const item = {
    id: d.id,
    trainId: data.trainId,
    type: data.type,
    summary: data.summary || summarize(data.description || ''),
    authorName: data.authorName,
    authorUid: data.authorUid || '',
    createdAt: data.createdAt?.toDate?.() || null,
  };
  cache.set(d.id, { ...item, description: data.description, solution: data.solution || '' });
  return item;
}

export async function getFailuresPage({ cursorDoc = null, page = 1, pageSize = 20, sortBy = 'createdAt', sortDir = 'desc', filters = {} } = {}) {
  const selectedSeries = Array.isArray(filters.series) ? filters.series : [];
  if (selectedSeries.length) {
    const constraints = [...buildFilterConstraints(filters), orderBy(sortBy, sortDir)];
    const snap = await getDocs(query(failuresCol, ...constraints));
    const filtered = snap.docs
      .filter((docSnap) => hasSeriesPrefix(docSnap.data().trainId, selectedSeries))
      .map(mapDocToItem);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, lastDoc: null, hasMore: filtered.length > start + pageSize };
  }

  const constraints = [...buildFilterConstraints(filters), orderBy(sortBy, sortDir), limit(pageSize)];
  if (cursorDoc) constraints.push(startAfter(cursorDoc));
  const snap = await getDocs(query(failuresCol, ...constraints));
  const items = snap.docs.map(mapDocToItem);
  return { items, lastDoc: snap.docs.at(-1) || null, hasMore: snap.size === pageSize };
}

export async function getFailuresTotal(filters = {}) {
  const selectedSeries = Array.isArray(filters.series) ? filters.series : [];
  if (selectedSeries.length) {
    const q = query(failuresCol, ...buildFilterConstraints(filters), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.filter((docSnap) => hasSeriesPrefix(docSnap.data().trainId, selectedSeries)).length;
  }
  const q = query(failuresCol, ...buildFilterConstraints(filters));
  const countSnap = await getCountFromServer(q);
  return countSnap.data().count;
}

export async function searchFailures(term) {
  const key = term.toLowerCase();
  const snap = await getDocs(query(failuresCol, where('searchKeywords', 'array-contains', key), orderBy('createdAt', 'desc'), limit(20)));
  return snap.docs.map((d) => {
    const data = d.data();
    const item = {
      id: d.id,
      trainId: data.trainId,
      type: data.type,
      summary: data.summary || summarize(data.description || ''),
      authorName: data.authorName,
      authorUid: data.authorUid || '',
      createdAt: data.createdAt?.toDate?.() || null,
    };
    cache.set(d.id, { ...item, description: data.description, solution: data.solution || '' });
    return item;
  });
}


export async function searchFailuresGlobal(term, filters = {}) {
  const keyParts = String(term || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!keyParts.length) return [];
  const constraints = [...buildFilterConstraints(filters), orderBy('createdAt', 'desc')];
  const snap = await getDocs(query(failuresCol, ...constraints));
  const selectedSeries = Array.isArray(filters.series) ? filters.series : [];

  return snap.docs
    .filter((docSnap) => hasSeriesPrefix(docSnap.data().trainId, selectedSeries))
    .map((docSnap) => {
      const item = mapDocToItem(docSnap);
      const cached = cache.get(item.id) || {};
      const haystack = `${item.trainId} ${item.type} ${item.summary} ${cached.description || ''} ${cached.solution || ''}`.toLowerCase();
      return { item, match: keyParts.every((part) => haystack.includes(part)) };
    })
    .filter((entry) => entry.match)
    .map((entry) => entry.item);
}

export async function getFailureById(id) {
  if (cache.has(id)) return cache.get(id);
  const snap = await getDoc(doc(db, 'failures', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  const item = {
    id: snap.id,
    trainId: data.trainId,
    type: data.type,
    summary: data.summary || summarize(data.description || ''),
    description: data.description || '',
    solution: data.solution || '',
    authorName: data.authorName,
    authorUid: data.authorUid,
    createdAt: data.createdAt?.toDate?.() || null,
  };
  cache.set(id, item);
  return item;
}

export async function createFailure({ trainId, type, description, solution, user }) {
  const normalizedTrainId = trainId.toUpperCase();
  const payload = {
    trainId: normalizedTrainId,
    type,
    summary: summarize(description, 140),
    description,
    solution: solution || '',
    authorName: user.displayName || user.email || 'Sem nome',
    authorUid: user.uid,
    createdAt: serverTimestamp(),
    searchKeywords: toKeywords({ trainId: normalizedTrainId, type, description, solution }),
  };
  const ref = await addDoc(failuresCol, payload);
  return ref.id;
}


export async function getFailureComments(failureId) {
  const snap = await getDocs(query(commentsCol(failureId), orderBy('createdAt', 'asc')));
  return snap.docs.map(mapCommentDoc);
}

export async function deleteFailure(failureId, user) {
  const item = await getFailureById(failureId);
  if (!item) throw new Error('Falha não encontrada');
  if (item.authorUid !== user.uid) throw new Error('Apenas o autor pode excluir esta falha');

  const commentsSnap = await getDocs(commentsCol(failureId));
  await Promise.all(commentsSnap.docs.map((commentDoc) => deleteDoc(commentDoc.ref)));
  await deleteDoc(doc(db, 'failures', failureId));
  cache.delete(failureId);
}

export async function deleteFailureComment(failureId, commentId, user) {
  const commentRef = doc(db, 'failures', failureId, 'comments', commentId);
  const snap = await getDoc(commentRef);
  if (!snap.exists()) throw new Error('Comentário não encontrado');
  if (snap.data().authorUid !== user.uid) throw new Error('Apenas o autor pode excluir este comentário');
  await deleteDoc(commentRef);
}

export async function addFailureComment(failureId, { text, user }) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) throw new Error('Comentário vazio');
  if (normalizedText.length > 600) throw new Error('Comentário muito longo');

  const ref = await addDoc(commentsCol(failureId), {
    text: normalizedText,
    authorName: user.displayName || user.email || 'Sem nome',
    authorUid: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
