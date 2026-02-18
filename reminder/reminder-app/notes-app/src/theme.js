import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c5cff" },
    secondary: { main: "#5bdbff" },
    success: { main: "#3ddc97" },
    error: { main: "#ff4d6d" },
    background: {
      default: "#0b0f17",
      paper: "rgba(255,255,255,0.06)",
    },
    text: {
      primary: "rgba(255,255,255,0.92)",
      secondary: "rgba(255,255,255,0.66)",
    },
    divider: "rgba(255,255,255,0.12)",
  },

  shape: { borderRadius: 14 },

  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    h5: { fontWeight: 900, letterSpacing: "-0.02em" },
    h6: { fontWeight: 850, letterSpacing: "-0.01em" },
    button: { fontWeight: 800 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(1200px 800px at 20% 10%, rgba(124,92,255,0.18), transparent 55%)," +
            "radial-gradient(1000px 700px at 85% 20%, rgba(91,219,255,0.14), transparent 55%)",
          backgroundAttachment: "fixed",
        },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05))",
          backdropFilter: "blur(10px)",
          borderRadius: 18,
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          paddingTop: 10,
          paddingBottom: 10,
        },
        containedPrimary: {
          backgroundImage:
            "linear-gradient(180deg, rgba(124,92,255,1), rgba(124,92,255,0.72))",
          border: "1px solid rgba(124,92,255,0.45)",
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.18)",
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0,0,0,0.18)",
          borderRadius: 12,
        },
        notchedOutline: { borderColor: "rgba(255,255,255,0.14)" },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: "rgba(255,255,255,0.12)" } } },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 10,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
        },
        bar: { borderRadius: 999 },
      },
    },
  },
});
