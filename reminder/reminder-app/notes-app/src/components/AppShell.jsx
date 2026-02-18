import React from "react";
import { AppBar, Box, Container, Toolbar, Typography } from "@mui/material";

export default function AppShell({ title = "Notes", right, children }) {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "rgba(11,15,23,0.55)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {right}
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}
