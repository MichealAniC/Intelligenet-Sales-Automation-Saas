import { defineConfig, loadEnv } from "vite";
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import fs from "node:fs";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const envPath = path.join(process.cwd(), ".env");
  const fileApiBase =
    fs.existsSync(envPath)
      ? (fs.readFileSync(envPath, "utf8").match(/^\s*VITE_API_BASE_URL\s*=\s*(.+)\s*$/m)?.[1] ??
          "")
      : "";
  const apiBase = ((fileApiBase || env.VITE_API_BASE_URL) ?? "http://127.0.0.1:8002/api/v1").trim();
  const apiOrigin = apiBase.replace(/\/api\/v1\/?$/, "");

  return {
    build: {
      sourcemap: "hidden",
    },
    server: {
      proxy: {
        "/api/v1": {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: ["react-dev-locator"],
        },
      }),
      traeBadgePlugin({
        variant: "dark",
        position: "bottom-right",
        prodOnly: true,
        clickable: true,
        clickUrl: "https://www.trae.ai/solo?showJoin=1",
        autoTheme: true,
        autoThemeTarget: "#root",
      }),
      tsconfigPaths(),
    ],
  };
});
