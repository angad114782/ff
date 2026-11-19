import { useEffect, useState } from 'react'

// The popup closes only from its ✕ (or a Cancel button) — never by clicking outside it.
// `footer` stays pinned at the bottom; the body in between scrolls only when the content does not fit the screen.
export default function Modal({ open, onClose, title, children, footer, wide = false, size }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
  }, [open])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 transition-opacity duration-200 sm:p-4 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`flex max-h-full w-full flex-col ${
          size === 'xl' ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'
        } rounded-xl bg-linen shadow-lg transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <h3 className="text-lg font-medium text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink/60 transition-colors hover:bg-sand hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-sage-grey px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}
