import { useState } from 'react'

function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

export default function Input({ label, error, id, className = '', type, ...props }) {
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          className={`w-full rounded-md border bg-linen px-3 py-2.5 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-terracotta/40 ${
            isPassword ? 'pr-10' : ''
          } ${
            error
              ? 'border-terracotta-deep'
              : 'border-sage-grey hover:border-sage-soft focus:border-terracotta'
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/50 transition-colors hover:text-terracotta"
          >
            <Eye off={shown} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-terracotta-deep">{error}</p>}
    </div>
  )
}
