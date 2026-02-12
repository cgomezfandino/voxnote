"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

export default function Logo({ size = "md", animated = true }: LogoProps) {
  const sizes = {
    sm: { container: 40, font: "text-lg", icon: 20 },
    md: { container: 48, font: "text-xl", icon: 24 },
    lg: { container: 64, font: "text-2xl", icon: 32 },
    xl: { container: 80, font: "text-3xl", icon: 40 },
  };

  const { container, font, icon } = sizes[size];

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: container, height: container }}
      whileHover={animated ? { scale: 1.05 } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
    >
      {/* Background gradient - richer indigo with purple accent */}
      <div 
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-600"
        style={{ boxShadow: "0 8px 30px rgba(79, 70, 229, 0.4)" }}
      />
      
      {/* Inner subtle highlight */}
      <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      
      {/* VN Letters */}
      <span 
        className={`relative font-bold text-white ${font} tracking-tight`}
        style={{ 
          textShadow: "0 2px 4px rgba(0,0,0,0.1)",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
        }}
      >
        <motion.span
          initial={animated ? { opacity: 0, x: -5 } : undefined}
          animate={animated ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          V
        </motion.span>
        <motion.span
          initial={animated ? { opacity: 0, x: 5 } : undefined}
          animate={animated ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          N
        </motion.span>
      </span>

      {/* Animated ring */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );
}

// Alternative: Icon-only version for favicon/small spaces
export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 40 40" 
      className={className}
      fill="none"
    >
      <rect 
        width="40" 
        height="40" 
        rx="10" 
        fill="url(#gradient)"
      />
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        VN
      </text>
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
    </svg>
  );
}
