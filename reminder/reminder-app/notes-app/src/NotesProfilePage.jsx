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
} from "@mui/material";
import { updateProfile } from "firebase/auth";
import { FiSave } from "react-icons/fi";
import { auth } from "./firebase";
import { getUserProfile, setUserProfile } from "./notesRepo";

export default function NotesProfilePage({ user }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid)
      .then((profile) => {
        setName(profile?.displayName || user.displayName || "");
      })
      .catch(() => setName(user.displayName || ""))
      .finally(() => setLoading(false));
  }, [user?.uid]);

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
    <Box sx={{ maxWidth: 600, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h5" fontWeight={900}>
          Mein Profil
        </Typography>

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
