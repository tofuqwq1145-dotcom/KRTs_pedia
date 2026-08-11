import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        archive: {
          bg: "rgb(var(--archive-bg) / <alpha-value>)",
          paper: "rgb(var(--archive-paper) / <alpha-value>)",
          text: "rgb(var(--archive-text) / <alpha-value>)",
          muted: "rgb(var(--archive-muted) / <alpha-value>)",
          accent: "rgb(var(--archive-accent) / <alpha-value>)",
          border: "rgb(var(--archive-border) / <alpha-value>)",
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'serif'],
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
