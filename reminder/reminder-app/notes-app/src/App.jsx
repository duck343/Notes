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
import NotesSingleViewer from "./NotesSingleViewer.jsx";
import NotesProfilePage from "./NotesProfilePage.jsx";
import NotesPublicProfilePage from "./NotesPublicProfilePage.jsx";

import { FiHome } from "react-icons/fi";


import "./styles/global.css";

import logoFull from "./assets/logoFull.png";


export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);


  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) await u.getIdToken();
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!ready) return <div style={{ padding: 20 }}>Lade…</div>;

  const go = (path) => {
    setDrawerOpen(false);
    nav(path);
  };

  

  return (
    <div className="app-wrapper">
      <div className="glass">
        {/* GLOBAL HEADER (immer sichtbar) */}
        <div className="header-row">
          <img src={logoFull} alt="Logo" style={{ width: 200, height: 50 }} />
          <div className="header-spacer" />
          <Tooltip title="Menü">
            <button className="btn-icon" onClick={() => setDrawerOpen(true)} aria-label="Menü öffnen">
              <FiMenu />
            </button>
          </Tooltip>

          
        </div>

        <Routes>
  <Route path="/" element={user ? <NotesAppFullscreen user={user} /> : <PleaseLogin />} />
  <Route path="/search" element={user ? <NotesSearchPage user={user} /> : <PleaseLogin />} />
  <Route path="/upload" element={user ? <NotesUploadPage user={user} /> : <PleaseLogin />} />
   <Route path="/notes/:id" element={user ? <NotesSingleViewer user={user} /> : <PleaseLogin />} />
  <Route path="/profile" element={user ? <NotesProfilePage user={user} /> : <PleaseLogin />} />
  <Route path="/user/:uid" element={user ? <NotesPublicProfilePage user={user} /> : <PleaseLogin />} />
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
      style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
      onClick={() => { setDrawerOpen(false); nav("/profile"); }}
    >
      <FiUser />
      <span style={{ fontWeight: 800 }}>Profil</span>
    </button>

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
