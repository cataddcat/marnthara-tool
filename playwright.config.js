// @ts-check
// 1. เปลี่ยนจาก require เป็น import
import { defineConfig } from "@playwright/test";

// 2. เปลี่ยนจาก module.exports เป็น export default
export default defineConfig({
    // URL พื้นฐานที่ Dev Server ของ VITE รันอยู่ (npm run dev)
    use: {
        baseURL: "http://localhost:5173",
        headless: true, // รันในโหมด Headless
        trace: "on-first-retry",
    },

    // Directory ที่เก็บไฟล์ Test ของคุณ
    testDir: "./tests",

    // Setup สำหรับ Dev Server
    webServer: {
        // คำสั่งที่จะใช้รัน Dev Server ก่อนเริ่ม Test
        command: "npm run dev",
        url: "http://localhost:5173",
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
    },

    // Workers/Concurrency
    workers: process.env.CI ? 1 : undefined,
});
