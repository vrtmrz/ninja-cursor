import tsParser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import importAlias from "@dword-design/eslint-plugin-import-alias";
import { baseRules, ImportAliasRules, obsidianRules } from "./eslint.config.common.mjs";

export default defineConfig([
    globalIgnores([
        "**/build",
        "coverage",
        "**/main.js",
        "version-bump.mjs",
        "package.json",
        "**/*.json",
        "esbuild.config.mjs",
        "*.config.mjs",
        "eslint.config.mjs",
        "eslint.config.common.mjs",
        "utilsdeno/**",
        "node_modules/**"
    ]),
    ...obsidianmd.configs.recommended,
    importAlias.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: { ...globals.browser },
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
                rootDir: "./",
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
        rules: {
            ...baseRules,
            ...obsidianRules,
            ...ImportAliasRules("."),
        },
    }
]);
