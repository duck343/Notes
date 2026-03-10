import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
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
  const [thumbs, setThumbs] = useState({}); // id -> url | "__error__"
  const [search, setSearch] = useState("");

  // Notes laden
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

  // Thumb-URLs holen (einfach, ohne Timeout)
  useEffect(() => {
    notes.forEach((n) => {
      if (!n.thumbPath) return;
      if (thumbs[n.id]) return; // schon versucht (url oder "__error__")

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

      // lokalen Cache aufräumen
      setThumbs((p) => {
        const copy = { ...p };
        delete copy[note.id];
        return copy;
      });
    } catch (err) {
      console.error("Delete fehlgeschlagen:", err);
    }
  };

  const renderThumb = (n) => {
    if (!n.thumbPath) {
      return <Box className="thumb-fallback">Kein Thumbnail</Box>;
    }

    const thumb = thumbs[n.id];

    if (!thumb) return <Skeleton variant="rounded" height={220} />;

    if (thumb === "__error__") {
      return <Box className="thumb-fallback">Thumbnail nicht verfügbar</Box>;
    }

    return (
      <Box
        component="img"
        src={thumb}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setThumbs((p) => ({ ...p, [n.id]: "__error__" }))}
        sx={{
          width: "100%",
          height: 220,
          objectFit: "cover",
          borderRadius: 1,
          display: "block",
        }}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Meine PDFs
          </Typography>
        </Box>

        <TextField
          label="Suchen (Titel / Fach)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 2,
          }}
        >
          {filtered.map((n) => (
            <Card key={n.id} sx={{ cursor: "pointer" }}>
              <Box
                onClick={() => nav(`/notes/${n.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && nav(`/notes/${n.id}`)}
              >
                <CardContent sx={{ p: 0 }}>
                  {renderThumb(n)}

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box sx={{ minWidth: 0, pl: 2, pt: 1}}>
                      <Typography fontWeight={850} noWrap title={n.title || ""}>
                        {n.title || "Ohne Titel"}
                      </Typography>

                      {n.ownerName && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          onClick={(e) => { e.stopPropagation(); nav(`/user/${n.ownerUid}`); }}
                          sx={{ cursor: "pointer", display: "block", "&:hover": { textDecoration: "underline" } }}
                        >
                          Von {n.ownerName}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: 0.7, flexWrap: "wrap" }}>
                        <Chip size="small" label={n.subject || "Sonstiges"} />
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ pr: 2 }}>
                      {/* PDF öffnen */}
                      <IconButton
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
                        <FiFileText />
                      </IconButton>

                      {/* Löschen */}
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n);
                        }}
                        aria-label="Löschen"
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Box>
            </Card>
          ))}
        </Box>

        {!filtered.length && (
          <Typography color="text.secondary">
            Keine PDFs gefunden.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
