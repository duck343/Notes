import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit, orderBy, runTransaction, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : {};
}

export async function setUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function toggleFollow(currentUid, targetUid) {
  const targetRef = doc(db, "users", targetUid);
  let nowFollowing = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(targetRef);
    const data = snap.exists() ? snap.data() : {};
    const followers = data.followers || {};
    const followersCount = data.followersCount || 0;
    const isFollowing = !!followers[currentUid];
    if (isFollowing) {
      const newFollowers = { ...followers };
      delete newFollowers[currentUid];
      tx.set(targetRef, { followers: newFollowers, followersCount: Math.max(0, followersCount - 1) }, { merge: true });
      nowFollowing = false;
    } else {
      tx.set(targetRef, { followers: { ...followers, [currentUid]: true }, followersCount: followersCount + 1 }, { merge: true });
      nowFollowing = true;
    }
  });
  return nowFollowing;
}

export async function searchUsersByName(nameQuery) {
  if (!nameQuery?.trim()) return [];
  const term = nameQuery.trim();
  const q = query(
    collection(db, "users"),
    where("displayName", ">=", term),
    where("displayName", "<=", term + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function getTopUsers(limitCount = 20) {
  const q = query(
    collection(db, "users"),
    orderBy("followersCount", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function uploadNotePdf({
  file,
  title,
  subject,
  user,
  ownerName,
  collectionName = "notes",
  onProgress,
}) {
  if (!user?.uid) throw new Error("uploadNotePdf: user.uid fehlt.");
  if (!file) throw new Error("Kein File übergeben.");
  if (!file.name?.toLowerCase().endsWith(".pdf")) throw new Error("Nur PDFs erlaubt.");

  const docId = crypto.randomUUID();
  const filePath = `notes/${docId}.pdf`;

  const task = uploadBytesResumable(ref(storage, filePath), file);

  await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(pct);
        }
      },
      reject,
      resolve
    );
  });

  await setDoc(doc(db, collectionName, docId), {
    title: title?.trim() || "Ohne Titel",
    subject: subject || "Sonstiges",
    filePath,
    ownerUid: user.uid,
    ownerName: ownerName || user.displayName || "Anonym",
    createdAt: serverTimestamp(),
    thumbPath: null,
    thumbUpdatedAt: null,
  });

  return { docId, filePath };
}

export async function getNoteById(noteId, collectionName = "notes") {
  if (!noteId || typeof noteId !== "string") {
    throw new Error(`URL hat keine gültige Note-ID: ${String(noteId)}`);
  }
  const snap = await getDoc(doc(db, collectionName, noteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addFriend(myUid, theirUid) {
  const batch = writeBatch(db);
  batch.set(doc(db, "users", myUid),   { friendUids: arrayUnion(theirUid) }, { merge: true });
  batch.set(doc(db, "users", theirUid), { friendUids: arrayUnion(myUid)   }, { merge: true });
  await batch.commit();
}

export async function removeFriend(myUid, theirUid) {
  const batch = writeBatch(db);
  batch.set(doc(db, "users", myUid),   { friendUids: arrayRemove(theirUid) }, { merge: true });
  batch.set(doc(db, "users", theirUid), { friendUids: arrayRemove(myUid)   }, { merge: true });
  await batch.commit();
}

export async function getFriends(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  const friendUids = snap.data().friendUids || [];
  if (!friendUids.length) return [];
  const profiles = await Promise.all(
    friendUids.map((fUid) =>
      getDoc(doc(db, "users", fUid)).then((s) => (s.exists() ? { uid: fUid, ...s.data() } : null))
    )
  );
  return profiles.filter(Boolean);
}

export async function getStorageUrl(path) {
  if (!path || typeof path !== "string") {
    throw new Error(`Ungültiger Storage-Pfad: ${String(path)}`);
  }
  return await getDownloadURL(ref(storage, path));
}
