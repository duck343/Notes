import React, { useEffect, useMemo, useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { FiExternalLink } from "react-icons/fi";
import { db } from "./firebase";
import { SUBJECTS, listenNotes, renderThumbFromUrl } from "./notesShared.js";
import SubjectSelect from "./components/SubjectSelect.jsx";


export default function NotesSearchPage() {
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Alle");

  useEffect(() => {
    return listenNotes(db, setNotes);
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return notes.filter((n) => {
      const subjectOk = subject === "Alle" ? true : n.subject === subject;
      const titleOk = s ? (n.title || "").toLowerCase().includes(s) : true;
      return subjectOk && titleOk;
    });
  }, [notes, search, subject]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const slice = filtered.slice(0, 24);
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
    return () => { alive = false; };
  }, [filtered, thumbs]);

  const openPdf = (note) => {
    if (!note.fileUrl) return;
    window.open(note.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ fontWeight: 900, marginBottom: 12, opacity: 0.9 }}>Suchen</div>

        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Titel suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SubjectSelect
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  subjects={SUBJECTS}
  includeAll
/>




          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Ergebnisse: <b>{filtered.length}</b>
          </div>
        </div>

        <div className="pdf-grid">
          {filtered.map((n) => (
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
                      onClick={(e) => { e.stopPropagation(); openPdf(n); }}
                      aria-label="Öffnen"
                      disabled={!n.fileUrl}
                      style={{ opacity: n.fileUrl ? 1 : 0.5 }}
                    >
                      <FiExternalLink />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p style={{ textAlign: "center", opacity: 0.7, marginTop: 28 }}>
            Keine Treffer.
          </p>
        )}
      </div>
    </div>
  );
}
