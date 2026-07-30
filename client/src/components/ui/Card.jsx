export default function Card({ title, action, children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-sage-grey bg-linen p-4 shadow-[0_1px_2px_rgba(43,38,32,0.04),0_4px_12px_rgba(43,38,32,0.06)] transition-shadow duration-200 md:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-lg font-medium text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
