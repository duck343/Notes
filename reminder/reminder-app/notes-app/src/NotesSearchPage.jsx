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
  Tab,
  Tabs,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Avatar,
} from "@mui/material";
import { FiFileText, FiHeart, FiUser } from "react-icons/fi";

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
import { getStorageUrl, searchUsersByName } from "./notesRepo";
import { SUBJECTS } from "./notesShared";

export default function NotesSearchPage({ user }) {
  const nav = useNavigate();
  const [tab, setTab] = useState(0);

  // --- PDF-Tab ---
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Alle");

  // --- Benutzer-Tab ---
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);

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

  // Thumb-URLs laden
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
    const base = notes.filter((n) => {
      const okText =
        !s ||
        (n.title || "").toLowerCase().includes(s) ||
        (n.subject || "").toLowerCase().includes(s);
      const okSubject = subject === "Alle" ? true : (n.subject || "Sonstiges") === subject;
      return okText && okSubject;
    });
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
          const newLikedBy = { ...likedBy };
          delete newLikedBy[user.uid];
          tx.update(noteRef, { likedBy: newLikedBy, likesCount: Math.max(0, likesCount - 1) });
        } else {
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

  // Benutzersuche
  useEffect(() => {
    if (!userQuery.trim()) {
      setUserResults([]);
      return;
    }
    setUserSearching(true);
    const timeout = setTimeout(() => {
      searchUsersByName(userQuery)
        .then(setUserResults)
        .catch(console.error)
        .finally(() => setUserSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [userQuery]);

  const renderThumb = (n) => {
    if (!n.thumbPath) return <Box className="thumb-fallback">Kein Thumbnail</Box>;
    const thumb = thumbs[n.id];
    if (!thumb) return <Skeleton variant="rounded" height={220} />;
    if (thumb === "__error__") return <Box className="thumb-fallback">Thumbnail nicht verfügbar</Box>;
    return (
      <Box
        component="img"
        src={thumb}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setThumbs((p) => ({ ...p, [n.id]: "__error__" }))}
        sx={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 2, display: "block" }}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h5" fontWeight={900}>Suche</Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="PDFs" />
          <Tab label="Benutzer" />
        </Tabs>

        {/* ── PDF-Tab ── */}
        {tab === 0 && (
          <Stack spacing={2.5}>
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
                const liked = !!(n.likedBy && user?.uid && n.likedBy[user.uid]);
                return (
                  <Card key={n.id} sx={{ cursor: "pointer" }}>
                    <Box role="button" tabIndex={0}>
                      <CardContent sx={{ p: 0 }}>
                        <Box onClick={() => nav(`/notes/${n.id}`)}>
                          {renderThumb(n)}
                        </Box>
                        <Box sx={{ minWidth: 0, pl: 2, pt: 1 }}>
                          <Typography fontWeight={850} noWrap title={n.title || ""}>
                            {n.title || "Ohne Titel"}
                          </Typography>
                          {n.ownerName && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              onClick={(e) => { e.stopPropagation(); nav(`/user/${n.ownerUid}`); }}
                              sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                            >
                              Von {n.ownerName}
                            </Typography>
                          )}
                        </Box>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ px: 2, width: "100%" }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={n.subject || "Sonstiges"} />
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <IconButton
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleLike(n); }}
                                aria-label="Like"
                                size="small"
                              >
                                <FiHeart style={{ opacity: liked ? 1 : 0.35, color: liked ? "red" : "white" }} />
                              </IconButton>
                              <Typography variant="body2" color="text.secondary">
                                {n.likesCount || 0}
                              </Typography>
                            </Stack>
                          </Stack>
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
        )}

        {/* ── Benutzer-Tab ── */}
        {tab === 1 && (
          <Stack spacing={2}>
            <TextField
              label="Benutzer suchen"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              fullWidth
              placeholder="Name eingeben…"
            />

            {userSearching && (
              <Typography color="text.secondary">Suche…</Typography>
            )}

            {!userSearching && userQuery.trim() && userResults.length === 0 && (
              <Typography color="text.secondary">Keine Benutzer gefunden.</Typography>
            )}

            <Stack spacing={1}>
              {userResults.map((u) => {
                const initials = (u.displayName || "?")
                  .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <Card
                    key={u.uid}
                    sx={{ cursor: "pointer" }}
                    onClick={() => nav(`/user/${u.uid}`)}
                  >
                    <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar src={u.photoURL || undefined} sx={{ width: 44, height: 44 }}>
                          {!u.photoURL && initials}
                        </Avatar>
                        <Typography fontWeight={700}>{u.displayName}</Typography>
                        <Box sx={{ ml: "auto" }}>
                          <FiUser style={{ opacity: 0.4 }} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
