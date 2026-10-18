import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        registro: resolve(__dirname, 'registro.html'),
        forgot: resolve(__dirname, 'forgot-password.html'),
        reset: resolve(__dirname, 'reset-password.html'),
        admin: resolve(__dirname, 'admin.html'),
        directiva: resolve(__dirname, 'directiva.html'),
        conserje: resolve(__dirname, 'conserje.html'),
        copropietario: resolve(__dirname, 'copropietario.html')
      }
    }
  }
});