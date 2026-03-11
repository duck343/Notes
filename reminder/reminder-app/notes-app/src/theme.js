import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode) {
  const dark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: "#7c5cff" },
      secondary: { main: "#5bdbff" },
      success: { main: "#3ddc97" },
      error: { main: "#ff4d6d" },
      background: {
        default: dark ? "#0b0c10" : "#f4f5fb",
        paper: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.88)",
      },
      text: {
        primary: dark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.87)",
        secondary: dark ? "rgba(255,255,255,0.58)" : "rgba(0,0,0,0.54)",
      },
      divider: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    },

    shape: { borderRadius: 14 },

    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h5: { fontWeight: 900, letterSpacing: "-0.02em" },
      h6: { fontWeight: 850, letterSpacing: "-0.01em" },
      button: { fontWeight: 700, letterSpacing: "-0.005em" },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: { body: {} }, // let index.css handle background
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: dark
              ? "1px solid rgba(255,255,255,0.10)"
              : "1px solid rgba(0,0,0,0.07)",
            background: dark
              ? "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))"
              : "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(255,255,255,0.82))",
            backdropFilter: "blur(14px) saturate(160%)",
            WebkitBackdropFilter: "blur(14px) saturate(160%)",
            borderRadius: 18,
            transition:
              "transform 260ms cubic-bezier(.2,.8,.2,1), box-shadow 260ms cubic-bezier(.2,.8,.2,1), border-color 260ms",
            "&:hover": {
              transform: "translateY(-5px) scale(1.005)",
              boxShadow: dark
                ? "0 24px 64px rgba(0,0,0,0.50)"
                : "0 24px 64px rgba(0,0,0,0.11)",
              borderColor: "rgba(124,92,255,0.28)",
            },
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 12,
            paddingTop: 9,
            paddingBottom: 9,
            transition:
              "transform 150ms cubic-bezier(.2,.8,.2,1), box-shadow 150ms, background 150ms",
            "&:active": { transform: "scale(0.97)" },
          },
          containedPrimary: {
            background: "linear-gradient(155deg, #8b6cff, #7c5cff)",
            border: "1px solid rgba(124,92,255,0.40)",
            "&:hover": {
              background: "linear-gradient(155deg, #9a7cff, #8b6cff)",
              boxShadow: "0 8px 28px rgba(124,92,255,0.38)",
            },
          },
          outlined: {
            borderColor: dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
            "&:hover": {
              borderColor: "rgba(124,92,255,0.40)",
              background: "rgba(124,92,255,0.06)",
            },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            transition:
              "transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms",
            "&:hover": { transform: "scale(1.12)" },
            "&:active": { transform: "scale(0.92)" },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: dark
              ? "rgba(0,0,0,0.18)"
              : "rgba(255,255,255,0.75)",
            borderRadius: 12,
            transition: "box-shadow 180ms, background 180ms",
            "&.Mui-focused": {
              boxShadow: "0 0 0 4px rgba(124,92,255,0.18)",
            },
          },
          notchedOutline: {
            borderColor: dark
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.12)",
          },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: {
            background: "linear-gradient(135deg, #7c5cff, #5bdbff)",
            fontWeight: 700,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            transition: "transform 150ms cubic-bezier(.2,.8,.2,1)",
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: "3px 3px 0 0" },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: dark
              ? "rgba(12,12,20,0.88)"
              : "rgba(248,248,255,0.92)",
            backdropFilter: "blur(26px) saturate(160%)",
            WebkitBackdropFilter: "blur(26px) saturate(160%)",
            borderLeft: dark
              ? "1px solid rgba(255,255,255,0.10)"
              : "1px solid rgba(0,0,0,0.08)",
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 10,
            borderRadius: 999,
            backgroundColor: dark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          },
          bar: { borderRadius: 999 },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: dark
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.08)",
          },
        },
      },
    },
  });
}
