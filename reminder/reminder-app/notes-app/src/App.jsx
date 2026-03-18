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

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

function PleaseLogin() {
  const stats = [
    { value: "10.000+", label: "Aktive Nutzer",  sub: "Schüler & Studenten" },
    { value: "5.000+",  label: "PDFs geteilt",   sub: "Aus allen Fächern"   },
    { value: "150+",    label: "Schulen",         sub: "Österreich & DE"     },
    { value: "4.9 ★",  label: "Bewertung",       sub: "Durchschnitt"        },
  ];

  const features = [
    { icon: "📄", label: "PDFs hochladen",  desc: "Teile deine Mitschriften und Zusammenfassungen schnell mit der Community.",          bg: "rgba(124,92,255,.12)"  },
    { icon: "🔍", label: "Entdecken",       desc: "Suche nach Fächern, Themen oder Schlagwörtern – finde sofort passendes Material.",   bg: "rgba(38,198,255,.10)"  },
    { icon: "💬", label: "Gruppen-Chat",    desc: "Erstelle Lerngruppen, tausche dich aus und sende Dateien direkt in Echtzeit.",       bg: "rgba(61,220,151,.10)"  },
    { icon: "❤️", label: "Liken & Folgen", desc: "Unterstütze andere mit Likes und folge Nutzern, die gute Inhalte teilen.",           bg: "rgba(255,107,138,.10)" },
    { icon: "👥", label: "Community",       desc: "Verbinde dich mit Mitschülern, füge Freunde hinzu und bau dein Lern-Netzwerk auf.", bg: "rgba(255,209,102,.10)" },
    { icon: "📚", label: "Alle Fächer",     desc: "Von Mathe bis Geschichte – SkillShare deckt alle Schulfächer ab.",                   bg: "rgba(180,125,255,.12)" },
  ];

  const steps = [
    { num: "1", emoji: "⬆️", title: "Notizen hochladen",  desc: "Exportiere deine Notizen als PDF und lade sie in Sekunden hoch.",                             bg: "rgba(124,92,255,.13)", accent: "var(--accent)"  },
    { num: "2", emoji: "🔎", title: "Entdecken & lernen", desc: "Durchsuche tausende PDFs deiner Mitschüler – sortiert nach Fach und Relevanz.",               bg: "rgba(38,198,255,.11)", accent: "var(--accent-2)" },
    { num: "3", emoji: "🎓", title: "Zusammen wachsen",   desc: "Tritt Lerngruppen bei, chatte mit anderen und hilf zurück – wer teilt, lernt doppelt.",        bg: "rgba(61,220,151,.10)", accent: "#3ddc97"        },
  ];

  return (
    <div className="landing-page">

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner page-content">
          <div className="landing-badge">✨ Kostenlos für Schüler &amp; Studenten</div>

          <h1 className="landing-tagline">
            Dein Wissen.<br />
            <span className="gradient-text">Geteilt. Entdeckt. Gelernt.</span>
          </h1>

          <p className="landing-subtitle">
            SkillShare ist die Plattform, auf der Schüler ihre Notizen als PDFs teilen,
            voneinander lernen und in Gruppen zusammenarbeiten – alles an einem Ort.
          </p>

          <button
            className="login-google-btn"
            onClick={() => signInWithPopup(auth, googleProvider)}
          >
            {GOOGLE_ICON}
            Mit Google anmelden
          </button>

          <p className="login-legal">
            Durch die Anmeldung stimmst du den Nutzungsbedingungen zu.
          </p>

          <div className="landing-social-proof">
            <span>👥 10.000+ Nutzer</span>
            <span className="landing-divider-v" />
            <span>⭐ 4.9 Bewertung</span>
            <span className="landing-divider-v" />
            <span>5.000+ PDFs geteilt</span>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="landing-rule" />
      <section className="landing-section">
        <div className="landing-stat-grid">
          {stats.map((s) => (
            <div key={s.label} className="landing-stat-card">
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
              <div className="landing-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <div className="landing-rule" />
      <section className="landing-section">
        <div className="landing-section-header">
          <p className="landing-eyebrow">Features</p>
          <h2 className="landing-h2">
            Alles, was du zum <span className="gradient-text">Lernen brauchst</span>
          </h2>
          <p className="landing-muted">Eine Plattform. Alle Tools. Gemacht für Schüler.</p>
        </div>
        <div className="landing-features-grid">
          {features.map(({ icon, label, desc, bg }) => (
            <div key={label} className="landing-feature-item">
              <div className="landing-feature-icon" style={{ background: bg }}>{icon}</div>
              <div className="landing-feature-title">{label}</div>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <div className="landing-rule" />
      <section className="landing-section">
        <div className="landing-section-header">
          <p className="landing-eyebrow">Wie es funktioniert</p>
          <h2 className="landing-h2">
            In 3 Schritten zum <span className="gradient-text">Lernerfolg</span>
          </h2>
        </div>
        <div className="landing-steps">
          {steps.map(({ num, emoji, title, desc, bg, accent }) => (
            <div key={num} className="landing-step">
              <div className="landing-step-icon" style={{ background: bg, border: `1px solid ${accent}40` }}>
                <span style={{ fontSize: 30 }}>{emoji}</span>
                <div className="landing-step-badge" style={{ background: accent }}>{num}</div>
              </div>
              <div className="landing-step-title">{title}</div>
              <p className="landing-step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-section landing-section--last">
        <div className="landing-cta-box">
          <h2 className="landing-h2">
            Bereit zum <span className="gradient-text">Wissens-Teilen?</span>
          </h2>
          <p className="landing-muted" style={{ margin: "10px auto 28px", maxWidth: 380 }}>
            Kein Abo, keine Kreditkarte – einfach mit Google anmelden und loslegen.
          </p>
          <button
            className="login-google-btn"
            style={{ margin: "0 auto" }}
            onClick={() => signInWithPopup(auth, googleProvider)}
          >
            {GOOGLE_ICON}
            Mit Google anmelden
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <span>© 2025 SkillShare · Made with 💜</span>
        <span>v0.0.67</span>
      </footer>

    </div>
  );
}
