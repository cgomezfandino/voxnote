import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta minimalista - Blanco, grises, un acento
        background: "#FFFFFF",
        foreground: "#1F2937", // gray-800
        muted: {
          DEFAULT: "#F3F4F6", // gray-100
          foreground: "#6B7280", // gray-500
        },
        border: "#E5E7EB", // gray-200
        primary: {
          DEFAULT: "#4F46E5", // indigo-600
          foreground: "#FFFFFF",
          hover: "#4338CA", // indigo-700
          light: "#EEF2FF", // indigo-50
        },
        secondary: {
          DEFAULT: "#F3F4F6", // gray-100
          foreground: "#374151", // gray-700
        },
        accent: {
          DEFAULT: "#EF4444", // red-500
          foreground: "#FFFFFF",
          light: "#FEF2F2", // red-50
        },
        success: {
          DEFAULT: "#10B981", // emerald-500
          light: "#ECFDF5", // emerald-50
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'button': '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
