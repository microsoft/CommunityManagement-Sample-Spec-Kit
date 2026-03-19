import StyleDictionary from "style-dictionary";

// Custom format: dark theme overrides that reuse the light variable names
// e.g. color.dark.surface.background -> --color-surface-background
StyleDictionary.registerFormat({
  name: "css/dark-overrides",
  format: ({ dictionary }) => {
    const header = `/**\n * Do not edit directly, this file was auto-generated.\n */\n`;
    const lines = dictionary.allTokens.map((token) => {
      // Strip "dark" from the path: color.dark.surface.background -> color.surface.background
      const lightPath = token.path.filter((p) => p !== "dark");
      const varName = `--${lightPath.join("-")}`;
      const val = token.$value ?? token.value ?? token.original?.$value ?? token.original?.value;
      return `  ${varName}: ${val};`;
    });
    return `${header}\n[data-theme="dark"] {\n${lines.join("\n")}\n}\n`;
  },
});

const sd = new StyleDictionary({
  source: ["src/**/*.tokens.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "build/css/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          filter: (token) => !token.path.includes("dark"),
          options: { outputReferences: true },
        },
        {
          destination: "tokens-dark.css",
          format: "css/dark-overrides",
          filter: (token) => token.path.includes("dark"),
        },
      ],
    },
    ts: {
      transformGroup: "js",
      buildPath: "build/ts/",
      files: [
        {
          destination: "tokens.ts",
          format: "javascript/es6",
        },
      ],
    },
    tailwind: {
      transformGroup: "js",
      buildPath: "build/tailwind/",
      files: [
        {
          destination: "tokens.ts",
          format: "javascript/es6",
        },
      ],
    },
    swift: {
      transformGroup: "ios-swift",
      buildPath: "build/swift/",
      files: [
        {
          destination: "DesignTokens.swift",
          format: "ios-swift/class.swift",
          options: { className: "DesignTokens" },
        },
      ],
    },
    kotlin: {
      transformGroup: "compose",
      buildPath: "build/kotlin/",
      files: [
        {
          destination: "DesignTokens.kt",
          format: "compose/object",
          options: { className: "DesignTokens" },
        },
      ],
    },
  },
});

export default sd;
