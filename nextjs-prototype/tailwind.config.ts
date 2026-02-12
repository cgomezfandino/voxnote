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
        // Cyber-Audio Theme
        cyber: {
          bg: "#0D0D12",
          elevated: "#16161F",
          card: "rgba(255, 255, 255, 0.04)",
        },
        primary: {
          DEFAULT: "#9F7AEA",
          light: "#B794F6",
          dark: "#805AD5",
          glow: "rgba(159, 122, 234, 0.5)",
        },
        secondary: {
          DEFAULT: "#22D3EE",
          light: "#67E8F9",
          glow: "rgba(34, 211, 238, 0.5)",
        },
        accent: {
          DEFAULT: "#FB7185",
          glow: "rgba(251, 113, 133, 0.5)",
          alt: "#FBBF24",
        },
        muted: {
          DEFAULT: "#94A3B8",
          foreground: "#E2E8F0",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        heading: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #9F7AEA 0%, #22D3EE 100%)",
        "gradient-accent": "linear-gradient(135deg, #FB7185 0%, #FBBF24 100%)",
        "gradient-dark": "linear-gradient(180deg, #16161F 0%, #0D0D12 100%)",
        "gradient-hero":
          "radial-gradient(ellipse at 50% 0%, rgba(159, 122, 234, 0.15) 0%, #0D0D12 50%)",
        "glass":
          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(251, 113, 133, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(251, 113, 133, 0.7)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
