import type React from "react";
import { createContext, useContext } from "react";
import RHT, {
  type Renderable,
  type Toast,
  type ToastOptions,
  useToaster,
} from "react-hot-toast";

interface ActionOptions {
  label: string;
  onClick: () => void;
}

interface ToastOptionsExtended extends ToastOptions {
  description?: React.ReactNode;
  action?: ActionOptions;
  cancel?: ActionOptions;
}

interface ToastContextType {
  (message: Renderable, options?: ToastOptionsExtended): string;
  success: (message: Renderable, options?: ToastOptionsExtended) => string;
  error: (message: Renderable, options?: ToastOptionsExtended) => string;
  info: (message: Renderable, options?: ToastOptionsExtended) => string;
  warning: (message: Renderable, options?: ToastOptionsExtended) => string;
  loading: (message: Renderable, options?: ToastOptionsExtended) => string;
  dismiss: (toastId?: string) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: Renderable;
      success: Renderable | ((data: T) => Renderable);
      error: Renderable | ((err: unknown) => Renderable);
    },
    options?: ToastOptionsExtended,
  ) => Promise<T>;
}

type ExtendedToast = Toast & ToastOptionsExtended;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function DaisyToaster() {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
    <div
      className="toast toast-end toast-bottom z-50"
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      {toasts
        .filter((t) => t.visible)
        .map((t) => {
          const toast = t as ExtendedToast;

          const alertType =
            toast.type === "success"
              ? "alert-success"
              : toast.type === "error"
                ? "alert-error"
                : toast.type === "loading"
                  ? "alert-info"
                  : toast.className || "alert-info";

          return (
            <div
              key={t.id}
              className={`alert ${alertType} shadow-lg flex justify-between gap-4 min-w-75`}
            >
              <div className="flex flex-col">
                <span className="font-semibold">
                  {typeof t.message === "function" ? t.message(t) : t.message}
                </span>
                {toast?.description && (
                  <span className="text-xs opacity-90">
                    {toast.description}
                  </span>
                )}
              </div>

              {(toast?.action || toast?.cancel) && (
                <div className="flex gap-2 items-center">
                  {toast?.cancel && (
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        toast.cancel?.onClick();
                        RHT.dismiss(t.id);
                      }}
                    >
                      {toast.cancel.label}
                    </button>
                  )}
                  {toast?.action && (
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      onClick={() => {
                        toast.action?.onClick();
                        RHT.dismiss(t.id);
                      }}
                    >
                      {toast?.action?.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const customToast = ((message: Renderable, options?: ToastOptionsExtended) =>
    RHT(message, options)) as ToastContextType;

  const toastMethods = {
    success: (message, options) => RHT.success(message, options),
    error:   (message, options) => RHT.error(message, options),
    info:    (message, options) => RHT(message, { ...options, className: "alert-info" }),
    warning: (message, options) => RHT(message, { ...options, className: "alert-warning" }),
    loading: (message, options) => RHT.loading(message, options),
    dismiss: (toastId) =>          RHT.dismiss(toastId),
    promise: (promise, msgs, options) => RHT.promise(promise, msgs as Parameters<typeof RHT.promise>[1], options),
  } as ToastContextType;

  const toast = Object.assign(customToast, toastMethods);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <DaisyToaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
