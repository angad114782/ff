export default function Input({ label, error, id, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-md border bg-linen px-3 py-2.5 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-terracotta/40 ${
          error
            ? 'border-terracotta-deep'
            : 'border-sage-grey hover:border-sage-soft focus:border-terracotta'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-terracotta-deep">{error}</p>}
    </div>
  )
}
