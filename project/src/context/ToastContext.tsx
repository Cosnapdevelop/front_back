import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: number; type: ToastType; message: string; duration?: number };

const ToastContext = createContext<{ 
  push: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: number) => void;
} | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  // Fallback: avoid crashing when provider is missing (e.g., outside root or during pre-render)
  return {
    push: (_type: ToastType, message: string, _duration?: number) => {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[toast:fallback]', message);
      }
    },
    remove: (_id: number) => {}
  };
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error': return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      default: return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 animate-slide-in-right ${getStyles()}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="text-sm font-medium">
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-4 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-md">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};


