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
        // ═══════════════════════════════════════════════════
        // TEMA CLARO PROFESIONAL - "Cyber Light"
        // ═══════════════════════════════════════════════════
        
        // Fondos - De oscuro a CLAROS
        cyber: {
          bg: "#F8FAFC",           // Gris muy claro (fondo principal)
          elevated: "#FFFFFF",      // Blanco puro (cards)
          card: "rgba(255, 255, 255, 0.8)",
          border: "rgba(148, 163, 184, 0.2)",
        },
        
        // Primarios - Mantenemos púrpura vibrante
        primary: {
          DEFAULT: "#7C3AED",     // Púrpura más intenso
          light: "#A78BFA",
          lighter: "#DDD6FE",
          dark: "#5B21B6",
          glow: "rgba(124, 58, 237, 0.3)",
        },
        
        // Secundarios - Cian brillante
        secondary: {
          DEFAULT: "#0891B2",     // Cian más profundo
          light: "#22D3EE",
          lighter: "#CFFAFE",
          dark: "#155E75",
        },
        
        // Acentos
        accent: {
          DEFAULT: "#E11D48",     // Rosa coral
          light: "#FB7185",
          lighter: "#FFE4E6",
          alt: "#F59E0B",         // Ámbar
        },
        
        // Texto - AHORA OSCURO sobre fondo claro
        muted: {
          DEFAULT: "#64748B",     // Gris medio
          foreground: "#475569",   // Gris oscuro
          light: "#94A3B8",        // Gris claro
        },
        
        // Estados con fondos suaves
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
          bg: "rgba(16, 185, 129, 0.1)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          bg: "rgba(245, 158, 11, 0.1)",
        },
        error: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          bg: "rgba(239, 68, 68, 0.1)",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          bg: "rgba(59, 130, 246, 0.1)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        heading: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)",
        "gradient-accent": "linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)",
        "gradient-hero": "linear-gradient(180deg, #F1F5F9 0%, #F8FAFC 100%)",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
        "card-gradient": "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'medium': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'glow-primary': '0 0 40px rgba(124, 58, 237, 0.15)',
        'glow-accent': '0 0 40px rgba(225, 29, 72, 0.15)',
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124, 58, 237, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(124, 58, 237, 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
