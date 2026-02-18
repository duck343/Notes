import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export async function uploadNotePdf({
  file,
  title,
  subject,
  user,
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

export async function getStorageUrl(path) {
  if (!path || typeof path !== "string") {
    throw new Error(`Ungültiger Storage-Pfad: ${String(path)}`);
  }
  return await getDownloadURL(ref(storage, path));
}
