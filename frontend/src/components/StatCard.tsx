import { Card, CardContent, Stack, Typography, SxProps } from "@mui/material";
import type { ReactNode } from "react";

export default function StatCard(props: {
  label: string;
  value: string;
  icon?: ReactNode;
  helper?: string;
  onClick?: () => void;
  sx?: SxProps;
}) {
  return (
    <Card
      onClick={props.onClick}
      sx={{
        cursor: props.onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s ease-in-out",
        "&:hover": props.onClick ? { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" } : {},
        ...props.sx,
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {props.label}
            </Typography>
            <Typography variant="h4">{props.value}</Typography>
            {props.helper ? (
              <Typography variant="body2" color="text.secondary">
                {props.helper}
              </Typography>
            ) : null}
          </Stack>
          {props.icon ? <div>{props.icon}</div> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
