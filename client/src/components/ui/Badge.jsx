const variants = {
  success: 'bg-green-livedin/10 text-green-livedin',
  error: 'bg-terracotta-deep/10 text-terracotta-deep',
  neutral: 'bg-sage-grey/40 text-ink/70',
}

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
