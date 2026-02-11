import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";

import { FiLogIn, FiLogOut, FiMenu, FiGrid, FiSearch, FiUpload, FiUser, FiX } from "react-icons/fi";

import NotesAppFullscreen from "./NotesAppFullscreen.jsx";
import NotesSearchPage from "./NotesSearchPage.jsx";
import NotesUploadPage from "./NotesUploadPage.jsx";


import { FiHome } from "react-icons/fi";


import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);


  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!ready) return <div style={{ padding: 20 }}>Lade…</div>;

  const go = (path) => {
    setDrawerOpen(false);
    nav(path);
  };

  const MenuBtn = ({ active, icon, label, onClick }) => (
    <button
      className="btn-icon"
      onClick={onClick}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 14,
        opacity: active ? 1 : 0.92,
        borderColor: active ? "rgba(124, 92, 255, .35)" : undefined,
      }}
      aria-label={label}
    >
      {icon}
      <span style={{ fontWeight: 800 }}>{label}</span>
    </button>
  );

  return (
    <div className="app-wrapper">
      <div className="glass">
        {/* GLOBAL HEADER (immer sichtbar) */}
        <div className="header-row">
          <div style={{ fontWeight: 900, fontSize: 18 }}>Notes Library</div>
          <div className="header-spacer" />

          <Tooltip title="Menü">
            <button className="btn-icon" onClick={() => setDrawerOpen(true)} aria-label="Menü öffnen">
              <FiMenu />
            </button>
          </Tooltip>

          {user ? (
            <Tooltip title="Abmelden">
              <button className="btn-icon" onClick={() => signOut(auth)} aria-label="Abmelden">
                <FiLogOut />
              </button>
            </Tooltip>
          ) : (
            <Tooltip title="Anmelden">
              <button
                className="btn-icon"
                onClick={() => signInWithPopup(auth, googleProvider)}
                aria-label="Anmelden"
              >
                <FiLogIn />
              </button>
            </Tooltip>
          )}
        </div>

        {/* ROUTES */}
        <Routes>
          <Route path="/" element={user ? <NotesAppFullscreen user={user} /> : <PleaseLogin />} />
          <Route path="/search" element={user ? <NotesSearchPage user={user} /> : <PleaseLogin />} />
          <Route path="/upload" element={user ? <NotesUploadPage user={user} /> : <PleaseLogin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* GLOBAL DRAWER (Buttons only) */}
              <Drawer
  anchor="right"
  open={!!drawerOpen}
  onClose={() => setDrawerOpen(false)}
  PaperProps={{
    style: {
      width: 320,
      background: "rgba(255,255,255,.10)",
      backdropFilter: "blur(18px) saturate(140%)",
      WebkitBackdropFilter: "blur(18px) saturate(140%)",
      borderLeft: "1px solid rgba(255,255,255,.14)",
      color: "inherit",
    },
  }}
>
  <div style={{ padding: 14, display: "grid", gap: 10 }}>
    <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Menü</div>

<button
    className="btn-icon"
    style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
    onClick={() => {
      nav("/");
      setDrawerOpen(false);
    }}
  >
    <FiHome />
    <span style={{ fontWeight: 800 }}>Home</span>
  </button>

    <button
      className="btn-icon"
      style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
      onClick={() => { setDrawerOpen(false); nav("/search"); }}
    >
      <FiSearch />
      <span style={{ fontWeight: 800 }}>Suchen</span>
    </button>

    <button
      className="btn-icon btn-add"
      style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
      onClick={() => { setDrawerOpen(false); nav("/upload"); }}
    >
      <FiUpload />
      <span style={{ fontWeight: 800 }}>Upload</span>
    </button>

    <button
      className="btn-icon"
      style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14, opacity: 0.55 }}
      onClick={() => { setDrawerOpen(false); nav("/profile"); }}
      disabled
    >
      <FiUser />
      <span style={{ fontWeight: 800 }}>Profil (später)</span>
    </button>
  </div>
</Drawer>
      </div>
    </div>
  );
}

function PleaseLogin() {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Bitte anmelden</div>
      <div style={{ opacity: 0.75, lineHeight: 1.4 }}>
        Du musst eingeloggt sein, um PDFs hochzuladen und zu löschen.
      </div>
    </div>
  );
}
