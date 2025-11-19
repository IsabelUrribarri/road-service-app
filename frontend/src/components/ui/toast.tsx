import React from 'react'
import { cn } from '../../lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface ToastProps {
  id?: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  action?: React.ReactNode
  onClose?: () => void
}

const ToastContext = React.createContext<{
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => void
  removeToast: (id: string) => void
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
    
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id!)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const Toast: React.FC<ToastProps & { onClose: () => void }> = ({
  title,
  description,
  variant = 'default',
  action,
  onClose,
}) => {
  const icons = {
    default: <Info className="h-4 w-4" />,
    success: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
  }

  const variants = {
    default: "border-border bg-background text-foreground",
    success: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    destructive: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  }

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg animate-slide-in-right",
        variants[variant]
      )}
    >
      <div className={cn(
        "flex-shrink-0",
        variant === 'success' && "text-green-600",
        variant === 'warning' && "text-yellow-600", 
        variant === 'destructive' && "text-red-600"
      )}>
        {icons[variant]}
      </div>
      <div className="grid flex-1 gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
      </div>
      {action}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}