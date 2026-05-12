import {
  addDoc,
  collection,
  getCountFromServer,
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

export async function getFailuresPage({ cursorDoc = null, pageSize = 20, sortBy = 'createdAt', sortDir = 'desc', filters = {} } = {}) {
  const constraints = [...buildFilterConstraints(filters), orderBy(sortBy, sortDir), limit(pageSize)];
  if (cursorDoc) constraints.push(startAfter(cursorDoc));
  const snap = await getDocs(query(failuresCol, ...constraints));
  const items = snap.docs.map((d) => {
    const data = d.data();
    const item = {
      id: d.id,
      trainId: data.trainId,
      type: data.type,
      summary: data.summary || summarize(data.description || ''),
      authorName: data.authorName,
      createdAt: data.createdAt?.toDate?.() || null,
    };
    cache.set(d.id, { ...item, description: data.description, solution: data.solution || '' });
    return item;
  });
  return { items, lastDoc: snap.docs.at(-1) || null, hasMore: snap.size === pageSize };
}

export async function getFailuresTotal(filters = {}) {
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
      createdAt: data.createdAt?.toDate?.() || null,
    };
    cache.set(d.id, { ...item, description: data.description, solution: data.solution || '' });
    return item;
  });
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
    searchKeywords: toKeywords({ trainId: normalizedTrainId, type, description }),
  };
  const ref = await addDoc(failuresCol, payload);
  return ref.id;
}
