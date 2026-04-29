/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "eth-green": "#0f766e",
        "eth-yellow": "#0369a1",
        "eth-red": "#be123c",
        "bg-dark": "#f8fafc",
        "bg-card": "#ffffff",
        "bg-surface": "#f1f5f9",
        primary: "#0f172a",
        secondary: "#475569",
        muted: "#94a3b8",
        error: "#e11d48",
        success: "#059669",
        "dark-bg": "#08111f",
        "dark-card": "#0f172a",
        "dark-surface": "#1e293b",
        "dark-border": "#64748b",
        "dark-text": "#f8fafc",
        "dark-muted": "#cbd5e1",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "sans-serif"],
        display: ["Sora", "Manrope", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(15, 118, 110, 0.3)",
        "glow-yellow": "0 0 20px rgba(3, 105, 161, 0.3)",
        "glow-hover": "0 0 25px rgba(15, 118, 110, 0.5)",
        panel: "0 28px 80px -40px rgba(15, 23, 42, 0.45)",
        "panel-dark": "0 34px 90px -42px rgba(2, 8, 23, 0.9)",
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.55s ease-out both",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(15, 118, 110, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(15, 118, 110, 0.6)" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(16px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
