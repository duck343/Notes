import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { FiFileText, FiHeart, FiUser } from "react-icons/fi";

import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  doc,
  runTransaction,
} from "firebase/firestore";

import { db } from "./firebase";
import { getStorageUrl, searchUsersByName, getAllUsers } from "./notesRepo";
import { SUBJECTS } from "./notesShared";

const PAGE_SIZE = 12;

export default function NotesSearchPage({ user }) {
  const nav = useNavigate();
  const [tab, setTab] = useState(0);

  // --- PDF-Tab ---
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Alle");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);
  const busyRef = useRef(false);

  // --- Benutzer-Tab ---
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [popularUsers, setPopularUsers] = useState([]);
  const [userSearching, setUserSearching] = useState(false);

  async function loadNotes(reset = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const q = reset || !lastDocRef.current
        ? query(collection(db, "notes"), orderBy("createdAt", "desc"), limit(PAGE_SIZE))
        : query(collection(db, "notes"), orderBy("createdAt", "desc"), startAfter(lastDocRef.current), limit(PAGE_SIZE));

      const snap = await getDocs(q);
      const newDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lastDocRef.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setNotes((prev) => reset ? newDocs : [...prev, ...newDocs]);
    } catch (err) {
      console.error("loadNotes error:", err);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    lastDocRef.current = null;
    loadNotes(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    return notes.filter((n) => {
      const okText =
        !s ||
        (n.title || "").toLowerCase().includes(s) ||
        (n.subject || "").toLowerCase().includes(s);
      const okSubject = subject === "Alle" ? true : (n.subject || "Sonstiges") === subject;
      return okText && okSubject;
    });
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
      // Optimistic local update
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== note.id) return n;
          const likedBy = n.likedBy || {};
          const alreadyLiked = !!likedBy[user.uid];
          if (alreadyLiked) {
            const newLikedBy = { ...likedBy };
            delete newLikedBy[user.uid];
            return { ...n, likedBy: newLikedBy, likesCount: Math.max(0, (n.likesCount || 0) - 1) };
          }
          return { ...n, likedBy: { ...likedBy, [user.uid]: true }, likesCount: (n.likesCount || 0) + 1 };
        })
      );
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  // Benutzersuche
  useEffect(() => {
    if (!userQuery.trim()) {
      setUserResults([]);
      // fetch a larger pool and shuffle for random display
      getAllUsers(200).then((all) => {
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        setPopularUsers(shuffled.slice(0, 10));
      }).catch(console.error);
      return;
    }
    setUserSearching(true);
    const timeout = setTimeout(() => {
      searchUsersByName(userQuery)
        .then((results) => setUserResults(results.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))))
        .catch(console.error)
        .finally(() => setUserSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [userQuery]);

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
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }} className="page-content">
      <Stack spacing={2.5}>
        <Typography variant="h5" fontWeight={900} className="gradient-text">Suche</Typography>

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

            {/* Loading skeleton on first load */}
            {loading && notes.length === 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 8,
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={300} />
                ))}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 8,
              }}
            >
              {filtered.map((n, i) => {
                const liked = !!(n.likedBy && user?.uid && n.likedBy[user.uid]);
                return (
                  <div
                    key={n.id}
                    className="pdf-card card-stagger"
                    style={{ ["--i"]: Math.min(i, 8) }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="pdf-thumb"
                      onClick={() => nav(`/notes/${n.id}`)}
                      role="button"
                      tabIndex={0}
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
                      {n.ownerName && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          onClick={(e) => { e.stopPropagation(); nav(`/user/${n.ownerUid}`); }}
                          sx={{ cursor: "pointer", display: "block", mb: 0.5, "&:hover": { textDecoration: "underline" } }}
                        >
                          Von {n.ownerName}
                        </Typography>
                      )}
                      <div className="pdf-sub">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={n.subject || "Sonstiges"} />
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleLike(n); }}
                              aria-label="Like"
                              size="small"
                            >
                              <FiHeart style={{ opacity: liked ? 1 : 0.35, color: liked ? "red" : "inherit" }} />
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
                          size="small"
                        >
                          <FiFileText size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && notes.length > 0 && filtered.length === 0 && (
              <div className="empty-state">
                <FiFileText size={40} style={{ opacity: 0.22, marginBottom: 16 }} />
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>Keine PDFs gefunden.</Typography>
                <Typography variant="body2" color="text.secondary">Versuche einen anderen Suchbegriff.</Typography>
              </div>
            )}

            {/* Load more button */}
            {hasMore && notes.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => loadNotes(false)}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                  {loading ? "Lädt…" : "Mehr laden"}
                </Button>
              </Box>
            )}

            {!hasMore && notes.length > 0 && (
              <Typography color="text.secondary" align="center" variant="body2">
                Alle {notes.length} PDFs geladen
              </Typography>
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

            {!userSearching && !userQuery.trim() && popularUsers.length > 0 && (
              <Typography color="text.secondary" fontWeight={600} variant="body2">
                Nutzer
              </Typography>
            )}

            {!userSearching && userQuery.trim() && userResults.length === 0 && (
              <Typography color="text.secondary">Keine Benutzer gefunden.</Typography>
            )}

            <Stack spacing={1}>
              {(userQuery.trim() ? userResults : popularUsers).map((u, i) => {
                const initials = (u.displayName || "?")
                  .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <Card
                    key={u.uid}
                    className="card-stagger"
                    style={{ ["--i"]: Math.min(i, 8) }}
                    sx={{
                      cursor: "pointer",
                      transition: "transform 280ms var(--ease-spring), box-shadow 280ms ease, border-color 280ms ease",
                      "&:hover": {
                        transform: "translateY(-3px) scale(1.008)",
                        boxShadow: "0 16px 48px rgba(0,0,0,.12), 0 0 0 1px rgba(124,92,255,.18)",
                        borderColor: "rgba(124,92,255,.25)",
                      },
                    }}
                    onClick={() => nav(`/user/${u.uid}`)}
                  >
                    <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%" }}>
                        <Avatar
                          src={u.photoURL || undefined}
                          sx={{
                            width: 44, height: 44,
                            background: !u.photoURL ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : undefined,
                            boxShadow: "0 2px 8px rgba(124,92,255,.28)",
                          }}
                        >
                          {!u.photoURL && initials}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>{u.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.followersCount || 0} Follower
                          </Typography>
                        </Box>
                        <FiUser style={{ opacity: 0.4, flexShrink: 0 }} />
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
