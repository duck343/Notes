import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Avatar,
  Button,
  CircularProgress,
} from "@mui/material";
import { FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getUserProfile, getFriends, removeFriend } from "./notesRepo";

export default function NotesProfilePage({ user }) {
  const nav = useNavigate();
  const [friends, setFriends] = useState([]);
  const [removingUid, setRemovingUid] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getFriends(user.uid).then(setFriends).catch(console.error);
  }, [user?.uid]);

  async function handleRemoveFriend(friendUid) {
    setRemovingUid(friendUid);
    try {
      await removeFriend(user.uid, friendUid);
      setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
    } catch (e) { console.error(e); }
    finally { setRemovingUid(null); }
  }

  const name = user?.displayName || "";
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>

        {/* ── Profile hero ── */}
        <div className="profile-hero">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Avatar
              src={user?.photoURL || undefined}
              sx={{ width: 80, height: 80, fontSize: 28, flexShrink: 0, border: "2.5px solid rgba(124,92,255,0.35)" }}
            >
              {!user?.photoURL && initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h5" fontWeight={900}
                sx={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.025em", mb: 0.25 }}
                noWrap
              >
                {name || user?.displayName || "Dein Profil"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {user?.email}&ensp;·&ensp;Google-Konto
              </Typography>
              <div className="stat-row">
                <span className="stat-pill">
                  <strong>{friends.length}</strong>&nbsp;Freunde
                </span>
              </div>
            </Box>
          </Stack>
        </div>

        {/* Friends list */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FiUsers size={18} />
              <Typography fontWeight={800}>Freunde ({friends.length})</Typography>
            </Stack>
            {friends.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Noch keine Freunde. Besuche ein Profil und klicke auf "Freund+".
              </Typography>
            ) : (
              <Stack spacing={1}>
                {friends.map((f) => {
                  const initials = (f.displayName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <Stack key={f.uid} direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        src={f.photoURL || undefined}
                        sx={{ width: 38, height: 38, fontSize: 14, cursor: "pointer" }}
                        onClick={() => nav(`/user/${f.uid}`)}
                      >
                        {!f.photoURL && initials}
                      </Avatar>
                      <Typography
                        fontWeight={700} sx={{ flex: 1, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                        onClick={() => nav(`/user/${f.uid}`)}
                      >
                        {f.displayName || "Unbekannt"}
                      </Typography>
                      <Button
                        size="small" variant="outlined" color="error"
                        disabled={removingUid === f.uid}
                        onClick={() => handleRemoveFriend(f.uid)}
                      >
                        {removingUid === f.uid ? <CircularProgress size={14} /> : "Entfernen"}
                      </Button>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
}
