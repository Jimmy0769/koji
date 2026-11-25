import vue from "eslint-plugin-vue";
import stylistic from "@stylistic/eslint-plugin";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/**", "dist/**", "src-tauri/**"] },
  ...vue.configs["flat/base"],
  prettier,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.vue"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "function" },
        { blankLine: "always", prev: "function", next: "*" },
        { blankLine: "always", prev: "*", next: "export" },
        { blankLine: "always", prev: "export", next: "*" },
      ],
      "@stylistic/lines-between-class-members": ["error", "always"],
    },
  },
];
