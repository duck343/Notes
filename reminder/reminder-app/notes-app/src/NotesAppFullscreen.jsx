import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiFileText, FiTrash2 } from "react-icons/fi";

import { collection, onSnapshot, orderBy, query, where, deleteDoc, doc } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

import { db } from "./firebase";
import { getStorageUrl } from "./notesRepo";

export default function NotesAppFullscreen({ user }) {
  const nav = useNavigate();
  const storage = getStorage();

  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notes"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("onSnapshot error:", err)
    );
  }, [user?.uid]);

  useEffect(() => {
    notes.forEach((n) => {
      if (!n.thumbPath || thumbs[n.id]) return;
      getStorageUrl(n.thumbPath)
        .then((url) => setThumbs((p) => ({ ...p, [n.id]: url })))
        .catch(() => setThumbs((p) => ({ ...p, [n.id]: "__error__" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return notes;
    return notes.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const sub = (n.subject || "").toLowerCase();
      return t.includes(s) || sub.includes(s);
    });
  }, [notes, search]);

  const handleDelete = async (note) => {
    if (!window.confirm(`Willst du "${note.title || "Ohne Titel"}" wirklich löschen?`)) return;
    try {
      if (note.filePath) await deleteObject(ref(storage, note.filePath));
      if (note.thumbPath) await deleteObject(ref(storage, note.thumbPath));
      await deleteDoc(doc(db, "notes", note.id));
      setThumbs((p) => { const c = { ...p }; delete c[note.id]; return c; });
    } catch (err) {
      console.error("Delete fehlgeschlagen:", err);
    }
  };

  const renderThumb = (n) => {
    if (!n.thumbPath) return <div className="thumb-fallback">Kein Thumbnail</div>;
    const thumb = thumbs[n.id];
    if (!thumb) return <Skeleton variant="rectangular" width="100%" height={240} sx={{ display: "block" }} />;
    if (thumb === "__error__") return <div className="thumb-fallback">Thumbnail nicht verfügbar</div>;
    return (
      <img
        src={thumb}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setThumbs((p) => ({ ...p, [n.id]: "__error__" }))}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  };

  return (
    <Box sx={{ width: "100%", p: { xs: 2, sm: 3 } }} className="page-content">
      <Stack spacing={2.5}>
        <Typography variant="h5" fontWeight={900} className="gradient-text">
          Meine PDFs
        </Typography>

        <TextField
          label="Suchen (Titel / Fach)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        {!filtered.length ? (
          <div className="empty-state">
            <FiFileText size={44} style={{ opacity: 0.22, marginBottom: 16 }} />
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>
              Keine PDFs gefunden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lade deine ersten Notizen hoch!
            </Typography>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 8,
            }}
          >
            {filtered.map((n, i) => (
              <div
                key={n.id}
                className="pdf-card card-stagger"
                style={{ ["--i"]: Math.min(i, 8) }}
              >
                {/* Thumbnail */}
                <div
                  className="pdf-thumb"
                  role="button"
                  tabIndex={0}
                  onClick={() => nav(`/notes/${n.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && nav(`/notes/${n.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {renderThumb(n)}
                </div>

                {/* Meta */}
                <div className="pdf-meta">
                  <p
                    className="pdf-title"
                    title={n.title || ""}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {n.title || "Ohne Titel"}
                  </p>
                  <div className="pdf-sub">
                    <Chip size="small" label={n.subject || "Sonstiges"} />
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const url = await getStorageUrl(n.filePath);
                            window.open(url, "_blank", "noopener,noreferrer");
                          } catch (err) {
                            console.error("PDF öffnen fehlgeschlagen:", err);
                          }
                        }}
                        aria-label="PDF öffnen"
                      >
                        <FiFileText size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDelete(n); }}
                        aria-label="Löschen"
                        sx={{ color: "error.main", opacity: 0.7, "&:hover": { opacity: 1 } }}
                      >
                        <FiTrash2 size={16} />
                      </IconButton>
                    </Stack>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Stack>
    </Box>
  );
}
