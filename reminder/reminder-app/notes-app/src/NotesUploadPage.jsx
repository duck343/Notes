import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiUpload } from "react-icons/fi";
import { uploadNotePdf } from "./notesRepo";
import { auth } from "./firebase";
import AppShell from "./components/AppShell";
import { SUBJECTS } from "./notesShared.js";

export default function NotesUploadPage({ user }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const fileLabel = useMemo(() => {
    if (!file) return "Noch keine Datei ausgewählt";
    const kb = Math.round(file.size / 1024);
    return `${file.name} • ${kb.toLocaleString("de-DE")} KB`;
  }, [file]);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setStatus("");

    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      e.target.value = "";
      setStatus("❌ Nur PDF-Dateien sind erlaubt.");
      return;
    }
    setFile(f);
  }

  async function onSubmit(e) {
if (!user?.uid) {
  setStatus("❌ Du bist nicht eingeloggt.");
  return;
}

    e.preventDefault();
    setStatus("");

    if (!file) return setStatus("❌ Bitte zuerst ein PDF auswählen.");

    try {
      setBusy(true);
      setProgress(0);

     await uploadNotePdf({
  file,
  title,
  subject,
  user,
  ownerName: auth.currentUser?.displayName || user.displayName || "Anonym",
  collectionName: "notes",
  onProgress: setProgress,
});


      setStatus("Upload fertig.");
      setFile(null);
      setTitle("");
      setSubject(SUBJECTS[0]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err?.message || "Upload fehlgeschlagen"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Notes">
      <Box sx={{ width: "100%", mx: "auto" }}>
        <Card>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
              <Box>
                <Typography variant="h5">PDF hochladen</Typography>
                <Typography variant="body2" color="text.secondary">
                  PDF hochladen — Thumbnails werden als Bilder geladen (schnell). PDF erst beim Öffnen.
                </Typography>
              </Box>

              <Divider />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Titel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />

                <FormControl disabled={busy}>
                  <InputLabel id="subject-label">Fach</InputLabel>
                  <Select
                    labelId="subject-label"
                    label="Fach"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    {SUBJECTS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                />

                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<FiUpload />}
                  onClick={pickFile}
                  disabled={busy}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  PDF auswählen
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1, minWidth: 0 }}
                  noWrap
                  title={fileLabel}
                >
                  {fileLabel}
                </Typography>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy || !file}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Hochladen
                </Button>
              </Stack>

              {busy && (
                <Box>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="text.secondary">
                    Upload: {progress}%
                  </Typography>
                </Box>
              )}

              {status && (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {status}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </AppShell>
  );
}
