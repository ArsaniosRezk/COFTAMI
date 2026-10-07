import js from "@eslint/js";
import globals from "globals";

/*
 Controlli automatici sul codice: npm run lint
 Trovano variabili non definite, import mancanti, codice irraggiungibile...
*/
export default [
  {
    ignores: ["node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["js/**/*.js", "management/**/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "test/**/*.mjs", "test-regole/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
