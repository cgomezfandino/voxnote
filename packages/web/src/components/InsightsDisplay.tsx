"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  ListChecks,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  User,
  Users,
  Target,
  Quote,
  Calendar,
  Check,
} from "lucide-react";
import type { InsightsResult } from "@/types";

interface InsightsDisplayProps {
  insights: InsightsResult;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  glowClass: string;
  borderClass: string;
  iconBgClass: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ icon, title, glowClass, borderClass, iconBgClass, children, delay = 0 }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card border-l-4 ${borderClass} ${glowClass}`}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function InsightsDisplay({ insights }: InsightsDisplayProps) {
  // Local state to keep track of user interactive task completion
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {insights.resumen && (
        <Section
          icon={<FileText className="w-4.5 h-4.5 text-primary" />}
          title="Resumen Ejecutivo"
          glowClass="card-glow-indigo"
          borderClass="border-l-indigo-500"
          iconBgClass="bg-primary/10 border border-primary/20"
          delay={0}
        >
          <p className="text-sm text-foreground leading-relaxed font-medium">
            {insights.resumen}
          </p>
        </Section>
      )}

      {/* Participantes */}
      {insights.participantes && insights.participantes.length > 0 && (
        <Section
          icon={<Users className="w-4.5 h-4.5 text-teal-400" />}
          title="Participantes"
          glowClass="hover:border-teal-500/30 hover:shadow-[0_0_25px_rgba(20,184,166,0.05)]"
          borderClass="border-l-teal-500"
          iconBgClass="bg-teal-500/10 border border-teal-500/20"
          delay={0.03}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.participantes.map((p, i) => {
              const initials = p.hablante
                .replace(/[[\]]/g, "")
                .split(/[\s_]+/)
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border"
                >
                  <span className="w-8 h-8 rounded-full bg-teal-500/15 border border-teal-500/25 dark:text-teal-300 text-teal-700 text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {initials || <User className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {p.hablante}
                    </p>
                    {p.aporte && (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {p.aporte}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Puntos clave */}
      {insights.puntos_clave && insights.puntos_clave.length > 0 && (
        <Section
          icon={<Target className="w-4.5 h-4.5 text-primary" />}
          title="Puntos Clave"
          glowClass="card-glow-indigo"
          borderClass="border-l-indigo-500"
          iconBgClass="bg-primary/10 border border-primary/20"
          delay={0.04}
        >
          <ul className="space-y-2.5">
            {insights.puntos_clave.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Decisiones */}
      {insights.decisiones?.length > 0 && (
        <Section
          icon={<CheckCircle2 className="w-4.5 h-4.5 text-accent" />}
          title="Acuerdos y Decisiones"
          glowClass="card-glow-green"
          borderClass="border-l-accent"
          iconBgClass="bg-accent/10 border border-accent/20"
          delay={0.05}
        >
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.decisiones.map((d, i) => (
              <li 
                key={i} 
                className="flex items-start gap-2.5 p-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action Items Board / Interactive Tasks Grid */}
      {insights.action_items?.length > 0 && (
        <Section
          icon={<ListChecks className="w-4.5 h-4.5 text-amber-400" />}
          title="Plan de Acción / Tareas"
          glowClass="hover:border-amber-500/30 hover:shadow-[0_0_25px_rgba(245,158,11,0.05)]"
          borderClass="border-l-amber-500"
          iconBgClass="bg-amber-500/10 border border-amber-500/20"
          delay={0.1}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {insights.action_items.map((item, i) => {
              const isObject = typeof item === "object" && item !== null;
              const taskText = isObject ? item.tarea : String(item);
              const owner = isObject ? item.responsable : null;
              const deadline = isObject ? item.deadline : null;
              const isDone = !!completedTasks[i];

              // Generate owner initials initials
              const initials = owner
                ? owner
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "";

              return (
                <div
                  key={i}
                  onClick={() => toggleTask(i)}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer select-none ${
                    isDone
                      ? "bg-muted/50 border-border shadow-none"
                      : "bg-muted border-border hover:border-amber-500/20 shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Circle Checkbox Trigger */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone
                          ? "bg-amber-500 border-amber-500 text-background"
                          : "border-border bg-muted hover:border-amber-500"
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <p
                      className={`text-sm text-foreground leading-normal flex-1 transition-all ${
                        isDone ? "line-through text-muted-foreground opacity-70" : "font-medium"
                      }`}
                    >
                      {taskText}
                    </p>
                  </div>

                  {/* Metadata labels row (Owner, Deadline) */}
                  {(owner || deadline) && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-border">
                      {owner && (
                        <div 
                          className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold"
                          title={`Responsable: ${owner}`}
                        >
                          {initials ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-400 text-background text-[9px] flex items-center justify-center font-black">
                              {initials}
                            </span>
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="max-w-[72px] truncate">{owner}</span>
                        </div>
                      )}
                      
                      {deadline && (
                        <div 
                          className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 dark:text-amber-300 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          title={`Deadline: ${deadline}`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span className="max-w-[80px] truncate">{deadline}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Insights */}
      {insights.insights?.length > 0 && (
        <Section
          icon={<Lightbulb className="w-4.5 h-4.5 text-purple-400" />}
          title="Insights Clave"
          glowClass="hover:border-purple-500/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.05)]"
          borderClass="border-l-purple-500"
          iconBgClass="bg-purple-500/10 border border-purple-500/20"
          delay={0.15}
        >
          <ul className="space-y-2.5">
            {insights.insights.map((item, i) => (
              <li 
                key={i} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Comentarios destacados */}
      {insights.comentarios_destacados && insights.comentarios_destacados.length > 0 && (
        <Section
          icon={<Quote className="w-4.5 h-4.5 text-pink-400" />}
          title="Comentarios Destacados"
          glowClass="hover:border-pink-500/30 hover:shadow-[0_0_25px_rgba(236,72,153,0.05)]"
          borderClass="border-l-pink-500"
          iconBgClass="bg-pink-500/10 border border-pink-500/20"
          delay={0.18}
        >
          <div className="space-y-3">
            {insights.comentarios_destacados.map((c, i) => (
              <blockquote
                key={i}
                className="p-3.5 rounded-lg bg-muted border-l-2 border-pink-500/40 text-sm text-foreground italic"
              >
                &ldquo;{c.cita}&rdquo;
                {c.hablante && (
                  <cite className="block not-italic text-xs dark:text-pink-300/80 text-pink-700 font-semibold mt-2">
                    — {c.hablante}
                  </cite>
                )}
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* Preguntas abiertas */}
      {insights.preguntas_abiertas?.length > 0 && (
        <Section
          icon={<HelpCircle className="w-4.5 h-4.5 text-sky-400" />}
          title="Preguntas y Pendientes"
          glowClass="hover:border-sky-500/30 hover:shadow-[0_0_25px_rgba(14,165,233,0.05)]"
          borderClass="border-l-sky-500"
          iconBgClass="bg-sky-500/10 border border-sky-500/20"
          delay={0.2}
        >
          <ul className="space-y-2.5">
            {insights.preguntas_abiertas.map((q, i) => (
              <li 
                key={i} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                <span className="leading-relaxed font-semibold">{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Proximos pasos */}
      {insights.proximos_pasos?.length > 0 && (
        <Section
          icon={<ArrowRight className="w-4.5 h-4.5 text-primary" />}
          title="Próximos Pasos"
          glowClass="card-glow-indigo"
          borderClass="border-l-indigo-500"
          iconBgClass="bg-primary/10 border border-primary/20"
          delay={0.25}
        >
          <ol className="space-y-2.5">
            {insights.proximos_pasos.map((step, i) => (
              <li 
                key={i} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <span className="text-primary font-black flex-shrink-0 text-xs mt-0.5">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <span className="leading-relaxed font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}
