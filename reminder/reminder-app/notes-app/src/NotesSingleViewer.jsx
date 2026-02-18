import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { FiArrowLeft, FiDownload } from "react-icons/fi";

import { getNoteById, getStorageUrl } from "./notesRepo";

export default function NotesSingleViewer() {
  const nav = useNavigate();
  const { id } = useParams();

  const [note, setNote] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setNote(null);
        setPdfUrl("");

        if (!id) throw new Error("Keine Note-ID in URL.");

        const n = await getNoteById(id, "notes");
        if (!alive) return;

        if (!n) throw new Error("Note nicht gefunden.");
        if (!n.filePath) throw new Error("Note hat keinen filePath.");

        setNote(n);

        const url = await getStorageUrl(n.filePath);
        if (!alive) return;
        setPdfUrl(url);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError(e.message || "Fehler beim Laden");
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<FiArrowLeft />} onClick={() => nav(-1)}>
          Zurück
        </Button>
        <Button
          variant="contained"
          startIcon={<FiDownload />}
          disabled={!pdfUrl}
          onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
        >
          Download
        </Button>
      </Stack>

      {error ? (
        <Card>
          <CardContent>
            <Typography color="error.main" fontWeight={800}>
              {error}
            </Typography>
          </CardContent>
        </Card>
      ) : !note ? (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={20} />
              <Typography color="text.secondary">Lade…</Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={900}>
                {note.title || "Ohne Titel"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={note.subject || "Sonstiges"} />
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              width: "100%",
              height: "78vh",
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "rgba(0,0,0,0.18)",
            }}
          >
            {!pdfUrl ? (
              <Stack sx={{ height: "100%" }} alignItems="center" justifyContent="center" spacing={1.5}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">PDF wird geladen…</Typography>
              </Stack>
            ) : (
              <iframe title="PDF Viewer" src={pdfUrl} style={{ width: "100%", height: "100%", border: 0 }} />
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
}
