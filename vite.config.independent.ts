import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      "@shared": path.resolve(__dirname, "shared"),
      "@lib": path.resolve(__dirname, "client/src/lib"),
      "@components": path.resolve(__dirname, "client/src/components"),
      "@hooks": path.resolve(__dirname, "client/src/hooks"),
      "@pages": path.resolve(__dirname, "client/src/pages")
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});