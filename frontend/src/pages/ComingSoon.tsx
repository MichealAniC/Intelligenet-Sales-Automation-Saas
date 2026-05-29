import { Card, CardContent, Stack, Typography } from "@mui/material";

export default function ComingSoon(props: { title: string; description?: string }) {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {props.title}
          </Typography>
          <Typography color="text.secondary">
            {props.description ?? "This module is planned for the next iteration."}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

