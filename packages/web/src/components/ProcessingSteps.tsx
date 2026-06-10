"use client";

import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { ProcessingStep, StepStatus } from "@/types";

interface ProcessingStepsProps {
  steps: ProcessingStep[];
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
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-7 h-7 rounded-full border-2 border-white/10 bg-slate-950/40" />
      );
  }
}

export default function ProcessingSteps({ steps }: ProcessingStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="card border border-white/5">
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 mt-1 ${
                    step.status === "completed" ? "bg-accent" : "bg-white/5"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-0.5 pb-4">
              <p
                className={`text-sm font-medium ${
                  step.status === "active"
                    ? "text-primary"
                    : step.status === "completed"
                      ? "text-foreground"
                      : step.status === "error"
                        ? "text-accent"
                        : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              {step.description && (
                <p
                  className={`text-xs mt-0.5 ${
                    step.status === "error"
                      ? "text-accent"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
