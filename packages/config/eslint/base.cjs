module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: true,
    tsconfigRootDir: process.cwd(),
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", "node_modules", ".next", ".expo"],
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: false },
    ],
  },
};
