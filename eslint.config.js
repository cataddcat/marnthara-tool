// eslint.config.js
// [REVISED] Merged .eslintrc.cjs into the new flat config system.
// This single file now manages JS, JSDoc, Prettier, JSON, CSS, and Markdown linting.

import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import babelParser from "@babel/eslint-parser";

// Plugins
import pluginJsdoc from "eslint-plugin-jsdoc";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier"; // Disables conflicting rules
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";

export default defineConfig([
    // 1. Global Ignores
    {
        ignores: [
            "dist/**/*", // Ignore built files
            "node_modules/**/*", // Ignore dependencies
            "package-lock.json",
            "test-results/**/*", // Ignore test results
            "playwright-report/**/*", // Ignore Playwright reports
            "src/styles_Backup/**/*", // Ignore CSS backup files
        ],
    },

    // 2. JavaScript, JSDoc, and Prettier Configuration
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            // Use Babel parser (from old .eslintrc.cjs)
            parser: babelParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                requireConfigFile: false,
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            // Added jsdoc and prettier plugins
            jsdoc: pluginJsdoc,
            prettier: pluginPrettier,
        },
        rules: {
            // Merged rules from both configs
            ...js.configs.recommended.rules,
            ...pluginJsdoc.configs.recommended.rules,

            // Rules from .eslintrc.cjs
            "prettier/prettier": "warn",
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "jsdoc/require-param-type": "off",
            "jsdoc/require-returns-type": "off",
        },
        settings: {
            // JSDoc settings from .eslintrc.cjs
            jsdoc: {
                mode: "typescript",
            },
        },
    },

    // 3. JSON Configurations (from original file)
    {
        files: ["**/*.json"],
        plugins: { json },
        language: "json/json",
        extends: ["json/recommended"],
    },
    {
        files: ["**/*.jsonc"],
        plugins: { json },
        language: "json/jsonc",
        extends: ["json/recommended"],
    },
    {
        files: ["**/*.json5"],
        plugins: { json },
        language: "json/json5",
        extends: ["json/recommended"],
    },

    // 4. Markdown Configuration (from original file)
    {
        files: ["**/*.md"],
        plugins: { markdown },
        language: "markdown/gfm",
        extends: ["markdown/recommended"],
    },

    // 5. CSS Configuration (from original file)
    {
        files: ["**/*.css"],
        plugins: { css },
        language: "css/css",
        extends: ["css/recommended"],
        rules: {
            // CSS custom properties (var(--token)) are not recognized by this plugin
            "css/no-invalid-properties": "off",
            "css/use-baseline": "off",
        },
    },

    // 6. Prettier Config (Disables conflicting rules)
    // This MUST be the last item in the array.
    configPrettier,
]);
