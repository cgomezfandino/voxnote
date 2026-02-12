"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

export type StepStatus = "pending" | "active" | "completed";

export interface Step {
  id: number;
  title: string;
  description?: string;
  status: StepStatus;
}

interface ProcessingStepsProps {
  steps: Step[];
}

export default function ProcessingSteps({ steps }: ProcessingStepsProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {steps.map((step) => (
          <motion.div
            key={step.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`step-card ${
              step.status === "active"
                ? "border-primary/50"
                : step.status === "completed"
                ? "border-emerald-400/50"
                : "border-white/[0.08]"
            }`}
          >
            {/* Step Number / Icon */}
            <div
              className={`step-number ${
                step.status === "completed"
                  ? "bg-emerald-400 text-cyber-bg"
                  : step.status === "active"
                  ? "bg-gradient-primary text-white"
                  : "bg-white/[0.08] text-muted"
              }`}
              style={
                step.status !== "pending"
                  ? { boxShadow: `0 0 15px currentColor40` }
                  : {}
              }
            >
              {step.status === "completed" ? (
                <Check className="w-4 h-4" />
              ) : step.status === "active" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                step.id
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div
                className={`font-medium ${
                  step.status === "pending" ? "text-muted" : "text-white"
                }`}
              >
                {step.title}
              </div>
              {step.description && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-muted mt-1"
                >
                  {step.description}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
