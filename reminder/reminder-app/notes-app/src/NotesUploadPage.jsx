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
  const [dragging, setDragging] = useState(false);

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
    if (!f) { setFile(null); return; }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setFile(null); e.target.value = "";
      setStatus("Nur PDF-Dateien sind erlaubt.");
      return;
    }
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] || null;
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Nur PDF-Dateien sind erlaubt.");
      return;
    }
    setFile(f);
    setStatus("");
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

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                style={{ display: "none" }}
              />

              {/* Drop zone */}
              <Box
                onClick={pickFile}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                sx={{
                  border: "2px dashed",
                  borderColor: dragging ? "primary.main" : file ? "success.main" : "divider",
                  borderRadius: 3,
                  p: { xs: 3, sm: 4 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  cursor: busy ? "default" : "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                  backgroundColor: dragging
                    ? "rgba(124,92,255,0.06)"
                    : file
                    ? "rgba(46,213,115,0.04)"
                    : "transparent",
                  "&:hover": busy ? {} : {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(124,92,255,0.04)",
                  },
                  pointerEvents: busy ? "none" : "auto",
                  userSelect: "none",
                }}
              >
                <FiUpload
                  size={32}
                  style={{
                    opacity: dragging ? 1 : 0.4,
                    color: dragging ? "var(--accent)" : "inherit",
                    transition: "opacity 0.2s",
                  }}
                />
                {file ? (
                  <>
                    <Typography fontWeight={700} sx={{ color: "success.main" }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(file.size / 1024).toLocaleString("de-DE")} KB · Klicken zum Ändern
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography fontWeight={600}>
                      {dragging ? "Loslassen zum Hochladen" : "PDF hierher ziehen oder klicken"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Nur PDF-Dateien · max. 50 MB
                    </Typography>
                  </>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={busy || !file}
                startIcon={<FiUpload />}
                sx={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
              >
                Hochladen
              </Button>

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
