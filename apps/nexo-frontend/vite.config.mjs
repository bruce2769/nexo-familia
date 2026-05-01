import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    server: {
        port: 5173,
        strictPort: true,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
                cleanupOutdatedCaches: true,
                // Estrategia de caché para llamadas a la API (Network First → fallback cache)
                runtimeCaching: [
                    {
                        // Analytics → Cache First (cambia poco)
                        urlPattern: ({ url }) =>
                            url.pathname.includes('/api/v1/analytics/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'analytics-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 6, // 6 horas
                            },
                        },
                    },
                    {
                        // Tipos de escritos → Cache First (estático)
                        urlPattern: ({ url }) =>
                            url.pathname.includes('/api/v1/escritos/tipos'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'escritos-tipos-cache',
                            expiration: {
                                maxEntries: 5,
                                maxAgeSeconds: 60 * 60 * 24, // 24 horas
                            },
                        },
                    },
                    {
                        // Guías y recursos estáticos del backend → Stale While Revalidate
                        urlPattern: ({ url }) =>
                            url.pathname.includes('/api/v1/guias'),
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'guias-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24,
                            },
                        },
                    },
                    {
                        // Google Fonts
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: 'Nexo Familia',
                short_name: 'Nexo',
                description: 'Tu copiloto legal especializado en Derecho de Familia chileno.',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                version: '2.1',
                lang: 'es-CL',
                categories: ['legal', 'productivity'],
                icons: [
                    {
                        src: 'pwa-64x64.png',
                        sizes: '64x64',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
                shortcuts: [
                    {
                        name: 'Diagnóstico Legal',
                        url: '/?tab=diagnostico',
                        icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
                    },
                    {
                        name: 'Copiloto IA',
                        url: '/?tab=copiloto',
                        icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
                    },
                ],
            },
        }),
    ],
    esbuild: {
        loader: 'jsx',
        include: /.*\.(js|jsx)$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Separar vendors en chunk aparte para mejor cache hit rate
                manualChunks: {
                    'vendor-react':    ['react', 'react-dom'],
                    'vendor-firebase': ['firebase'],
                    'vendor-charts':   ['recharts'],
                    'vendor-motion':   ['framer-motion'],
                    'vendor-ui':       ['lucide-react', 'react-hot-toast'],
                },
            },
        },
    },
})
