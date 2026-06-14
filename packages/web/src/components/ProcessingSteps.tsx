"use client";

import { motion } from "framer-motion";
import { Check, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import type { ProcessingStep, StepStatus } from "@/types";

interface ProcessingStepsProps {
  steps: ProcessingStep[];
  onRetry?: () => void;
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-7 h-7 rounded-full bg-success flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      );
    case "active":
      return (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      );
    case "error":
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-7 h-7 rounded-full bg-danger flex items-center justify-center shadow-[0_0_12px_var(--danger-light)]"
        >
          <AlertTriangle className="w-4 h-4 text-danger-foreground" />
        </motion.div>
      );
    default:
      return (
        <div className="w-7 h-7 rounded-full border-2 border-border bg-muted" />
      );
  }
}

export default function ProcessingSteps({ steps, onRetry }: ProcessingStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="card border border-border">
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 mt-1 ${
                    step.status === "completed" ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-0.5 pb-4 flex-1">
              <p
                className={`text-sm font-medium ${
                  step.status === "active"
                    ? "text-primary"
                    : step.status === "completed"
                      ? "text-foreground"
                      : step.status === "error"
                        ? "text-danger"
                        : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              {step.description && (
                <p
                  className={`text-xs mt-0.5 ${
                    step.status === "error"
                      ? "text-danger"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.description}
                </p>
              )}
              {step.status === "error" && onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-light border border-danger-border text-danger text-xs font-semibold transition-all hover:bg-danger/15 active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
