import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/g4f': {
        target: 'http://72.60.232.20:1337',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/g4f/, ''),
        secure: false,
      },
      '/api/openrouter': {
        target: 'https://openrouter.ai/api/v1/chat/completions',
        changeOrigin: true,
        rewrite: (path) => '',
        secure: false,
      },
      '/api/hf': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hf/, ''),
        secure: false,
      },
      '/api': {
        target: 'http://127.0.0.1:4141',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
