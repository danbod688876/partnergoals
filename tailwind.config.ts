import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fdfbf7",
          100: "#faf6ee",
          200: "#f3ebd9",
        },
        clay: {
          50: "#fbf4ef",
          100: "#f4e3d8",
          200: "#e6c3ac",
          300: "#d49f7e",
          400: "#c27e57",
          500: "#af6740",
          600: "#93532f",
          700: "#764128",
          800: "#5c3320",
          900: "#3f2416",
        },
        sage: {
          50: "#f3f6f1",
          100: "#e3ebde",
          200: "#c7d7bd",
          300: "#a4bd94",
          400: "#84a172",
          500: "#688456",
          600: "#516844",
          700: "#405236",
        },
        ink: {
          50: "#f7f6f4",
          100: "#e9e6e0",
          400: "#8a8377",
          600: "#5c564c",
          700: "#453f37",
          800: "#33302a",
          900: "#221f1a",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(51, 48, 42, 0.04), 0 4px 16px rgba(51, 48, 42, 0.06)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};

export default config;
