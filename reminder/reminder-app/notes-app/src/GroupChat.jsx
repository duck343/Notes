import React, { useEffect, useRef, useState } from "react";
import {
  Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, Popover,
  Skeleton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiSend, FiUsers, FiSmile, FiUserPlus, FiLogOut, FiCheck } from "react-icons/fi";
import {
  getGroupById, listenGroupMessages, sendGroupMessage, toggleReaction,
  leaveGroup, addMembersToGroup,
} from "./groupsRepo";
import { getStorageUrl, getFriends, searchUsersByName } from "./notesRepo";
import {
  collection, getDocs, orderBy, query, where, limit,
} from "firebase/firestore";
import { db } from "./firebase";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function GroupChat({ user }) {
  const { gid }    = useParams();
  const nav        = useNavigate();

  const [group, setGroup]     = useState(null);
  const [messages, setMessages] = useState(null); // null = loading
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);

  // PDF picker
  const [pdfOpen, setPdfOpen]     = useState(false);
  const [myPdfs, setMyPdfs]       = useState([]);
  const [loadingPdfs, setLoading] = useState(false);

  // Reaction popover
  const [rxPopover, setRxPopover] = useState({ anchor: null, msgId: null });

  // Add members dialog
  const [addOpen, setAddOpen]       = useState(false);
  const [friends, setFriends]       = useState([]);
  const [addQ, setAddQ]             = useState("");
  const [addResults, setAddResults] = useState([]);
  const [addPicked, setAddPicked]   = useState([]);
  const [addSearching, setAddSearching] = useState(false);
  const [adding, setAdding]         = useState(false);
  const addTimer                    = useRef(null);

  // Leave
  const [leaving, setLeaving] = useState(false);

  const bottomRef = useRef(null);
  const prevLen   = useRef(0);

  // load group meta
  useEffect(() => {
    if (!gid) return;
    getGroupById(gid).then(setGroup).catch(console.error);
  }, [gid]);

  // realtime messages
  useEffect(() => {
    if (!gid) return;
    return listenGroupMessages(gid, (msgs) => {
      setMessages(msgs);
    });
  }, [gid]);

  // auto-scroll only when NEW messages arrive
  useEffect(() => {
    if (!messages) return;
    if (messages.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLen.current = messages.length;
  }, [messages]);

  // load friends once
  useEffect(() => {
    if (!user?.uid) return;
    getFriends(user.uid).then(setFriends).catch(console.error);
  }, [user?.uid]);

  // add-member search debounce
  useEffect(() => {
    clearTimeout(addTimer.current);
    if (!addQ.trim()) { setAddResults([]); return; }
    setAddSearching(true);
    addTimer.current = setTimeout(async () => {
      try {
        const res = await searchUsersByName(addQ);
        const existingUids = new Set(group?.memberUids || []);
        setAddResults(res.filter((u) => u.uid !== user.uid && !existingUids.has(u.uid)));
      } catch (e) { console.error(e); }
      finally { setAddSearching(false); }
    }, 380);
  }, [addQ, user?.uid, group?.memberUids]);

  function toggleAddPick(u) {
    setAddPicked((p) => p.some((m) => m.uid === u.uid) ? p.filter((m) => m.uid !== u.uid) : [...p, u]);
  }

  async function handleAddMembers() {
    if (!addPicked.length || !gid) return;
    setAdding(true);
    try {
      await addMembersToGroup(gid, addPicked.map((m) => ({ uid: m.uid, displayName: m.displayName, photoURL: m.photoURL })));
      setAddOpen(false); setAddPicked([]); setAddQ("");
      // refresh group data
      getGroupById(gid).then(setGroup).catch(console.error);
    } catch (e) { console.error(e); }
    finally { setAdding(false); }
  }

  async function handleLeave() {
    if (!window.confirm("Gruppe wirklich verlassen?")) return;
    setLeaving(true);
    try {
      await leaveGroup(gid, user.uid);
      nav("/groups");
    } catch (e) { console.error(e); setLeaving(false); }
  }

  // load user's PDFs
  async function openPdfPicker() {
    setPdfOpen(true);
    if (myPdfs.length) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "notes"),
        where("ownerUid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(30),
      ));
      setMyPdfs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSend() {
    if (!text.trim() || sending || !gid) return;
    const t = text.trim();
    setText("");
    setSending(true);
    try {
      await sendGroupMessage(gid, {
        senderUid:   user.uid,
        senderName:  user.displayName || "Anonym",
        senderPhoto: user.photoURL    || null,
        type: "text", text: t,
      });
    } catch (e) { console.error(e); setText(t); }
    finally { setSending(false); }
  }

  async function handleSendPdf(note) {
    setPdfOpen(false);
    if (!gid) return;
    try {
      await sendGroupMessage(gid, {
        senderUid:   user.uid,
        senderName:  user.displayName || "Anonym",
        senderPhoto: user.photoURL    || null,
        type: "pdf",
        pdfPath:  note.filePath,
        pdfTitle: note.title || "Dokument",
        pdfId:    note.id,
      });
    } catch (e) { console.error(e); }
  }

  async function handleReaction(msgId, emoji) {
    setRxPopover({ anchor: null, msgId: null });
    if (!gid || !user?.uid) return;
    try { await toggleReaction(gid, msgId, user.uid, emoji); }
    catch (e) { console.error(e); }
  }

  const memberCount = (group?.memberUids || []).length;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <Stack
        direction="row" alignItems="center" spacing={1.5}
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tooltip title="Zurück">
          <IconButton size="small" onClick={() => nav("/groups")}>
            <FiArrowLeft />
          </IconButton>
        </Tooltip>
        <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
          <FiUsers size={16} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>{group?.name || "…"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {memberCount} Mitglied{memberCount !== 1 ? "er" : ""}
          </Typography>
        </Box>
        <Tooltip title="Mitglieder hinzufügen">
          <IconButton size="small" onClick={() => { setAddOpen(true); setAddPicked([]); setAddQ(""); }}>
            <FiUserPlus />
          </IconButton>
        </Tooltip>
        <Tooltip title="Gruppe verlassen">
          <IconButton size="small" onClick={handleLeave} disabled={leaving} color="error">
            {leaving ? <CircularProgress size={16} /> : <FiLogOut />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Messages ── */}
      <Box sx={{ flex: 1, overflow: "auto", px: { xs: 1.5, sm: 2.5 }, py: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {messages === null && (
          <Stack spacing={1} sx={{ pt: 1 }}>
            {[80, 60, 90, 50].map((w, i) => (
              <Skeleton key={i} variant="rounded" height={38} sx={{ width: `${w}%`, alignSelf: i % 2 ? "flex-end" : "flex-start" }} />
            ))}
          </Stack>
        )}

        {messages?.length === 0 && (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
            <Stack alignItems="center" spacing={1}>
              <FiUsers size={40} />
              <Typography fontWeight={600}>Noch keine Nachrichten</Typography>
            </Stack>
          </Box>
        )}

        {messages?.map((msg) => {
          const isOwn = msg.senderUid === user.uid;
          const rxEntries = Object.entries(msg.reactions || {})
            .filter(([, uids]) => Object.keys(uids).length > 0);

          return (
            <Box
              key={msg.id}
              sx={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}
            >
              {/* sender name */}
              {!isOwn && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1, mb: 0.3 }}>
                  {msg.senderName}
                </Typography>
              )}

              {/* bubble row */}
              <Stack direction="row" alignItems="flex-end" gap={0.5}
                sx={{ flexDirection: isOwn ? "row-reverse" : "row" }}
              >
                {/* avatar for others */}
                {!isOwn && (
                  <Avatar
                    src={msg.senderPhoto || undefined}
                    sx={{ width: 28, height: 28, fontSize: 12, mb: 0.25, flexShrink: 0 }}
                  >
                    {(msg.senderName || "?")[0].toUpperCase()}
                  </Avatar>
                )}

                {/* bubble */}
                <Box sx={{
                  maxWidth: { xs: "82%", sm: "62%" },
                  px: 1.75, py: 1,
                  bgcolor: isOwn ? "primary.main" : "background.paper",
                  color: isOwn ? "#fff" : "text.primary",
                  borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                  border: 1,
                  borderColor: isOwn ? "transparent" : "divider",
                  transition: "transform 160ms cubic-bezier(.2,.8,.2,1)",
                  "&:hover": { transform: "scale(1.015)" },
                  wordBreak: "break-word",
                }}>
                  {msg.type === "text" && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {msg.text}
                    </Typography>
                  )}
                  {msg.type === "pdf" && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: "pointer" }}
                      onClick={async () => {
                        try { window.open(await getStorageUrl(msg.pdfPath), "_blank", "noopener"); }
                        catch (e) { console.error(e); }
                      }}
                    >
                      <FiFileText size={18} style={{ flexShrink: 0 }} />
                      <Typography variant="body2" fontWeight={700} noWrap>{msg.pdfTitle || "PDF"}</Typography>
                    </Stack>
                  )}
                  {msg.type === "file" && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FiFileText size={18} style={{ flexShrink: 0 }} />
                      <Typography
                        component="a" href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                        variant="body2" fontWeight={700} noWrap
                        sx={{ color: "inherit", textDecoration: "underline" }}
                      >
                        {msg.fileName || "Datei"}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                {/* react button */}
                <IconButton
                  size="small"
                  onClick={(e) => setRxPopover({ anchor: e.currentTarget, msgId: msg.id })}
                  sx={{ opacity: 0.25, "&:hover": { opacity: 0.9 }, p: 0.3, transition: "opacity 150ms" }}
                >
                  <FiSmile size={14} />
                </IconButton>
              </Stack>

              {/* reactions */}
              {rxEntries.length > 0 && (
                <Stack direction="row" gap={0.5} flexWrap="wrap"
                  sx={{ mt: 0.4, ml: isOwn ? 0 : 4.5, mr: isOwn ? 0.5 : 0 }}
                >
                  {rxEntries.map(([emoji, uids]) => {
                    const count   = Object.keys(uids).length;
                    const reacted = !!uids[user.uid];
                    return (
                      <Chip
                        key={emoji}
                        label={`${emoji} ${count}`}
                        size="small"
                        variant={reacted ? "filled" : "outlined"}
                        color={reacted ? "primary" : "default"}
                        onClick={() => handleReaction(msg.id, emoji)}
                        sx={{ height: 22, fontSize: 12, cursor: "pointer",
                          transition: "transform 120ms", "&:hover": { transform: "scale(1.1)" } }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* ── Input bar ── */}
      <Box sx={{
        px: { xs: 1.5, sm: 2 }, py: 1.25,
        borderTop: 1, borderColor: "divider", flexShrink: 0,
        backdropFilter: "blur(10px)",
      }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <Tooltip title="PDF senden">
            <IconButton size="small" onClick={openPdfPicker} sx={{ mb: 0.5 }}>
              <FiFileText />
            </IconButton>
          </Tooltip>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Nachricht…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Tooltip title="Senden (Enter)">
            <span>
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                sx={{ mb: 0.5 }}
              >
                {sending ? <CircularProgress size={18} /> : <FiSend />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Reaction Popover ── */}
      <Popover
        open={!!rxPopover.anchor}
        anchorEl={rxPopover.anchor}
        onClose={() => setRxPopover({ anchor: null, msgId: null })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ sx: { borderRadius: 4, p: 0.5 } }}
      >
        <Stack direction="row">
          {EMOJIS.map((e) => (
            <IconButton key={e} size="small"
              onClick={() => handleReaction(rxPopover.msgId, e)}
              sx={{ fontSize: 20, transition: "transform 120ms", "&:hover": { transform: "scale(1.35)" } }}
            >
              {e}
            </IconButton>
          ))}
        </Stack>
      </Popover>

      {/* ── Add Members Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 0 }}>Mitglieder hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label="Suchen"
              value={addQ}
              onChange={(e) => setAddQ(e.target.value)}
              fullWidth autoFocus
              placeholder="Name eingeben…"
              InputProps={{
                endAdornment: addSearching ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null,
              }}
            />

            {/* Friends section (when no search query) */}
            {!addQ.trim() && (() => {
              const existingUids = new Set(group?.memberUids || []);
              const notYetIn = friends.filter((f) => !existingUids.has(f.uid));
              if (!notYetIn.length) return null;
              return (
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 0.5 }}>
                    Freunde
                  </Typography>
                  {notYetIn.map((u) => {
                    const isPicked = addPicked.some((m) => m.uid === u.uid);
                    return (
                      <Box key={u.uid} onClick={() => toggleAddPick(u)} sx={{
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
              );
            })()}

            {/* Search results */}
            {addResults.length > 0 && (
              <Stack spacing={0.5}>
                {addResults.map((u) => {
                  const isPicked = addPicked.some((m) => m.uid === u.uid);
                  return (
                    <Box key={u.uid} onClick={() => toggleAddPick(u)} sx={{
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

            {addPicked.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {addPicked.map((m) => (
                  <Chip key={m.uid} label={m.displayName} size="small"
                    onDelete={() => toggleAddPick(m)} color="primary" variant="outlined" />
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleAddMembers}
            disabled={!addPicked.length || adding} sx={{ minWidth: 100 }}>
            {adding ? <CircularProgress size={18} color="inherit" /> : "Hinzufügen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PDF Picker Dialog ── */}
      <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>PDF senden</DialogTitle>
        <Divider />
        <DialogContent>
          {loadingPdfs ? (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          ) : myPdfs.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              Keine eigenen PDFs vorhanden.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ pt: 1 }}>
              {myPdfs.map((n) => (
                <Box key={n.id} onClick={() => handleSendPdf(n)} sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  px: 2, py: 1.25, borderRadius: 2, cursor: "pointer",
                  border: 1, borderColor: "divider",
                  transition: "background 150ms, border-color 150ms",
                  "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                }}>
                  <FiFileText size={20} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{n.title || "Ohne Titel"}</Typography>
                    <Typography variant="caption" color="text.secondary">{n.subject || "Sonstiges"}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 2 }}>
          <Button onClick={() => setPdfOpen(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
