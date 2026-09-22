import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  // Base relative: build deployable dans n'importe quel sous-dossier sans config serveur.
  base: './',
  // Par defaut le dev tourne en HTTP simple: un certificat auto-signe casse l'enregistrement
  // du Service Worker (SecurityError sur le fetch de sw.js), meme quand la page elle-meme se charge.
  // Pour tester Wake Lock (API qui exige un contexte securise) depuis un telephone sur le reseau
  // local, lancer `npm run dev:https` a la place : certificat auto-signe genere a la volee via
  // basicSsl (accepter l'avertissement une fois sur le telephone). Le SW ne s'enregistrera pas
  // dans ce mode, seul le HTTP reste fiable pour tester l'installation PWA/offline.
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        navigateFallback: 'index.html',
      },
    }),
    ...(process.env.VITE_HTTPS === '1' ? [basicSsl()] : []),
  ],
  server: {
    host: true,
  },
});
