import React, { useEffect, useRef, useState } from "react";
import {
  Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiPlus, FiUsers } from "react-icons/fi";
import { createGroup, listenUserGroups } from "./groupsRepo";
import { searchUsersByName, getFriends } from "./notesRepo";

export default function GroupsPage({ user }) {
  const nav = useNavigate();

  // groups
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);

  // create dialog
  const [open, setOpen]             = useState(false);
  const [name, setName]             = useState("");
  const [memberQ, setMemberQ]       = useState("");
  const [results, setResults]       = useState([]);
  const [picked, setPicked]         = useState([]);
  const [searching, setSearching]   = useState(false);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState("");
  const [friends, setFriends]       = useState([]);
  const searchTimer                 = useRef(null);

  // load friends once
  useEffect(() => {
    if (!user?.uid) return;
    getFriends(user.uid).then(setFriends).catch(console.error);
  }, [user?.uid]);

  // realtime group list
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsub = listenUserGroups(user.uid, (gs) => {
      setGroups(gs);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // member search debounce
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!memberQ.trim()) { setResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchUsersByName(memberQ);
        setResults(res.filter((u) => u.uid !== user.uid));
      } catch (e) { console.error(e); }
      finally { setSearching(false); }
    }, 380);
  }, [memberQ, user.uid]);

  function openCreate() {
    setOpen(true); setName(""); setPicked([]); setMemberQ(""); setResults([]); setError("");
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Gruppenname darf nicht leer sein."); return; }
    setCreating(true); setError("");
    try {
      const id = await createGroup(
        name.trim(),
        picked.map((m) => m.uid),
        user.uid,
        user.displayName || "Anonym",
        user.photoURL || null,
      );
      setOpen(false);
      nav(`/groups/${id}`);
    } catch (e) {
      console.error(e);
      setError("Erstellen fehlgeschlagen. Bitte erneut versuchen.");
    } finally { setCreating(false); }
  }

  function togglePick(u) {
    setPicked((p) => p.some((m) => m.uid === u.uid) ? p.filter((m) => m.uid !== u.uid) : [...p, u]);
  }

  const fmt = (g) => {
    if (g.lastMessage && g.lastSenderName)
      return `${g.lastSenderName}: ${g.lastMessage}`;
    return `${(g.memberUids || []).length} Mitglieder`;
  };

  return (
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Stack direction="row" alignItems="center">
          <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Gruppen</Typography>
          <Button variant="contained" startIcon={<FiPlus />} onClick={openCreate} sx={{ borderRadius: 3 }}>
            Neue Gruppe
          </Button>
        </Stack>

        {/* List */}
        {loading && <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>}
        {!loading && groups.length === 0 && (
          <Box sx={{
            textAlign: "center", py: 8,
            border: "1px dashed", borderColor: "divider", borderRadius: 4,
          }}>
            <FiUsers size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <Typography color="text.secondary" fontWeight={600}>Noch keine Gruppen</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Erstelle eine Gruppe und lade Freunde ein.
            </Typography>
            <Button variant="outlined" onClick={openCreate} sx={{ mt: 2, borderRadius: 3 }}>
              Erste Gruppe erstellen
            </Button>
          </Box>
        )}

        <Stack spacing={1.5}>
          {groups.map((g) => (
            <Card key={g.id} sx={{ cursor: "pointer" }} onClick={() => nav(`/groups/${g.id}`)}>
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "primary.main", width: 46, height: 46 }}>
                    <FiUsers size={20} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>{g.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {fmt(g)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>

      {/* ── Create Group Dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 0 }}>Neue Gruppe</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label="Gruppenname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              fullWidth autoFocus
              error={!!error && !name.trim()}
            />

            <TextField
              label="Mitglieder suchen"
              value={memberQ}
              onChange={(e) => setMemberQ(e.target.value)}
              fullWidth
              placeholder="Name eingeben…"
              InputProps={{
                endAdornment: searching ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null,
              }}
            />

            {/* Friends suggestion (when search is empty) */}
            {!memberQ.trim() && friends.length > 0 && (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 0.5 }}>
                  Freunde
                </Typography>
                {friends.filter((f) => f.uid !== user.uid).map((u) => {
                  const isPicked = picked.some((m) => m.uid === u.uid);
                  return (
                    <Box key={u.uid} onClick={() => togglePick(u)} sx={{
                      display: "flex", alignItems: "center", gap: 1.5,
                      px: 1.5, py: 0.75, borderRadius: 2, cursor: "pointer",
                      bgcolor: isPicked ? "primary.main" : "action.hover",
                      color: isPicked ? "#fff" : "text.primary",
                      transition: "background 150ms",
                    }}>
                      <Avatar src={u.photoURL || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                        {(u.displayName || "?")[0].toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{u.displayName}</Typography>
                      {isPicked && <FiCheck size={14} />}
                    </Box>
                  );
                })}
              </Stack>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <Stack spacing={0.75}>
                {results.map((u) => {
                  const isPicked = picked.some((m) => m.uid === u.uid);
                  return (
                    <Box
                      key={u.uid}
                      onClick={() => togglePick(u)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        px: 1.5, py: 1, borderRadius: 2, cursor: "pointer",
                        bgcolor: isPicked ? "primary.main" : "action.hover",
                        color: isPicked ? "#fff" : "text.primary",
                        transition: "background 150ms",
                      }}
                    >
                      <Avatar src={u.photoURL || undefined} sx={{ width: 30, height: 30, fontSize: 13 }}>
                        {(u.displayName || "?")[0].toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                        {u.displayName}
                      </Typography>
                      {isPicked && <FiCheck size={16} />}
                    </Box>
                  );
                })}
              </Stack>
            )}

            {/* Selected chips */}
            {picked.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {picked.map((m) => (
                  <Chip
                    key={m.uid}
                    label={m.displayName}
                    size="small"
                    onDelete={() => togglePick(m)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}

            {error && <Typography color="error" variant="body2">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2 }}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            {creating ? <CircularProgress size={18} color="inherit" /> : "Erstellen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
