import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Card,
  CardContent,
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
        onError={() => setThumbs((p) => ({ ...p, [n.id]: "__error__" }))}
        sx={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 1, display: "block" }}
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
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Zurück */}
        <Box>
          <button className="btn-icon" onClick={() => nav(-1)} style={{ gap: 8 }}>
            <FiArrowLeft />
            <span>Zurück</span>
          </button>
        </Box>

        {/* Profil-Header */}
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          {loadingProfile ? (
            <Skeleton variant="circular" width={72} height={72} />
          ) : (
            <Avatar src={profile?.photoURL || undefined} sx={{ width: 72, height: 72, fontSize: 26 }}>
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
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>{followersCount}</strong> {followersCount === 1 ? "Follower" : "Follower"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loadingNotes ? "…" : `${notes.length} ${notes.length === 1 ? "PDF" : "PDFs"}`}
              </Typography>
            </Stack>
          </Box>

          {!isOwnProfile && !loadingProfile && (
            <Stack direction="row" spacing={1}>
              <Button
                variant={isFriend ? "outlined" : "contained"}
                startIcon={isFriend ? <FiUserCheck /> : <FiUsers />}
                onClick={handleFriend}
                disabled={friendLoading}
                size="small"
                color={isFriend ? "success" : "primary"}
              >
                {isFriend ? "Freund" : "Freund+"}
              </Button>
              <Button
                variant={isFollowing ? "outlined" : "contained"}
                startIcon={isFollowing ? <FiUserCheck /> : <FiUserPlus />}
                onClick={handleFollow}
                disabled={followLoading}
                size="small"
              >
                {isFollowing ? "Gefolgt" : "Folgen"}
              </Button>
            </Stack>
          )}
        </Stack>

        {/* PDF-Grid */}
        {loadingNotes ? (
          <Typography color="text.secondary">Lade PDFs…</Typography>
        ) : notes.length === 0 ? (
          <Typography color="text.secondary">Noch keine PDFs hochgeladen.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 2,
            }}
          >
            {notes.map((n) => {
              const liked = !!(n.likedBy && user?.uid && n.likedBy[user.uid]);
              return (
                <Card key={n.id} sx={{ cursor: "pointer" }}>
                  <CardContent sx={{ p: 0 }}>
                    <Box onClick={() => nav(`/notes/${n.id}`)}>
                      {renderThumb(n)}
                    </Box>
                    <Box sx={{ minWidth: 0, pl: 2, pt: 1 }}>
                      <Typography fontWeight={850} noWrap title={n.title || ""}>
                        {n.title || "Ohne Titel"}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ px: 2, pb: 1 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={n.subject || "Sonstiges"} />
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton onClick={() => toggleLike(n)} size="small" aria-label="Like">
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
                            console.error(err);
                          }
                        }}
                        aria-label="PDF öffnen"
                      >
                        <FiFileText />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
