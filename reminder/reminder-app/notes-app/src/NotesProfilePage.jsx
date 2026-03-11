import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import { updateProfile } from "firebase/auth";
import { FiSave, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { getUserProfile, setUserProfile, getFriends, removeFriend } from "./notesRepo";

export default function NotesProfilePage({ user }) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [friends, setFriends] = useState([]);
  const [removingUid, setRemovingUid] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid)
      .then((profile) => setName(profile?.displayName || user.displayName || ""))
      .catch(() => setName(user.displayName || ""))
      .finally(() => setLoading(false));
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

  const handleSave = async () => {
    if (!user?.uid) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("❌ Name darf nicht leer sein.");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      await setUserProfile(user.uid, { displayName: trimmed, photoURL: user.photoURL || null });
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setStatus("✅ Profil gespeichert!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || user?.displayName || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h5" fontWeight={900}>
          Mein Profil
        </Typography>

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

        <Card>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack spacing={3}>
              {/* Avatar + E-Mail */}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={user?.photoURL || undefined}
                  sx={{ width: 72, height: 72, fontSize: 26 }}
                >
                  {!user?.photoURL && initials}
                </Avatar>
                <Box>
                  <Typography fontWeight={700}>{user?.email}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Google-Konto
                  </Typography>
                </Box>
              </Stack>

              {/* Name-Feld */}
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <TextField
                  label="Anzeigename"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setStatus("");
                  }}
                  disabled={saving}
                  fullWidth
                  helperText="Dieser Name wird bei deinen PDFs angezeigt."
                />
              )}

              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <FiSave />}
                onClick={handleSave}
                disabled={saving || loading}
                sx={{ alignSelf: "flex-start" }}
              >
                Speichern
              </Button>

              {status && (
                <Typography variant="body2">{status}</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
