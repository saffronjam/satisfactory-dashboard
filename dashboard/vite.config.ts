import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// ----------------------------------------------------------------------

const PORT = 3039;

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(process.env.VITE_BUILD_VERSION || "localbuild"),
  },
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), "node_modules/$1"),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), "src/$1"),
      },
    ],
  },
  server: { port: PORT, host: true, fs: { cachedChecks: false } },
  preview: { port: PORT, host: true },
});
