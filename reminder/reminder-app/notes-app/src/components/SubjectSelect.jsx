import React from "react";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

export default function SubjectSelect({
  value,
  onChange,
  subjects,
  includeAll = false,
  allLabel = "Alle Fächer",
  allValue = "Alle",
  disabled = false,
}) {
  return (
    <FormControl fullWidth>
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled}
        MenuProps={{
          PaperProps: {
  sx: {
    borderRadius: 3,
    overflow: "hidden",
    backdropFilter: "blur(18px) saturate(140%)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "2px solid rgba(255, 255, 255, 0.01)",
  },
},

         MenuListProps: {
    sx: {
      padding: 0,
      "& .MuiMenuItem-root": {
        fontFamily: "inherit",
        fontSize: "15px",
        fontWeight: 600,
        letterSpacing: "0.2px",
      },
    },
  },
}}
        sx={{
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--field-bg)",
  color: "inherit",
  "&:hover": { backgroundColor: "var(--field-bg-hover)" },

  "& .MuiSelect-select": {
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "0.2px",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--field-border)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--field-border)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(125, 92, 255, 0.27)",
    borderWidth: "4px",
  },
  "&.Mui-focused": {
    boxShadow: "0 0 0 4px var(--field-ring)",
  },

  /* Pfeil */
  "& .MuiSelect-icon": {
    opacity: 0.75,
  },
}}

      >
        {includeAll && <MenuItem value={allValue}>{allLabel}</MenuItem>}
        {subjects.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
