import React, { useRef, useState } from "react";
import {
  Avatar, Box, Button, CircularProgress, Divider,
  Stack, Switch, TextField, Typography,
} from "@mui/material";
import { FiCamera, FiLogOut, FiTrash2 } from "react-icons/fi";
import { signOut, updateProfile, deleteUser, reauthenticateWithPopup } from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "./firebase";
import { db } from "./firebase";

/* ── Reusable section wrapper ── */
function Section({ title, children }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 800,
          letterSpacing: ".10em",
          fontSize: "11px",
          color: "text.secondary",
          px: 0.5,
          display: "block",
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          background: "var(--glass)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* ── Reusable row inside a section ── */
function Row({ label, description, action, last = false }) {
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ px: 2.5, py: 1.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} fontSize={14} lineHeight={1.35}>
            {label}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      {!last && <Divider sx={{ mx: 2.5 }} />}
    </>
  );
}

export default function NotesSettingsPage({ user, mode, setMode }) {
  const nav = useNavigate();
  const storage = getStorage();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingName, setSavingName]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savedMsg, setSavedMsg]       = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notifications preference (local only for now)
  const [groupNotifs, setGroupNotifs] = useState(
    () => localStorage.getItem("group-notifs") !== "false"
  );

  const showSaved = (msg = "Gespeichert ✓") => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === user.displayName) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      await updateDoc(doc(db, "users", user.uid), { displayName: trimmed });
      showSaved("Name gespeichert ✓");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingName(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      showSaved("Foto aktualisiert ✓");
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleGroupNotifsToggle = (checked) => {
    setGroupNotifs(checked);
    localStorage.setItem("group-notifs", checked ? "true" : "false");
  };

  const handleSignOut = () => signOut(auth).then(() => nav("/"));

  const handleDeleteAccount = async () => {
    if (!window.confirm("Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    setDeletingAccount(true);
    try {
      // Re-authenticate first (Google)
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(auth.currentUser);
      nav("/");
    } catch (err) {
      console.error(err);
      alert("Löschen fehlgeschlagen. Bitte erneut anmelden und versuchen.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const initials = (user?.displayName || "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Box
      sx={{ width: "100%", maxWidth: 600, mx: "auto", p: { xs: 2, sm: 3 } }}
      className="page-content"
    >
      <Stack spacing={3}>
        <Typography variant="h5" fontWeight={900} className="gradient-text">
          Einstellungen
        </Typography>

        {/* ── Profil ── */}
        <Section title="Profil">
          {/* Avatar */}
          <Stack direction="row" alignItems="center" spacing={2.5} sx={{ px: 2.5, py: 2.5 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={user?.photoURL || undefined}
                sx={{
                  width: 64, height: 64, fontSize: 22,
                  background: !user?.photoURL
                    ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                    : undefined,
                  boxShadow: "0 4px 16px rgba(124,92,255,.28)",
                }}
              >
                {!user?.photoURL && initials}
              </Avatar>
              <Box
                component="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                sx={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--accent)",
                  border: "2px solid var(--glass-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff",
                  transition: "background 150ms, transform 150ms",
                  "&:hover": { background: "#6a48ff", transform: "scale(1.08)" },
                  "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
                }}
              >
                {uploadingPhoto
                  ? <CircularProgress size={11} color="inherit" />
                  : <FiCamera size={12} />}
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{user?.displayName || "—"}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {user?.email}
              </Typography>
            </Box>
          </Stack>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />

          <Divider sx={{ mx: 2.5 }} />

          {/* Display name */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2 }}>
            <TextField
              label="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              size="small"
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleSaveName}
              disabled={savingName || !displayName.trim() || displayName.trim() === user?.displayName}
              size="small"
              sx={{ minWidth: 90 }}
            >
              {savingName ? <CircularProgress size={15} color="inherit" /> : "Speichern"}
            </Button>
          </Stack>

          {savedMsg && (
            <Typography
              variant="caption"
              sx={{ px: 2.5, pb: 1.5, display: "block", color: "success.main", fontWeight: 700 }}
            >
              {savedMsg}
            </Typography>
          )}
        </Section>

        {/* ── Erscheinungsbild ── */}
        <Section title="Erscheinungsbild">
          <Row
            label="Dunkles Design"
            description="Wechselt zwischen Hell- und Dunkelmodus"
            last
            action={
              <Switch
                checked={mode === "dark"}
                onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "var(--accent)" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "var(--accent)",
                  },
                }}
              />
            }
          />
        </Section>

        {/* ── Benachrichtigungen ── */}
        <Section title="Benachrichtigungen">
          <Row
            label="Gruppen-Nachrichten"
            description="Pop-up anzeigen wenn jemand in einer Gruppe schreibt"
            last
            action={
              <Switch
                checked={groupNotifs}
                onChange={(e) => handleGroupNotifsToggle(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "var(--accent)" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "var(--accent)",
                  },
                }}
              />
            }
          />
        </Section>

        {/* ── Konto ── */}
        <Section title="Konto">
          <Row
            label="E-Mail-Adresse"
            description={user?.email || "—"}
            action={null}
          />
          <Row
            label="Abmelden"
            description="Von diesem Gerät abmelden"
            action={
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<FiLogOut size={14} />}
                onClick={handleSignOut}
              >
                Abmelden
              </Button>
            }
          />
          <Row
            label="Konto löschen"
            description="Alle Daten werden dauerhaft gelöscht"
            last
            action={
              <Button
                variant="outlined"
                size="small"
                startIcon={deletingAccount ? <CircularProgress size={13} color="inherit" /> : <FiTrash2 size={14} />}
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                sx={{
                  color: "error.main",
                  borderColor: "rgba(255,59,48,.35)",
                  "&:hover": {
                    background: "rgba(255,59,48,.08)",
                    borderColor: "rgba(255,59,48,.6)",
                  },
                }}
              >
                Löschen
              </Button>
            }
          />
        </Section>

        {/* ── Info ── */}
        <Section title="Über die App">
          <Row label="App" description="SkillShare" />
          <Row label="Version" description="0.0.67" last />
        </Section>
      </Stack>
    </Box>
  );
}
