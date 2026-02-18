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
import { FiFileText } from "react-icons/fi";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";

import { db } from "./firebase";
import { getStorageUrl } from "./notesRepo";

import { deleteDoc, doc } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { FiTrash2 } from "react-icons/fi";


export default function NotesAppFullscreen({ user }) {
  const nav = useNavigate();

  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({}); // { [id]: url | "__error__" }
  const [search, setSearch] = useState("");

  const storage = getStorage();

  // Meine Notes laden
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notes"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotes(arr);
      },
      (err) => console.error("onSnapshot error:", err)
    );
  }, [user?.uid]);

  // Thumbnails laden (nur wenn thumbPath existiert)
  useEffect(() => {
    notes.forEach(async (n) => {
      if (!n.thumbPath) return;
      if (thumbs[n.id]) return;

      try {
        const url = await getStorageUrl(n.thumbPath);
        setThumbs((p) => ({ ...p, [n.id]: url }));
      } catch (e) {
        console.error("Thumb load failed:", n.id, e);
        setThumbs((p) => ({ ...p, [n.id]: "__error__" }));
      }
    });
    // absichtlich nur notes als dependency (keine Endlosschleife)
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
  const confirmDelete = window.confirm(
    `Willst du "${note.title || "Ohne Titel"}" wirklich löschen?`
  );
  if (!confirmDelete) return;

  try {
    // 1. PDF löschen
    if (note.filePath) {
      await deleteObject(ref(storage, note.filePath));
    }

    // 2. Thumbnail löschen
    if (note.thumbPath) {
      await deleteObject(ref(storage, note.thumbPath));
    }

    // 3. Firestore Doc löschen
    await deleteDoc(doc(db, "notes", note.id));

  } catch (err) {
    console.error("Delete fehlgeschlagen:", err);
  }
};



  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Meine PDFs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Klick auf eine Karte öffnet den Viewer. Icon öffnet PDF direkt.
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
          {filtered.map((n) => {
            const thumb = thumbs[n.id];

            return (
              <Card key={n.id} sx={{ cursor: "pointer" }}>
                {/* WICHTIG: kein CardActionArea -> keine button-in-button warnings */}
                <Box
                  onClick={() => nav(`/notes/${n.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && nav(`/notes/${n.id}`)}
                >
                  <CardContent sx={{ display: "grid", gap: 1.3 }}>
                    {/* Thumb */}
                    {!n.thumbPath ? (
                      <Skeleton variant="rounded" height={220} />
                    ) : thumb === "__error__" ? (
                      <Skeleton variant="rounded" height={220} />
                    ) : !thumb ? (
                      <Skeleton variant="rounded" height={220} />
                    ) : (
                      <Box
                        component="img"
                        src={thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        sx={{
                          width: "100%",
                          height: 220,
                          objectFit: "cover",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    )}

                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={850} noWrap title={n.title || ""}>
                          {n.title || "Ohne Titel"}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.7, flexWrap: "wrap" }}>
                          <Chip size="small" label={n.subject || "Sonstiges"} />
                          {!n.thumbPath && (
                            <Chip size="small" variant="outlined" label="Thumbnail wird erstellt…" />
                          )}
                        </Stack>
                      </Box>

                      {/* PDF direkt öffnen */}
                      <Stack direction="row" spacing={0.5}>
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
            );
          })}
        </Box>

        {!filtered.length && (
          <Typography color="text.secondary">
            Keine PDFs gefunden. (Oder Filter zu streng.)
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
