import React, { createContext, useContext, useState, ReactNode } from 'react';

// Toast types
type ToastVariant = 'default' | 'destructive' | 'success' | 'warning';

interface ToastProps {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
  dismissToast: (id: string) => void;
  toasts: ToastProps[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  // Add a new toast
  const toast = (props: ToastProps) => {
    const id = props.id || Math.random().toString(36).substring(2, 9);
    const newToast = { ...props, id };
    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Auto dismiss after duration (default 5000ms)
    if (props.duration !== Infinity) {
      const duration = props.duration || 5000;
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  };

  // Remove a toast by ID
  const dismissToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        toast,
        dismissToast,
        toasts,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 w-full max-w-xs">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-md shadow-lg transition-all transform translate-y-0 opacity-100 ${
              toast.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground'
                : toast.variant === 'success'
                ? 'bg-green-600 text-white'
                : toast.variant === 'warning'
                ? 'bg-yellow-500 text-white'
                : 'bg-background text-foreground border'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{toast.title}</h4>
                {toast.description && (
                  <p className="text-sm mt-1 opacity-90">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id!)}
                className="ml-4 text-sm opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}