import React from 'react'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'

const typeConfig = {
  success: { icon: CheckCircle, border: 'border-l-green-500', iconColor: 'text-green-400' },
  error: { icon: AlertCircle, border: 'border-l-red-500', iconColor: 'text-red-400' },
  warning: { icon: AlertTriangle, border: 'border-l-amber-500', iconColor: 'text-amber-400' },
  info: { icon: Info, border: 'border-l-blue-500', iconColor: 'text-blue-400' },
}

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type]
        const Icon = config.icon
        return (
          <div
            key={toast.id}
            className={`bg-gray-800 border border-gray-700 border-l-4 ${config.border} rounded-lg shadow-xl p-4 flex items-start gap-3 animate-slide-in`}
          >
            <Icon size={20} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{toast.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-500 hover:text-gray-300 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastContainer
