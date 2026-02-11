import React, { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { FiUpload } from "react-icons/fi";
import { db, storage } from "./firebase";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { SUBJECTS } from "./notesShared.js";
import { useNavigate } from "react-router-dom";
import SubjectSelect from "./components/SubjectSelect.jsx";


export default function NotesUploadPage({ user }) {
  const nav = useNavigate();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startUpload = async () => {
    if (!file) return alert("Bitte PDF auswählen.");
    if (!title.trim()) return alert("Bitte Titel eingeben.");
    if (file.type !== "application/pdf") return alert("Nur PDF erlaubt.");

    setUploading(true);
    setProgress(0);

    try {
      const docRef = await addDoc(collection(db, "notes"), {
        title: title.trim(),
        subject,
        uploaderUid: user.uid,
        uploaderName: user.displayName || "Unbekannt",
        createdAt: serverTimestamp(),
        fileUrl: "",
        filePath: "",
      });

      const storagePath = `notes/${docRef.id}.pdf`;
      const storageRef = ref(storage, storagePath);

      const task = uploadBytesResumable(storageRef, file, { contentType: "application/pdf" });

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "notes", docRef.id), { fileUrl: url, filePath: storagePath });

      nav("/"); // zurück zur Bibliothek
    } catch (e) {
      alert("Upload fehlgeschlagen: " + (e?.message || e));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ fontWeight: 900, marginBottom: 12, opacity: 0.9 }}>Upload</div>

        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <input
            type="text"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />

          <SubjectSelect
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  subjects={SUBJECTS}
  disabled={uploading}
/>


          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />

          <Tooltip title="Upload starten">
            <button className="btn-icon btn-add" onClick={startUpload} disabled={uploading} aria-label="Upload">
              <FiUpload />
            </button>
          </Tooltip>

          {uploading && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Upload: <b>{progress}%</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
