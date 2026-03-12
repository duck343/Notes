import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  IconButton,
  Skeleton,
  Button,
} from "@mui/material";
import { FiFileText, FiHeart, FiArrowLeft, FiUserPlus, FiUserCheck, FiUsers } from "react-icons/fi";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { getStorageUrl, toggleFollow, addFriend, removeFriend, getUserProfile } from "./notesRepo";

export default function NotesPublicProfilePage({ user }) {
  const { uid } = useParams();
  const nav = useNavigate();

  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFriend, setIsFriend]           = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);

  // Check friend status
  useEffect(() => {
    if (!user?.uid || !uid || user.uid === uid) return;
    getUserProfile(user.uid).then((p) => {
      setIsFriend(!!(p.friendUids || []).includes(uid));
    }).catch(console.error);
  }, [user?.uid, uid]);

  // Load user profile from Firestore
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid))
      .then((snap) =>
        setProfile(
          snap.exists()
            ? { uid, ...snap.data() }
            : { uid, displayName: "Unbekannter Nutzer" }
        )
      )
      .catch(() => setProfile({ uid, displayName: "Fehler" }))
      .finally(() => setLoadingProfile(false));
  }, [uid]);

  // Load their notes
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notes"),
      where("ownerUid", "==", uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q)
      .then((snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoadingNotes(false));
  }, [uid]);

  // Load thumbnails
  useEffect(() => {
    notes.forEach((n) => {
      if (!n.thumbPath || thumbs[n.id]) return;
      getStorageUrl(n.thumbPath)
        .then((url) => setThumbs((p) => ({ ...p, [n.id]: url })))
        .catch(() => setThumbs((p) => ({ ...p, [n.id]: "__error__" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

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
        onError={() => setThumbs((p) => ({ ...p, [n.id]: "__error__" }))}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  };

  const initials = (profile?.displayName || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isOwnProfile = user?.uid === uid;
  const isFollowing = !!(profile?.followers && user?.uid && profile.followers[user.uid]);
  const followersCount = profile?.followersCount || 0;

  const handleFriend = async () => {
    if (!user?.uid || isOwnProfile) return;
    setFriendLoading(true);
    try {
      if (isFriend) {
        await removeFriend(user.uid, uid);
        setIsFriend(false);
      } else {
        await addFriend(user.uid, uid);
        setIsFriend(true);
      }
    } catch (err) { console.error("Friend failed:", err); }
    finally { setFriendLoading(false); }
  };

  const handleFollow = async () => {
    if (!user?.uid || isOwnProfile) return;
    setFollowLoading(true);
    try {
      const nowFollowing = await toggleFollow(user.uid, uid);
      setProfile((p) => {
        if (!p) return p;
        const followers = { ...(p.followers || {}) };
        if (nowFollowing) {
          followers[user.uid] = true;
        } else {
          delete followers[user.uid];
        }
        return { ...p, followers, followersCount: Math.max(0, (p.followersCount || 0) + (nowFollowing ? 1 : -1)) };
      });
    } catch (err) {
      console.error("Follow failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }} className="page-content">
      <Stack spacing={3}>
        {/* Zurück */}
        <Box>
          <button className="btn-icon" onClick={() => nav(-1)} style={{ gap: 8 }}>
            <FiArrowLeft />
            <span>Zurück</span>
          </button>
        </Box>

        {/* ── Profil-Hero ── */}
        <div className="profile-hero">
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            {loadingProfile ? (
              <Skeleton variant="circular" width={72} height={72} />
            ) : (
              <Avatar
                src={profile?.photoURL || undefined}
                sx={{
                  width: 72, height: 72, fontSize: 26,
                  boxShadow: "0 4px 16px rgba(124,92,255,.32)",
                  background: !profile?.photoURL
                    ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                    : undefined,
                }}
              >
                {!profile?.photoURL && initials}
              </Avatar>
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={900}>
                {loadingProfile ? <Skeleton width={160} /> : profile?.displayName}
                {isOwnProfile && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (Du)
                  </Typography>
                )}
              </Typography>
              <div className="stat-row">
                <span className="stat-pill">
                  <strong>{followersCount}</strong>&nbsp;Follower
                </span>
                <span className="stat-pill">
                  <strong>{loadingNotes ? "…" : notes.length}</strong>&nbsp;
                  {notes.length === 1 ? "PDF" : "PDFs"}
                </span>
              </div>
            </Box>

            {!isOwnProfile && !loadingProfile && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                <Button
                  variant={isFriend ? "outlined" : "contained"}
                  startIcon={isFriend ? <FiUserCheck /> : <FiUsers />}
                  onClick={handleFriend}
                  disabled={friendLoading}
                  size="small"
                  color={isFriend ? "success" : "primary"}
                  sx={!isFriend ? {
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6a48ff, var(--accent-2))",
                      transform: "translateY(-1px)",
                    },
                    transition: "transform 180ms var(--ease-spring)",
                  } : {}}
                >
                  {isFriend ? "Freund ✓" : "Freund+"}
                </Button>
                <Button
                  variant={isFollowing ? "outlined" : "contained"}
                  startIcon={isFollowing ? <FiUserCheck /> : <FiUserPlus />}
                  onClick={handleFollow}
                  disabled={followLoading}
                  size="small"
                  sx={!isFollowing ? {
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6a48ff, var(--accent-2))",
                      transform: "translateY(-1px)",
                    },
                    transition: "transform 180ms var(--ease-spring)",
                  } : {}}
                >
                  {isFollowing ? "Gefolgt" : "Folgen"}
                </Button>
              </Stack>
            )}
          </Stack>
        </div>

        {/* ── PDF-Grid ── */}
        {loadingNotes ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 8,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={300} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <FiFileText size={44} style={{ opacity: 0.22, marginBottom: 16 }} />
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>Noch keine PDFs</Typography>
            <Typography variant="body2" color="text.secondary">
              Dieser Nutzer hat noch nichts hochgeladen.
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
            {notes.map((n, i) => {
              const liked = !!(n.likedBy && user?.uid && n.likedBy[user.uid]);
              return (
                <div
                  key={n.id}
                  className="pdf-card card-stagger"
                  style={{ ["--i"]: Math.min(i, 8) }}
                >
                  <div
                    className="pdf-thumb"
                    onClick={() => nav(`/notes/${n.id}`)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    {renderThumb(n)}
                  </div>
                  <div className="pdf-meta">
                    <p
                      className="pdf-title"
                      title={n.title || ""}
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {n.title || "Ohne Titel"}
                    </p>
                    <div className="pdf-sub">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={n.subject || "Sonstiges"} />
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton
                            onClick={(e) => { e.stopPropagation(); toggleLike(n); }}
                            size="small"
                            aria-label="Like"
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
                          } catch (err) { console.error(err); }
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
        )}
      </Stack>
    </Box>
  );
}
