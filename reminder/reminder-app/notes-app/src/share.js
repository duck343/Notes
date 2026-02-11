import { db } from './firebase';
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';

export const genShareId = () => Math.random().toString(36).slice(2, 10);

export async function createList(title, ownerUid) {
  const shareId = genShareId();
  const listRef = doc(collection(db, 'lists'));
  await setDoc(listRef, { title, owner: ownerUid, shareId });
  return { listId: listRef.id, shareId };
}

export async function getListByShareId(shareId) {
  const snap = await getDocs(query(collection(db, 'lists'), where('shareId', '==', shareId)));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}