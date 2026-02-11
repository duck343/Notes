import React, { useEffect, useMemo, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { FiExternalLink, FiTrash2 } from "react-icons/fi";
import { db, storage } from "./firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { listenMyNotes, renderThumbFromUrl } from "./notesShared.js";


export default function NotesAppFullscreen({ user }) {
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
  return listenMyNotes(db, user.uid, setNotes);
}, [user.uid]);

  const list = useMemo(() => notes, [notes]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const slice = list.slice(0, 24);
      for (const n of slice) {
        if (!alive) return;
        if (!n.fileUrl) continue;
        if (thumbs[n.id]) continue;
        try {
          const dataUrl = await renderThumbFromUrl(n.fileUrl);
          if (!alive) return;
          setThumbs((p) => ({ ...p, [n.id]: dataUrl }));
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [list, thumbs]);

  const openPdf = (note) => {
    if (!note.fileUrl) return;
    window.open(note.fileUrl, "_blank", "noopener,noreferrer");
  };

  const removeNote = async (note) => {
    if (note.uploaderUid !== user.uid) return alert("Nur der Uploader darf löschen.");
    if (!window.confirm("Wirklich löschen?")) return;

    try {
      if (note.filePath) await deleteObject(ref(storage, note.filePath));
      await deleteDoc(doc(db, "notes", note.id));
    } catch (e) {
      alert("Löschen fehlgeschlagen: " + (e?.message || e));
    }
  };

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ fontWeight: 900, marginBottom: 12, opacity: 0.9 }}>Bibliothek</div>

        <div className="pdf-grid">
          {list.map((n) => (
            <div key={n.id} className="pdf-card" onClick={() => openPdf(n)}>
              <div className="pdf-thumb">
  {thumbs[n.id] && thumbs[n.id] !== "__error__" ? (
    <img src={thumbs[n.id]} alt="" />
  ) : thumbs[n.id] === "__error__" ? (
    <div style={{ opacity: 0.7, fontSize: 12, padding: 12, textAlign: "center" }}>
      Kein Thumbnail
    </div>
  ) : (
    <div style={{ opacity: 0.7, fontSize: 12, padding: 12, textAlign: "center" }}>
      Thumbnail lädt…
    </div>
  )}
</div>


              <div className="pdf-meta">
                <div className="pdf-title">{n.title}</div>
                <div className="pdf-sub">
                  <span>{n.subject}</span>
                  <span style={{ opacity: 0.7 }}>{(n.uploaderName || "").slice(0, 16) || "?"}</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Tooltip title="Öffnen">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPdf(n);
                      }}
                      aria-label="Öffnen"
                      disabled={!n.fileUrl}
                      style={{ opacity: n.fileUrl ? 1 : 0.5 }}
                    >
                      <FiExternalLink />
                    </button>
                  </Tooltip>

                  <Tooltip title="Löschen">
                    <button
                      className="btn-icon btn-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNote(n);
                      }}
                      aria-label="Löschen"
                      disabled={n.uploaderUid !== user.uid}
                      style={{ opacity: n.uploaderUid !== user.uid ? 0.35 : 1 }}
                    >
                      <FiTrash2 />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <p style={{ textAlign: "center", opacity: 0.7, marginTop: 28 }}>
            Noch keine PDFs vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}




