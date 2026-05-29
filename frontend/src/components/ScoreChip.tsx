import { Chip } from "@mui/material";
import type { LeadCategory } from "@/api/types";

const colors: Record<LeadCategory, { label: string; color: "warning" | "error" | "info" }> = {
  Hot: { label: "Hot", color: "error" },
  Warm: { label: "Warm", color: "warning" },
  Cold: { label: "Cold", color: "info" },
};

export default function ScoreChip(props: { category: LeadCategory; label?: string }) {
  const c = colors[props.category];
  return (
    <Chip
      size="small"
      color={c.color}
      label={props.label ?? c.label}
      sx={{ fontWeight: 700 }}
    />
  );
}

