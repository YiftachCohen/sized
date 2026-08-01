/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/sized/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
