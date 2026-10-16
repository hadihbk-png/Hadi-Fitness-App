import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.type === 'error' ? 4200 : 2600)
    return () => clearTimeout(id)
  }, [toast])

  // toast('Saved') or toast('Could not save', 'error')
  const show = useCallback((text, type = 'success') => setToast({ text, type, id: Date.now() }), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className={`toast glass ${toast.type === 'error' ? 'toast-error' : ''}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          key={toast.id}
        >
          {toast.type === 'error' ? <AlertTriangle size={18} className="pink" /> : <CheckCircle2 size={18} className="lime" />}
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
