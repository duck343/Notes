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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { FiFileText } from "react-icons/fi";
import { FiHeart } from "react-icons/fi";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  runTransaction,
} from "firebase/firestore";

import { db } from "./firebase";
import { getStorageUrl } from "./notesRepo";
import { SUBJECTS } from "./notesShared";

export default function NotesSearchPage({ user }) {
  const nav = useNavigate();

  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({}); // id -> url | "__error__"
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Alle");

  // Notes laden (nur eigene, wie bei dir)
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

  // Thumb-URLs holen (einfach)
  useEffect(() => {
    notes.forEach((n) => {
      if (!n.thumbPath) return;
      if (thumbs[n.id]) return;

      getStorageUrl(n.thumbPath)
        .then((url) => setThumbs((p) => ({ ...p, [n.id]: url })))
        .catch(() => setThumbs((p) => ({ ...p, [n.id]: "__error__" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    const base = notes.filter((n) => {
      const okText =
        !s ||
        (n.title || "").toLowerCase().includes(s) ||
        (n.subject || "").toLowerCase().includes(s);

      const okSubject =
        subject === "Alle" ? true : (n.subject || "Sonstiges") === subject;

      return okText && okSubject;
    });

    // MOST LIKED FIRST
    return base.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  }, [notes, search, subject]);

  const toggleLike = async (note) => {
    if (!user?.uid) return;

    const noteRef = doc(db, "notes", note.id);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(noteRef);
        if (!snap.exists()) return;

        const data = snap.data() || {};
        const likedBy = data.likedBy || {};
        const likesCount = data.likesCount || 0;

        const alreadyLiked = !!likedBy[user.uid];

        if (alreadyLiked) {
          // unlike
          const newLikedBy = { ...likedBy };
          delete newLikedBy[user.uid];
          tx.update(noteRef, {
            likedBy: newLikedBy,
            likesCount: Math.max(0, likesCount - 1),
          });
        } else {
          // like
          tx.update(noteRef, {
            likedBy: { ...likedBy, [user.uid]: true },
            likesCount: likesCount + 1,
          });
        }
      });
    } catch (err) {
      console.error("Like failed:", err);
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
          borderRadius: 2,
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
            Suche
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Suchen (Titel / Fach)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="subject-label">Fach</InputLabel>
            <Select
              labelId="subject-label"
              label="Fach"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <MenuItem value="Alle">Alle</MenuItem>
              {SUBJECTS.filter((s) => s !== "Alle").map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
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
            const liked = !!(n.likedBy && user?.uid && n.likedBy[user.uid]);
            const likesCount = n.likesCount || 0;

            return (
              <Card key={n.id} sx={{ cursor: "pointer" }}>
                <Box role="button" tabIndex={0}>


                  <CardContent sx={{ p: 0 }}>
                    <Box onClick={() => nav(`/notes/${n.id}`)}>
                      {renderThumb(n)}
                    </Box>
                    <Box sx={{ minWidth: 0, pl: 2, pt: 1}}>
                      <Typography fontWeight={850} noWrap title={n.title || ""}>
                          {n.title || "Ohne Titel"}
                        </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      
                        

                        <Stack
  direction="row"
  alignItems="center"
  justifyContent="space-between"
  sx={{ px: 2, width: "100%" }}
>
  {/* LINKS: Fach + Like + Count */}
  <Stack direction="row" spacing={1} alignItems="center">
    <Chip size="small" label={n.subject || "Sonstiges"} />

    <Stack direction="row" spacing={0.5} alignItems="center">
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleLike(n);
        }}
        aria-label="Like"
        size="small"
      >
        <FiHeart style={{ opacity: liked ? 1 : 0.35 , color: liked ?"red" : "white"}} />
      </IconButton>

      <Typography variant="body2" color="text.secondary">
        {n.likesCount || 0}
      </Typography>
    </Stack>
  </Stack>

  {/* RECHTS: PDF öffnen */}
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
</Stack>

                    </Stack>
                  </CardContent>
                </Box>
              </Card>
            );
          })}
        </Box>

        {!filtered.length && (
          <Typography color="text.secondary">Keine PDFs gefunden.</Typography>
        )}
      </Stack>
    </Box>
  );
}
