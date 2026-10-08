import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#070A10",
        panel: "#0E1420",
        panel2: "#141C2E",
        hairline: "#1F2B42",
        text: "#F1F5F9",
        muted: "#94A3B8",
        cyan: {
          DEFAULT: "#22D3EE",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          glow: "rgba(34, 211, 238, 0.15)",
        },
        emerald: {
          DEFAULT: "#10B981",
          400: "#34D399",
          500: "#10B981",
          glow: "rgba(16, 185, 129, 0.15)",
        },
        violet: {
          DEFAULT: "#8B5CF6",
          400: "#A78BFA",
          500: "#8B5CF6",
          glow: "rgba(139, 92, 246, 0.15)",
        },
        amber: {
          DEFAULT: "#F59E0B",
          400: "#FBBF24",
          500: "#F59E0B",
        },
        danger: {
          DEFAULT: "#EF4444",
          400: "#F87171",
        },
        ok: "#10B981",
      },
      fontFamily: {
        head: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 3s ease-in-out infinite alternate",
        "scanline": "scanline 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glow: {
          "0%": { opacity: "0.4", filter: "drop-shadow(0 0 15px rgba(34, 211, 238, 0.3))" },
          "100%": { opacity: "0.8", filter: "drop-shadow(0 0 25px rgba(34, 211, 238, 0.6))" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
      backgroundImage: {
        "cyber-grid": "radial-gradient(rgba(34, 211, 238, 0.12) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
