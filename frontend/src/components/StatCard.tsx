import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export default function StatCard(props: {
  label: string;
  value: string;
  icon?: ReactNode;
  helper?: string;
}) {
  return (
    <Card>
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

