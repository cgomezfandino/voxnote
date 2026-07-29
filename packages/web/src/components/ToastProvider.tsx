"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  ToastContext,
  type Toast,
  type ToastVariant,
} from "@/hooks/useToast";

const AUTO_DISMISS_MS = 5000;

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; iconBg: string; iconColor: string; Icon: typeof AlertCircle }
> = {
  error: {
    border: "border-danger/40",
    iconBg: "bg-danger/10 border-danger/20",
    iconColor: "text-danger",
    Icon: AlertCircle,
  },
  success: {
    border: "border-success/40",
    iconBg: "bg-success/10 border-success/20",
    iconColor: "text-success",
    Icon: CheckCircle2,
  },
  info: {
    border: "border-primary/40",
    iconBg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
    Icon: Info,
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { border, iconBg, iconColor, Icon } = VARIANT_STYLES[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`card border ${border} flex items-start gap-3 p-3.5 pointer-events-auto shadow-2xl`}
      role="alert"
    >
      <div
        className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="flex-1 text-sm text-foreground leading-relaxed pt-1">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg hover:bg-foreground/[0.04] transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info"): string => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((prev) => [...prev, { id, message, variant }]);

      const timer = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
