import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import Snackbar from "@mui/material/Snackbar";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

import {
  FiLogIn, FiLogOut, FiMenu, FiSearch, FiUpload,
  FiUser, FiUsers, FiHome, FiSun, FiMoon, FiSettings,
} from "react-icons/fi";

import { auth, googleProvider } from "./firebase";
import { createAppTheme } from "./theme";

import NotesAppFullscreen from "./NotesAppFullscreen.jsx";
import NotesSearchPage from "./NotesSearchPage.jsx";
import NotesUploadPage from "./NotesUploadPage.jsx";
import NotesSingleViewer from "./NotesSingleViewer.jsx";
import NotesProfilePage from "./NotesProfilePage.jsx";
import NotesPublicProfilePage from "./NotesPublicProfilePage.jsx";
import GroupsPage from "./GroupsPage.jsx";
import GroupChat from "./GroupChat.jsx";
import NotesSettingsPage from "./NotesSettingsPage.jsx";

import "./styles/global.css";
import logoFull from "./assets/logoFull.png";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState(
    () => localStorage.getItem("theme-mode") || "dark"
  );
  const [globalSnack, setGlobalSnack] = useState("");
  const location        = useLocation();
  const locationRef     = useRef(location.pathname);
  const prevGroupsRef   = useRef({});
  const debounceRef     = useRef({});

  const nav   = useNavigate();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // keep locationRef in sync so the notification listener can check it without re-subscribing
  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

  // Sync body class + localStorage
  useEffect(() => {
    document.body.classList.toggle("dark", mode === "dark");
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) await u.getIdToken();
      setUser(u);
      setReady(true);
    });
  }, []);

  // ── Global group-message pop-up notifications ──────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    let initialized = false;
    const q = query(collection(db, "groups"), where("memberUids", "array-contains", user.uid));
    return onSnapshot(q, (snap) => {
      if (!initialized) {
        // record initial state — no notifications on first load
        snap.docs.forEach((d) => { prevGroupsRef.current[d.id] = d.data(); });
        initialized = true;
        return;
      }
      snap.docChanges().forEach(({ type, doc }) => {
        if (type === "added") { prevGroupsRef.current[doc.id] = doc.data(); return; }
        if (type !== "modified") return;
        const g    = doc.data();
        const prev = prevGroupsRef.current[doc.id];
        const newAt  = g.lastMessageAt?.seconds ?? 0;
        const prevAt = prev?.lastMessageAt?.seconds ?? 0;
        if (newAt > prevAt && g.lastSenderUid && g.lastSenderUid !== user.uid) {
          prevGroupsRef.current[doc.id] = g;
          if (locationRef.current.startsWith("/groups")) return; // already watching
          const now = Date.now();
          if (now - (debounceRef.current[doc.id] ?? 0) > 3000) {
            debounceRef.current[doc.id] = now;
            if (localStorage.getItem("group-notifs") !== "false") {
              setGlobalSnack(`💬 ${g.lastSenderName}: ${g.lastMessage} (${g.name})`);
            }
          }
        } else {
          prevGroupsRef.current[doc.id] = g;
        }
      });
    });
  }, [user?.uid]);

  if (!ready) return null;

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-wrapper">
        <div className="glass">
          {/* HEADER */}
          <div className="header-row">
            <img src={logoFull} alt="Logo" style={{ width: 200, height: 50 }} />
            <div className="header-spacer" />

            <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
              <button
                className="btn-icon"
                onClick={toggleMode}
                aria-label="Theme wechseln"
              >
                {mode === "dark" ? <FiSun /> : <FiMoon />}
              </button>
            </Tooltip>

            <Tooltip title="Menü">
              <button
                className="btn-icon"
                onClick={() => setDrawerOpen(true)}
                aria-label="Menü öffnen"
              >
                <FiMenu />
              </button>
            </Tooltip>
          </div>

          {/* ROUTES */}
          <div className="glass-content">
          <Routes>
            <Route path="/" element={user ? <NotesAppFullscreen user={user} /> : <PleaseLogin />} />
            <Route path="/search" element={user ? <NotesSearchPage user={user} /> : <PleaseLogin />} />
            <Route path="/upload" element={user ? <NotesUploadPage user={user} /> : <PleaseLogin />} />
            <Route path="/notes/:id" element={user ? <NotesSingleViewer user={user} /> : <PleaseLogin />} />
            <Route path="/profile" element={user ? <NotesProfilePage user={user} /> : <PleaseLogin />} />
            <Route path="/user/:uid" element={user ? <NotesPublicProfilePage user={user} /> : <PleaseLogin />} />
            <Route path="/groups" element={user ? <GroupsPage user={user} /> : <PleaseLogin />} />
            <Route path="/groups/:gid" element={user ? <GroupChat user={user} /> : <PleaseLogin />} />
            <Route path="/settings" element={user ? <NotesSettingsPage user={user} mode={mode} setMode={setMode} /> : <PleaseLogin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>

          {/* DRAWER */}
          {/* global snackbar (e.g. group messages) */}
          {globalSnack && (
            <Snackbar
              open
              autoHideDuration={4000}
              message={globalSnack}
              onClose={() => setGlobalSnack("")}
            />
          )}
          <Drawer
            anchor="right"
            open={!!drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <div style={{ padding: 14, display: "grid", gap: 8, width: 280 }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                Menü
              </div>

              {[
                { icon: <FiHome />, label: "Home", path: "/" },
                { icon: <FiSearch />, label: "Suchen", path: "/search" },
                { icon: <FiUpload />, label: "Upload", path: "/upload", accent: true },
                { icon: <FiUser />, label: "Profil", path: "/profile" },
                { icon: <FiUsers />, label: "Gruppen", path: "/groups" },
                { icon: <FiSettings />, label: "Einstellungen", path: "/settings" },
              ].map(({ icon, label, path, accent }) => (
                <button
                  key={path}
                  className={`btn-icon${accent ? " btn-add" : ""}`}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                  }}
                  onClick={() => { setDrawerOpen(false); nav(path); }}
                >
                  {icon}
                  <span style={{ fontWeight: 800 }}>{label}</span>
                </button>
              ))}

              <div style={{ borderTop: "1px solid var(--field-border)", margin: "4px 0" }} />

              {user ? (
                <button
                  className="btn-icon"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                  }}
                  onClick={() => { setDrawerOpen(false); signOut(auth); }}
                >
                  <FiLogOut />
                  <span style={{ fontWeight: 800 }}>Abmelden</span>
                </button>
              ) : (
                <button
                  className="btn-icon"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                  }}
                  onClick={() => signInWithPopup(auth, googleProvider)}
                >
                  <FiLogIn />
                  <span style={{ fontWeight: 800 }}>Anmelden</span>
                </button>
              )}
            </div>
          </Drawer>
        </div>
      </div>
    </ThemeProvider>
  );
}

function PleaseLogin() {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
        Bitte anmelden
      </div>
      <div style={{ opacity: 0.65, lineHeight: 1.5 }}>
        Du musst eingeloggt sein, um PDFs hochzuladen und zu löschen.
      </div>
    </div>
  );
}
