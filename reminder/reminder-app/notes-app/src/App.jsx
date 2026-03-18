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
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const prevGroupsRef = useRef({});
  const debounceRef = useRef({});

  const nav = useNavigate();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

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

  useEffect(() => {
    if (!user?.uid) return;
    let initialized = false;
    const q = query(collection(db, "groups"), where("memberUids", "array-contains", user.uid));
    return onSnapshot(q, (snap) => {
      if (!initialized) {
        snap.docs.forEach((d) => { prevGroupsRef.current[d.id] = d.data(); });
        initialized = true;
        return;
      }
      snap.docChanges().forEach(({ type, doc }) => {
        if (type === "added") { prevGroupsRef.current[doc.id] = doc.data(); return; }
        if (type !== "modified") return;
        const g = doc.data();
        const prev = prevGroupsRef.current[doc.id];
        const newAt = g.lastMessageAt?.seconds ?? 0;
        const prevAt = prev?.lastMessageAt?.seconds ?? 0;
        if (newAt > prevAt && g.lastSenderUid && g.lastSenderUid !== user.uid) {
          prevGroupsRef.current[doc.id] = g;
          if (locationRef.current.startsWith("/groups")) return;
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
          <div className="header-row">
            <img src={logoFull} alt="Logo" style={{ width: 200, height: 50 }} />
            <div className="header-spacer" />
            <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
              <button className="btn-icon" onClick={toggleMode} aria-label="Theme wechseln">
                {mode === "dark" ? <FiSun /> : <FiMoon />}
              </button>
            </Tooltip>
            <Tooltip title="Menü">
              <button className="btn-icon" onClick={() => setDrawerOpen(true)} aria-label="Menü öffnen">
                <FiMenu />
              </button>
            </Tooltip>
          </div>

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

          {globalSnack && (
            <Snackbar
              open
              autoHideDuration={4000}
              message={globalSnack}
              onClose={() => setGlobalSnack("")}
            />
          )}

          <Drawer anchor="right" open={!!drawerOpen} onClose={() => setDrawerOpen(false)}>
            <div style={{ padding: 14, display: "grid", gap: 8, width: 280 }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Menü</div>
              {[
                { icon: <FiHome />, label: "Home", path: "/" },
                { icon: <FiSearch />, label: "Suchen", path: "/search" },
                { icon: <FiUpload />, label: "Upload", path: "/upload", accent: true },
                { icon: <FiUser />, label: "Profil", path: "/profile" },
                { icon: <FiUsers />, label: "Gruppen", path: "/groups" },
                { icon: <FiUsers />, label: "Benutzer", path: "/search?tab=users" },
                { icon: <FiSettings />, label: "Einstellungen", path: "/settings" },
              ].map(({ icon, label, path, accent }) => (
                <button
                  key={path}
                  className={`btn-icon${accent ? " btn-add" : ""}`}
                  style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
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
                  style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
                  onClick={() => { setDrawerOpen(false); signOut(auth); }}
                >
                  <FiLogOut />
                  <span style={{ fontWeight: 800 }}>Abmelden</span>
                </button>
              ) : (
                <button
                  className="btn-icon"
                  style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14 }}
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

// ─── WebGL Distortion Hook ────────────────────────────────────────────────────

function useWebGLDistortion(canvasRef, containerRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    let W, H, animId, t = 0, lastMove = 0;
    const mouse = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };
    const prev = { x: 0.5, y: 0.5 };
    let strength = 0, targetStrength = 0;

    function resize() {
      const r = container.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
    }

    const VERT = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() { v_uv = (a_pos + 1.0) * 0.5; gl_Position = vec4(a_pos, 0, 1); }
    `;

    const FRAG = `
      precision highp float;
      varying vec2 v_uv;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform float u_strength;
      uniform vec2 u_resolution;

      float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float a = rand(i), b = rand(i+vec2(1,0)), c = rand(i+vec2(0,1)), d = rand(i+vec2(1,1));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        vec2 d = (uv - u_mouse) * aspect;
        float dist = length(d);

        float radius = 0.25;
        float falloff = smoothstep(radius, 0.0, dist);
        float ripple = sin(dist * 20.0 - u_time * 5.0) * 0.5 + 0.5;
        float warp = falloff * falloff * u_strength * (1.0 + ripple * 0.25);

        vec2 dir = normalize(d + vec2(0.0001));
        vec2 displaced = uv + dir * warp * 0.07;
        displaced += dir * warp * 0.015 * sin(u_time * 3.0 + dist * 25.0);

        float n = noise(uv * 4.0 + u_time * 0.2) * 0.003;
        displaced += n;

        float aberr = warp * 0.014;
        vec2 uvR = displaced + dir * aberr;
        vec2 uvB = displaced - dir * aberr;

        float r = noise(uvR * 5.0 + vec2(0.1) + u_time * 0.14) * 0.14 + 0.07;
        float g = noise(displaced * 5.0 + u_time * 0.12) * 0.11 + 0.055;
        float b = noise(uvB * 5.0 + vec2(0.0, 0.1) + u_time * 0.10) * 0.17 + 0.09;

        vec3 col = vec3(r, g, b);

        float glow = falloff * falloff * 0.18;
        col += vec3(glow * 0.49, glow * 0.22, glow * 1.0);

        float vig = length((uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0));
        col *= 1.0 - smoothstep(0.5, 1.3, vig) * 0.4;

        col += sin(uv.y * u_resolution.y * 1.2) * 0.012 * (1.0 - falloff * 0.6);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function mkShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uMouse    = gl.getUniformLocation(prog, "u_mouse");
    const uTime     = gl.getUniformLocation(prog, "u_time");
    const uStrength = gl.getUniformLocation(prog, "u_strength");
    const uRes      = gl.getUniformLocation(prog, "u_resolution");

    function onMove(e) {
      const r = container.getBoundingClientRect();
      const cx = e.clientX ?? e.touches?.[0]?.clientX;
      const cy = e.clientY ?? e.touches?.[0]?.clientY;
      if (cx == null) return;
      const nx = (cx - r.left) / r.width;
      const ny = 1 - (cy - r.top) / r.height;
      target.x = nx; target.y = ny;
      const spd = Math.hypot(nx - prev.x, ny - prev.y);
      targetStrength = Math.min(spd * 20, 1.0);
      prev.x = nx; prev.y = ny;
      lastMove = Date.now();
    }

    function onLeave() { targetStrength = 0; }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("touchmove", onMove, { passive: true });
    container.addEventListener("mouseleave", onLeave);
    resize();
    window.addEventListener("resize", resize);

    function loop() {
      animId = requestAnimationFrame(loop);
      t += 0.016;
      mouse.x += (target.x - mouse.x) * 0.09;
      mouse.y += (target.y - mouse.y) * 0.09;
      if (Date.now() - lastMove > 250) targetStrength *= 0.92;
      strength += (targetStrength - strength) * 0.07;

      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uStrength, strength);
      gl.uniform2f(uRes, W, H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [canvasRef, containerRef]);
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

// ─── PleaseLogin ──────────────────────────────────────────────────────────────

function PleaseLogin() {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const cursorRef    = useRef(null);

  useWebGLDistortion(canvasRef, containerRef);

  // smooth custom cursor
  useEffect(() => {
    const container = containerRef.current;
    const cursorEl  = cursorRef.current;
    if (!container || !cursorEl) return;

    let raf;
    let cx = -100, cy = -100, tx = -100, ty = -100;

    function onMove(e) {
      const r = container.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      cursorEl.style.opacity = "1";
    }
    function onLeave() { cursorEl.style.opacity = "0"; }

    function animate() {
      raf = requestAnimationFrame(animate);
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      cursorEl.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    }

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const stats = [
    { value: "10.000+", label: "Aktive Nutzer",  sub: "Schüler & Studenten" },
    { value: "5.000+",  label: "PDFs geteilt",   sub: "Aus allen Fächern"   },
    { value: "150+",    label: "Schulen",         sub: "Österreich & DE"     },
    { value: "4.9 ★",  label: "Bewertung",       sub: "Durchschnitt"        },
  ];

  const features = [
    { icon: "📄", label: "PDFs hochladen",  desc: "Teile deine Mitschriften und Zusammenfassungen schnell mit der Community.",        bg: "rgba(124,92,255,.12)"  },
    { icon: "🔍", label: "Entdecken",       desc: "Suche nach Fächern, Themen oder Schlagwörtern – finde sofort passendes Material.", bg: "rgba(38,198,255,.10)"  },
    { icon: "💬", label: "Gruppen-Chat",    desc: "Erstelle Lerngruppen, tausche dich aus und sende Dateien direkt in Echtzeit.",     bg: "rgba(61,220,151,.10)"  },
    { icon: "❤️", label: "Liken & Folgen", desc: "Unterstütze andere mit Likes und folge Nutzern, die gute Inhalte teilen.",         bg: "rgba(255,107,138,.10)" },
    { icon: "👥", label: "Community",       desc: "Verbinde dich mit Mitschülern, füge Freunde hinzu und bau dein Lern-Netzwerk auf.",bg: "rgba(255,209,102,.10)" },
    { icon: "📚", label: "Alle Fächer",     desc: "Von Mathe bis Geschichte – SkillShare deckt alle Schulfächer ab.",                 bg: "rgba(180,125,255,.12)" },
  ];

  const steps = [
    { num: "1", emoji: "⬆️", title: "Notizen hochladen",  desc: "Exportiere deine Notizen als PDF und lade sie in Sekunden hoch.",                      bg: "rgba(124,92,255,.13)", accent: "var(--accent)"  },
    { num: "2", emoji: "🔎", title: "Entdecken & lernen", desc: "Durchsuche tausende PDFs deiner Mitschüler – sortiert nach Fach und Relevanz.",          bg: "rgba(38,198,255,.11)", accent: "var(--accent-2)" },
    { num: "3", emoji: "🎓", title: "Zusammen wachsen",   desc: "Tritt Lerngruppen bei, chatte mit anderen und hilf zurück – wer teilt, lernt doppelt.", bg: "rgba(61,220,151,.10)", accent: "#3ddc97"        },
  ];

  return (
    <div className="landing-page">

      {/* ── HERO mit WebGL Distortion ── */}
      <section
        ref={containerRef}
        className="landing-hero landing-hero--webgl"
        style={{ position: "relative", cursor: "none", overflow: "hidden" }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Custom cursor ring */}
        <div
          ref={cursorRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 28,
            height: 28,
            border: "1.5px solid rgba(124,92,255,0.9)",
            borderRadius: "50%",
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 0.2s",
            mixBlendMode: "screen",
            zIndex: 10,
          }}
        />

        <div className="landing-hero-inner page-content" style={{ position: "relative", zIndex: 2 }}>
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