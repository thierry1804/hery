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
      // Manifest reel : sans lui, le lien <link rel="manifest"> d'index.html pointe dans le
      // vide (404) et Android/Chrome n'a rien a se mettre sous la dent pour l'installation.
      // iOS ignore ce fichier pour "Ajouter a l'ecran d'accueil" (ce sont les balises
      // apple-mobile-web-app-* d'index.html qui comptent la-bas) mais le garder correct
      // ne coute rien et beneficie aux autres plateformes.
      manifest: {
        name: 'HERY',
        short_name: 'HERY',
        description: 'HERY — suivi de musculation, 100% local et hors-ligne.',
        lang: 'fr',
        theme_color: '#131519',
        background_color: '#131519',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/icon-180.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        navigateFallback: 'index.html',
      },
    }),
    ...(process.env.VITE_HTTPS === '1' ? [basicSsl()] : []),
  ],
  server: {
    host: true,
  },
});
