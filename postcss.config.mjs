// PostCSS configuration for Next/Vite + Tailwind
// Use the official PostCSS plugin package name so Next's PostCSS loader
// picks up the correct plugin (the Tailwind PostCSS plugin lives in
// `@tailwindcss/postcss`).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};

export default config;
