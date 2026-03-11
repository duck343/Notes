import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp, onSnapshot, arrayUnion, arrayRemove, deleteField,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

// ─── Data structure ────────────────────────────────────────────────────────────
// groups/{groupId}:
//   name, createdBy, memberUids: string[], memberNames: {uid: name},
//   memberPhotos: {uid: photoURL}, createdAt, lastMessage,
//   lastMessageAt, lastSenderUid, lastSenderName
//
// groups/{groupId}/messages/{msgId}:
//   senderUid, senderName, senderPhoto, type: "text"|"pdf"|"file",
//   text?, pdfPath?, pdfTitle?, pdfId?, fileUrl?, fileName?,
//   reactions: { emoji: { uid: true } }, createdAt

export async function createGroup(name, memberUids = [], creatorUid, creatorName, creatorPhoto) {
  if (!name || !creatorUid) throw new Error("createGroup: missing arguments");
  const allUids = [...new Set([...memberUids, creatorUid])];
  const memberNames  = { [creatorUid]: creatorName  || "Anonym" };
  const memberPhotos = { [creatorUid]: creatorPhoto || null };

  const docRef = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    createdBy: creatorUid,
    memberUids: allUids,
    memberNames,
    memberPhotos,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    lastSenderUid: null,
    lastSenderName: null,
  });
  return docRef.id;
}

export async function getGroupById(groupId) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Kept for backwards-compat with App.jsx (notification listener)
export async function getGroupsForUser(uid) {
  if (!uid) return [];
  const snap = await getDocs(
    query(collection(db, "groups"), where("memberUids", "array-contains", uid))
  );
  const gs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return gs.sort(
    (a, b) => (b.lastMessageAt?.seconds ?? b.createdAt?.seconds ?? 0)
            - (a.lastMessageAt?.seconds ?? a.createdAt?.seconds ?? 0)
  );
}

// Real-time groups listener (preferred)
export function listenUserGroups(uid, callback) {
  if (!uid) return () => {};
  return onSnapshot(
    query(collection(db, "groups"), where("memberUids", "array-contains", uid)),
    (snap) => {
      const gs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      gs.sort(
        (a, b) => (b.lastMessageAt?.seconds ?? b.createdAt?.seconds ?? 0)
                - (a.lastMessageAt?.seconds ?? a.createdAt?.seconds ?? 0)
      );
      callback(gs);
    },
    (err) => console.error("listenUserGroups:", err)
  );
}

export async function addUserToGroup(groupId, uid, displayName, photoURL) {
  await updateDoc(doc(db, "groups", groupId), {
    memberUids: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName || "Anonym",
    [`memberPhotos.${uid}`]: photoURL   || null,
  });
}

export async function sendGroupMessage(groupId, {
  senderUid, senderName, senderPhoto,
  type = "text", text,
  pdfPath, pdfTitle, pdfId,
  file,
}) {
  if (!groupId || !senderUid) throw new Error("sendGroupMessage: missing args");

  let fileUrl = null, fileName = null, msgType = type;
  if (file) {
    const path = `groups/${groupId}/${crypto.randomUUID()}_${file.name}`;
    const task = uploadBytesResumable(ref(storage, path), file);
    await new Promise((res, rej) => task.on("state_changed", null, rej, res));
    fileUrl   = await getDownloadURL(ref(storage, path));
    fileName  = file.name;
    msgType   = "file";
  }

  const msgData = {
    senderUid,
    senderName:  senderName  || "Anonym",
    senderPhoto: senderPhoto || null,
    type: msgType,
    reactions: {},
    createdAt: serverTimestamp(),
  };
  if (msgType === "text") msgData.text    = text     || "";
  if (msgType === "pdf")  { msgData.pdfPath = pdfPath; msgData.pdfTitle = pdfTitle || "Dokument"; if (pdfId) msgData.pdfId = pdfId; }
  if (msgType === "file") { msgData.fileUrl = fileUrl; msgData.fileName = fileName; }

  await addDoc(collection(db, "groups", groupId, "messages"), msgData);

  const preview =
    msgType === "text" ? (text || "").slice(0, 100) :
    msgType === "pdf"  ? `📄 ${pdfTitle || "PDF"}` :
                         `📎 ${fileName || "Datei"}`;

  await updateDoc(doc(db, "groups", groupId), {
    lastMessage:     preview,
    lastMessageAt:   serverTimestamp(),
    lastSenderUid:   senderUid,
    lastSenderName:  senderName || "Anonym",
  });
}

export function messagesQuery(groupId) {
  return query(
    collection(db, "groups", groupId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
}

export function listenGroupMessages(groupId, callback) {
  if (!groupId) return () => {};
  return onSnapshot(
    messagesQuery(groupId),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error("listenGroupMessages:", err)
  );
}

export async function toggleReaction(groupId, messageId, uid, emoji) {
  const msgRef = doc(db, "groups", groupId, "messages", messageId);
  const snap   = await getDoc(msgRef);
  if (!snap.exists()) return;
  const reactions = snap.data().reactions || {};
  const emojiMap  = reactions[emoji] || {};
  if (emojiMap[uid]) {
    const newMap      = { ...emojiMap };
    delete newMap[uid];
    const newReactions = { ...reactions, [emoji]: newMap };
    if (!Object.keys(newMap).length) delete newReactions[emoji];
    await updateDoc(msgRef, { reactions: newReactions });
  } else {
    await updateDoc(msgRef, { [`reactions.${emoji}`]: { ...emojiMap, [uid]: true } });
  }
}

// legacy alias
export const reactToMessage = toggleReaction;

export async function leaveGroup(groupId, uid) {
  await updateDoc(doc(db, "groups", groupId), {
    memberUids: arrayRemove(uid),
    [`memberNames.${uid}`]:  deleteField(),
    [`memberPhotos.${uid}`]: deleteField(),
  });
}

export async function addMembersToGroup(groupId, members) {
  // members: [{uid, displayName, photoURL}]
  const updates = { memberUids: arrayUnion(...members.map((m) => m.uid)) };
  members.forEach((m) => {
    updates[`memberNames.${m.uid}`]  = m.displayName || "Anonym";
    updates[`memberPhotos.${m.uid}`] = m.photoURL    || null;
  });
  await updateDoc(doc(db, "groups", groupId), updates);
}
