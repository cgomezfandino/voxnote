"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

export default function Logo({ size = "md", animated = true }: LogoProps) {
  const sizes = {
    sm: 52,
    md: 72,
    lg: 96,
    xl: 128,
  };

  const containerSize = sizes[size];

  return (
    <motion.div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
      style={{ width: containerSize, height: containerSize }}
      whileHover={animated ? { scale: 1.05, boxShadow: "0 0 25px rgba(0, 242, 152, 0.35)" } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
    >
      <img
        src="/logo.png"
        alt="Voxnote Logo"
        className="w-full h-full object-cover"
      />
      
      {/* Pulsing Outer Neon Ring */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-accent/20 pointer-events-none"
          animate={{ 
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.1, 0.4]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );
}

// Icon-only version for small spaces
export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img 
      src="/logo.png"
      alt="Voxnote Icon"
      className={`rounded-lg object-cover ${className}`}
    />
  );
}
