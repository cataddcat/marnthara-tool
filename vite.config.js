// D:/_Projects/AOE_Vite/vite.config.js
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    base: "./", // CRITICAL: Set base path for correct asset loading on GitHub Pages.

    plugins: [
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.ico",
                "apple-touch-icon-180x180.png",
                "pwa-icon.svg",
            ],
            manifest: {
                name: "Marnthara Tool - โปรแกรมใบเสนอราคาม่าน",
                short_name: "ม่านธารา",
                description:
                    "แอปพลิเคชันสำหรับคำนวณราคาและออกใบเสนอราคาผ้าม่านและของตกแต่ง",
                theme_color: "#6750a4",
                background_color: "#f2f0ef",
                display: "standalone",
                orientation: "portrait-primary",
                start_url: "./",
                scope: "./",
                lang: "th",
                icons: [
                    {
                        src: "pwa-64x64.png",
                        sizes: "64x64",
                        type: "image/png",
                    },
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "maskable-icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                runtimeCaching: [
                    {
                        // Google Fonts stylesheets — refresh occasionally
                        urlPattern:
                            /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "StaleWhileRevalidate",
                        options: {
                            cacheName: "google-fonts-stylesheets",
                        },
                    },
                    {
                        // Google Fonts webfont files — cache aggressively
                        urlPattern:
                            /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-webfonts",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                    {
                        // Phosphor Icons CDN — versioned, cache aggressively
                        urlPattern:
                            /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "jsdelivr-cdn",
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 30,
                            },
                        },
                    },
                ],
            },
        }),
    ],

    // --- VITEST CONFIGURATION ---
    test: {
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/tests/**"],
    },
});
