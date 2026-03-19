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
  FiHeart, FiMessageSquare, FiBookOpen, FiZap,
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

// ─── FloatingParticles ────────────────────────────────────────────────────────

function FloatingParticles({ count = 42 }) {
  const particles = useMemo(() => {
    const colors = [
      "rgba(124,92,255,0.7)",
      "rgba(38,198,255,0.6)",
      "rgba(255,107,219,0.55)",
    ];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${((i / count) * 100 + Math.sin(i * 2.4) * 5).toFixed(2)}%`,
      size: 1.8 + Math.abs(Math.sin(i * 1.8)) * 3.5,
      delay: (i * 0.31) % 10,
      duration: 6 + (i % 9) * 1.1,
      drift: Math.sin(i * 2.1) * 80,
      color: colors[i % colors.length],
    }));
  }, [count]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: "-8px",
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── PageSpotlight ────────────────────────────────────────────────────────────

function PageSpotlight() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  useEffect(() => {
    function onMove(e) { setPos({ x: e.clientX, y: e.clientY }); }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(124,92,255,0.05), transparent 65%)`,
    }} />
  );
}

// ─── useTypewriter ────────────────────────────────────────────────────────────

function useTypewriter(phrases, typingSpeed = 72, pauseMs = 2200, deletingSpeed = 32) {
  const [text, setText]         = useState("");
  const [idx, setIdx]           = useState(0);
  const [charIdx, setCharIdx]   = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[idx];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => { setText(current.slice(0, charIdx + 1)); setCharIdx((c) => c + 1); }, typingSpeed + Math.random() * 28);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => { setText(current.slice(0, charIdx - 1)); setCharIdx((c) => c - 1); }, deletingSpeed);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) { setDeleting(false); setIdx((i) => (i + 1) % phrases.length); }
  }, [charIdx, deleting, idx]); // eslint-disable-line

  return text;
}

// ─── useCountUp ──────────────────────────────────────────────────────────────

function useCountUp(end, isActive, duration = 1600) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!isActive || end === null) return;
    let startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, end, duration]);
  return count;
}

// ─── useTilt ─────────────────────────────────────────────────────────────────

function useTilt(strength = 9) {
  const ref = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      setTiltStyle({
        transform: `perspective(700px) rotateX(${(y - 0.5) * -strength}deg) rotateY(${(x - 0.5) * strength}deg) scale(1.03)`,
        transition: "transform 80ms linear",
        "--shine-x": `${x * 100}%`,
        "--shine-y": `${y * 100}%`,
      });
    }
    function onLeave() {
      setTiltStyle({ transform: "perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)", transition: "transform 500ms var(--ease-out)" });
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [strength]);
  return [ref, tiltStyle];
}

// ─── useMagnet ───────────────────────────────────────────────────────────────

function useMagnet(strength = 0.42) {
  const ref    = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const cur    = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function animate() {
      cur.current.x += (target.current.x - cur.current.x) * 0.14;
      cur.current.y += (target.current.y - cur.current.y) * 0.14;
      setOffset({ x: cur.current.x, y: cur.current.y });
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    function onMove(e) {
      const r = el.getBoundingClientRect();
      target.current = { x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength };
    }
    function onLeave() { target.current = { x: 0, y: 0 }; }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [strength]);
  return [ref, offset];
}

// ─── useScramble ─────────────────────────────────────────────────────────────

function useScramble(text, isActive) {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (!isActive) return;
    let frame = 0;
    const total = text.length * 2.8;
    let raf;
    function update() {
      frame++;
      const revealed = Math.floor((frame / total) * text.length);
      setDisplay(text.split("").map((ch, i) => {
        if (i < revealed || ch === " ") return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join(""));
      if (frame < total) raf = requestAnimationFrame(update);
      else setDisplay(text);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [isActive, text]); // eslint-disable-line
  return display;
}

// ─── useScrollReveal ─────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-scale");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
    );
    els.forEach((el) => io.observe(el));
    const steps = document.querySelector(".landing-steps");
    if (steps) {
      const stepsIO = new IntersectionObserver(([e]) => { if (e.isIntersecting) e.target.classList.add("steps-in"); }, { threshold: 0.2 });
      stepsIO.observe(steps);
      return () => { io.disconnect(); stepsIO.disconnect(); };
    }
    return () => io.disconnect();
  }, []);
}

// ─── TiltCard ────────────────────────────────────────────────────────────────

function TiltCard({ children, className, cardGlow, index }) {
  const [ref, tiltStyle] = useTilt(9);
  return (
    <div
      ref={ref}
      className={`landing-feature-item reveal stagger-${index + 1}`}
      style={{ "--card-glow": cardGlow, ...tiltStyle }}
    >
      <div className="tilt-shine" />
      {children}
    </div>
  );
}

// ─── ScrambleHeading ─────────────────────────────────────────────────────────

function ScrambleHeading({ plain, gradient, className }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const scrambled = useScramble(plain, active);
  return (
    <h2 ref={ref} className={className}>
      {scrambled}{" "}
      {gradient && <span className="gradient-text">{gradient}</span>}
    </h2>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ value, label, sub, index }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const match  = String(value).match(/^([\d.]+)(.*)/);
  const rawNum = match ? parseFloat(match[1].replace(/\./g, "")) : null;
  const suffix = match ? match[2] : "";
  const count  = useCountUp(rawNum, active);
  const formatted = rawNum !== null ? count.toLocaleString("de-AT") + suffix : value;
  return (
    <div ref={ref} className={`landing-stat-card reveal-scale stagger-${index + 1}`}>
      <div className="landing-stat-value">{formatted}</div>
      <div className="landing-stat-label">{label}</div>
      <div className="landing-stat-sub">{sub}</div>
    </div>
  );
}

// ─── MagneticButton ──────────────────────────────────────────────────────────

function MagneticButton({ children, style, onClick, wrapClass }) {
  const [ref, offset] = useMagnet(0.42);
  return (
    <div ref={ref} className={`login-google-btn-wrap${wrapClass ? " " + wrapClass : ""}`} style={style}>
      <button
        className="login-google-btn"
        onClick={onClick}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {children}
      </button>
    </div>
  );
}

// ─── PleaseLogin ──────────────────────────────────────────────────────────────

function PleaseLogin() {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const cursorRef    = useRef(null);

  useWebGLDistortion(canvasRef, containerRef);
  useScrollReveal();

  const tw = useTypewriter(["geteilt.", "entdeckt.", "gelernt.", "gemeinsam."]);

  // smooth custom cursor
  useEffect(() => {
    const container = containerRef.current;
    const cursorEl  = cursorRef.current;
    if (!container || !cursorEl) return;
    let raf;
    let cx = -100, cy = -100, tx = -100, ty = -100;
    function onMove(e) {
      const r = container.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      cursorEl.style.opacity = "1";
    }
    function onLeave() { cursorEl.style.opacity = "0"; }
    function animate() {
      raf = requestAnimationFrame(animate);
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
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
    { value: "4,9",     label: "Bewertung",       sub: "von 5,0 Sternen"     },
  ];

  const features = [
    { icon: <FiUpload />,        label: "PDFs hochladen",  desc: "Teile deine Mitschriften und Zusammenfassungen schnell mit der Community.",        bg: "rgba(124,92,255,.13)",  color: "#7c5cff" },
    { icon: <FiSearch />,        label: "Entdecken",       desc: "Suche nach Fächern, Themen oder Schlagwörtern – finde sofort passendes Material.", bg: "rgba(38,198,255,.11)",  color: "#26c6ff" },
    { icon: <FiMessageSquare />, label: "Gruppen-Chat",    desc: "Erstelle Lerngruppen, tausche dich aus und sende Dateien direkt in Echtzeit.",     bg: "rgba(61,220,151,.11)",  color: "#3ddc97" },
    { icon: <FiHeart />,         label: "Liken & Folgen",  desc: "Unterstütze andere mit Likes und folge Nutzern, die gute Inhalte teilen.",         bg: "rgba(255,107,138,.11)", color: "#ff6b8a" },
    { icon: <FiUsers />,         label: "Community",       desc: "Verbinde dich mit Mitschülern, füge Freunde hinzu und bau dein Lern-Netzwerk auf.",bg: "rgba(255,209,102,.11)", color: "#ffd166" },
    { icon: <FiBookOpen />,      label: "Alle Fächer",     desc: "Von Mathe bis Geschichte – SkillShare deckt alle Schulfächer ab.",                 bg: "rgba(180,125,255,.13)", color: "#b47dff" },
  ];

  const steps = [
    { num: "1", icon: <FiUpload />, title: "Notizen hochladen",  desc: "Exportiere deine Notizen als PDF und lade sie in Sekunden hoch.",                      bg: "rgba(124,92,255,.13)", accent: "var(--accent)"  },
    { num: "2", icon: <FiSearch />, title: "Entdecken & lernen", desc: "Durchsuche tausende PDFs deiner Mitschüler – sortiert nach Fach und Relevanz.",          bg: "rgba(38,198,255,.11)", accent: "var(--accent-2)" },
    { num: "3", icon: <FiZap />,    title: "Zusammen wachsen",   desc: "Tritt Lerngruppen bei, chatte mit anderen und hilf zurück – wer teilt, lernt doppelt.", bg: "rgba(61,220,151,.10)", accent: "#3ddc97"        },
  ];

  return (
    <div className="landing-page">
      <PageSpotlight />

      {/* ── HERO ── */}
      <section
        ref={containerRef}
        className="landing-hero landing-hero--webgl"
        style={{ position: "relative", cursor: "none", overflow: "hidden" }}
      >
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
        <FloatingParticles count={42} />

        <div ref={cursorRef} style={{
          position: "absolute", top: 0, left: 0, width: 30, height: 30,
          border: "1.5px solid rgba(124,92,255,0.95)", borderRadius: "50%",
          pointerEvents: "none", opacity: 0, transition: "opacity 0.2s",
          mixBlendMode: "screen", zIndex: 10,
        }} />

        <div className="landing-hero-inner page-content" style={{ position: "relative", zIndex: 2 }}>
          <div className="landing-badge hero-item">Kostenlos für Schüler &amp; Studenten</div>

          <h1 className="landing-tagline hero-item">
            <span className="word-reveal-wrap"><span className="word-reveal" style={{ animationDelay: "180ms" }}>Dein</span></span>{" "}
            <span className="word-reveal-wrap"><span className="word-reveal" style={{ animationDelay: "280ms" }}>Wissen,</span></span>
            <br />
            <span className="gradient-text">
              {tw || "\u00A0"}
              <span className="typewriter-cursor" />
            </span>
          </h1>

          <p className="landing-subtitle hero-item">
            SkillShare ist die Plattform, auf der Schüler ihre Notizen als PDFs teilen,
            voneinander lernen und in Gruppen zusammenarbeiten – alles an einem Ort.
          </p>

          <MagneticButton wrapClass="hero-item" onClick={() => signInWithPopup(auth, googleProvider)}>
            {GOOGLE_ICON}
            Mit Google anmelden
          </MagneticButton>

          <p className="login-legal hero-item">
            Durch die Anmeldung stimmst du den Nutzungsbedingungen zu.
          </p>

          <div className="landing-social-proof hero-item">
            <span>10.000+ Nutzer</span>
            <span className="landing-divider-v" />
            <span>4,9 / 5 Bewertung</span>
            <span className="landing-divider-v" />
            <span>5.000+ PDFs geteilt</span>
          </div>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-indicator-line" />
          <div className="scroll-indicator-dot" />
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="landing-rule" />
      <section className="landing-section" style={{ position: "relative" }}>
        <div className="landing-stat-grid">
          {stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <div className="landing-rule" />
      <section className="landing-section" style={{ position: "relative" }}>
        <div className="landing-section-header reveal">
          <p className="landing-eyebrow">Features</p>
          <ScrambleHeading className="landing-h2" plain="Alles, was du zum" gradient="Lernen brauchst" />
          <p className="landing-muted">Eine Plattform. Alle Tools. Gemacht für Schüler.</p>
        </div>
        <div className="landing-features-grid">
          {features.map(({ icon, label, desc, bg, color }, i) => (
            <TiltCard key={label} cardGlow={bg} index={i}>
              <div className="landing-feature-icon" style={{ background: bg, color }}>{icon}</div>
              <div className="landing-feature-title">{label}</div>
              <p className="landing-feature-desc">{desc}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <div className="landing-rule" />
      <section className="landing-section" style={{ position: "relative" }}>
        <div className="landing-section-header reveal">
          <p className="landing-eyebrow">Wie es funktioniert</p>
          <ScrambleHeading className="landing-h2" plain="In 3 Schritten zum" gradient="Lernerfolg" />
        </div>
        <div className="landing-steps">
          {steps.map(({ num, icon, title, desc, bg, accent }, i) => (
            <div key={num} className={`landing-step reveal stagger-${i + 1}`}>
              <div className="landing-step-icon" style={{ background: bg, border: `1px solid ${accent}40` }}>
                <span style={{ fontSize: 28, color: accent, display: "flex" }}>{icon}</span>
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
        <div className="landing-cta-box reveal">
          <ScrambleHeading className="landing-h2" plain="Bereit zum" gradient="Wissens-Teilen?" />
          <p className="landing-muted" style={{ margin: "10px auto 28px", maxWidth: 380 }}>
            Kein Abo, keine Kreditkarte – einfach mit Google anmelden und loslegen.
          </p>
          <MagneticButton style={{ margin: "0 auto" }} onClick={() => signInWithPopup(auth, googleProvider)}>
            {GOOGLE_ICON}
            Mit Google anmelden
          </MagneticButton>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <span>© 2025 SkillShare · Gemacht für Schüler</span>
        <span>v0.0.67</span>
      </footer>

    </div>
  );
}