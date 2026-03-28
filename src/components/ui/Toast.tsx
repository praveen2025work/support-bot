"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  type: "success" | "error" | "warning";
  message: string;
  action?: ToastAction;
}

interface ToastEntry extends ToastData {
  id: number;
}

interface ToastContextValue {
  addToast: (toast: ToastData) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 0;

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

const borderColors: Record<ToastData["type"], string> = {
  success: "",
  error: "border-l-[3px] border-l-[var(--danger)]",
  warning: "border-l-[3px] border-l-[var(--warning)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: ToastData) => {
      const id = ++nextId;
      setToasts((prev) => [
        ...prev.slice(-(MAX_VISIBLE - 1)),
        { ...toast, id },
      ]);
      if (toast.type === "success") {
        setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3.5 py-2.5 shadow-[var(--shadow-md)] text-[13px] text-[var(--text-primary)] ${borderColors[toast.type]}`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-[18px] h-[18px] text-[var(--success)] flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-[var(--brand)] underline text-[11px] flex-shrink-0"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
