import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const SUBJECTS = [
  "Mathe",
  "Deutsch",
  "Englisch",
  "Biologie",
  "Chemie",
  "Physik",
  "Programmieren",
  "Netzwerktechnik",
  "Projektmanagement",
  "Datenbanken",
  "Webprogrammieren",
  "BWL",
  "Geschichte",
  "Geografie",
  "Wirtschaft",
  "Sonstiges",
];

export function listenNotes(db, cb) {
  const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function renderThumbFromUrl(url) {
  // 1) PDF als ArrayBuffer holen -> bessere Kontrolle + bessere Fehlermeldung
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PDF fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.arrayBuffer();

  // 2) pdf.js aus data laden
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.1 });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function listenMyNotes(db, uid, cb) {
  const q = query(
    collection(db, "notes"),
    where("uploaderUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}


