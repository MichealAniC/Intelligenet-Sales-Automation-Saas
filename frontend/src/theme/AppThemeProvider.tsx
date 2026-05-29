import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import type { PropsWithChildren } from "react";
import { theme } from "@/theme/theme";

export default function AppThemeProvider(props: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {props.children}
    </ThemeProvider>
  );
}

