"use client";

import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  ListChecks,
  Lightbulb,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import type { InsightsResult } from "@/types";

interface InsightsDisplayProps {
  insights: InsightsResult;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ icon, title, color, children, delay = 0 }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function InsightsDisplay({ insights }: InsightsDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Resumen */}
      {insights.resumen && (
        <Section
          icon={<FileText className="w-4 h-4 text-primary" />}
          title="Resumen"
          color="bg-primary-light"
          delay={0}
        >
          <p className="text-sm text-foreground leading-relaxed">
            {insights.resumen}
          </p>
        </Section>
      )}

      {/* Decisiones */}
      {insights.decisiones?.length > 0 && (
        <Section
          icon={<CheckCircle2 className="w-4 h-4 text-success" />}
          title="Decisiones"
          color="bg-success-light"
          delay={0.05}
        >
          <ul className="space-y-1.5">
            {insights.decisiones.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-success mt-0.5 flex-shrink-0">&#x2022;</span>
                {d}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action Items */}
      {insights.action_items?.length > 0 && (
        <Section
          icon={<ListChecks className="w-4 h-4 text-amber-600" />}
          title="Tareas"
          color="bg-amber-50"
          delay={0.1}
        >
          <div className="space-y-2">
            {insights.action_items.map((item, i) => {
              const isObject = typeof item === "object" && item !== null;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-border text-primary flex-shrink-0"
                    readOnly
                  />
                  <div className="flex-1">
                    <p className="text-foreground">
                      {isObject ? item.tarea : String(item)}
                    </p>
                    {isObject && (item.responsable || item.deadline) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.responsable && (
                          <span className="mr-3">Responsable: {item.responsable}</span>
                        )}
                        {item.deadline && (
                          <span>Deadline: {item.deadline}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Insights */}
      {insights.insights?.length > 0 && (
        <Section
          icon={<Lightbulb className="w-4 h-4 text-purple-600" />}
          title="Insights"
          color="bg-purple-50"
          delay={0.15}
        >
          <ul className="space-y-1.5">
            {insights.insights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-purple-500 mt-0.5 flex-shrink-0">&#x2022;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Preguntas abiertas */}
      {insights.preguntas_abiertas?.length > 0 && (
        <Section
          icon={<HelpCircle className="w-4 h-4 text-sky-600" />}
          title="Preguntas abiertas"
          color="bg-sky-50"
          delay={0.2}
        >
          <ul className="space-y-1.5">
            {insights.preguntas_abiertas.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-sky-500 mt-0.5 flex-shrink-0">?</span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Proximos pasos */}
      {insights.proximos_pasos?.length > 0 && (
        <Section
          icon={<ArrowRight className="w-4 h-4 text-indigo-600" />}
          title="Proximos pasos"
          color="bg-indigo-50"
          delay={0.25}
        >
          <ol className="space-y-1.5">
            {insights.proximos_pasos.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-indigo-500 font-medium flex-shrink-0">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}
