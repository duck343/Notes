import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
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
  FormControl, InputLabel, MenuItem, Select
} from "@mui/material";
import { FiFileText } from "react-icons/fi";

import { db } from "./firebase";
import { getStorageUrl } from "./notesRepo";

import {SUBJECTS} from "./notesShared";

import { doc, getDoc } from "firebase/firestore";

export default function NotesSearchPage() {
  const nav = useNavigate();
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [search, setSearch] = useState("");
const [usersMap, setUsersMap] = useState({});

  
const [subject, setSubject] = useState("Alle");


  // Notes laden
  useEffect(() => {
    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotes(arr);
    });
  }, []);

  // Thumbnails laden
  useEffect(() => {
    notes.forEach(async (n) => {
      if (!n.thumbPath) return;
      if (thumbs[n.id]) return;

      try {
        const url = await getStorageUrl(n.thumbPath);
        setThumbs((p) => ({ ...p, [n.id]: url }));
      } catch (err) {
        console.error("Thumbnail error:", err);
        setThumbs((p) => ({ ...p, [n.id]: "__error__" }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

useEffect(() => {
  const loadUsers = async () => {
    const uniqueUids = [...new Set(notes.map(n => n.ownerUid).filter(Boolean))];

    for (const uid of uniqueUids) {
      if (usersMap[uid]) continue; // schon geladen

      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          setUsersMap(prev => ({
            ...prev,
            [uid]: snap.data().displayName || "Unbekannt"
          }));
        }
      } catch (err) {
        console.error("User load error:", err);
      }
    }
  };

  if (notes.length) loadUsers();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [notes]);


  const filtered = useMemo(() => {
  const s = search.toLowerCase();
  return notes.filter((n) => {
    const okText =
      !s ||
      (n.title || "").toLowerCase().includes(s) ||
      (n.subject || "").toLowerCase().includes(s);

    const okSubject = subject === "Alle" ? true : (n.subject || "Sonstiges") === subject;

    return okText && okSubject;
  });
}, [notes, search, subject]);


  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
      <Typography variant="h5" fontWeight={900} mb={2}>
        Alle Notizen
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
  <TextField
    label="Suchen"
    fullWidth
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <FormControl sx={{ minWidth: 180 }}>
    <InputLabel id="subject-label">Fach</InputLabel>
    <Select
      labelId="subject-label"
      label="Fach"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
    >
      {SUBJECTS.map((s) => (
        <MenuItem key={s} value={s}>{s}</MenuItem>
      ))}
    </Select>
  </FormControl>
</Stack>

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
            <Card key={n.id}>
              {/* KEIN CardActionArea -> kein button in button */}
              <Box
                onClick={() => nav(`/notes/${n.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && nav(`/notes/${n.id}`)}
                sx={{ cursor: "pointer" }}
              >
                <CardContent>
                  {/* Thumbnail */}
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
                        mb: 1,
                      }}
                    />
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0 }}>
                     
                      <Stack spacing={0.5}>
  <Typography fontWeight={800} noWrap title={n.title || ""}>
    {n.title || "Ohne Titel"}
  </Typography>

  <Chip size="small" label={n.subject || "Sonstiges"} />

  <Typography variant="caption" color="text.secondary">
    von {usersMap[n.ownerUid] || "…"}
  </Typography>
</Stack>

                      
                    </Box>

                    {/* PDF Direkt-Öffnen */}
                    <IconButton
                      onClick={async (e) => {
                        e.stopPropagation(); // verhindert Card-Click
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
                  </Stack>
                </CardContent>
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
