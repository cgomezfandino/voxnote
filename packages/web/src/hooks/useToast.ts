"use client";

import { createContext, useContext } from "react";

export type ToastVariant = "error" | "success" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
