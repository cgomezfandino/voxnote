"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "Voxnote", subtitle }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-2"
    >
      <div className="flex items-center gap-5 mb-2">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-3xl flex-shrink-0"
          style={{ boxShadow: "0 8px 30px rgba(159, 122, 234, 0.4)" }}
        >
          <Mic className="w-7 h-7 text-white" />
        </motion.div>

        {/* Title */}
        <div>
          <h1 className="font-display text-5xl font-bold text-gradient tracking-tight leading-none">
            {title}
          </h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground mt-2 text-lg"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="divider-gradient" />
    </motion.header>
  );
}
