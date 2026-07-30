const variants = {
  primary: 'bg-terracotta text-linen shadow-sm hover:bg-terracotta-deep hover:shadow-md',
  secondary: 'border border-sage-soft text-terracotta bg-transparent hover:bg-sand hover:shadow-sm',
  destructive: 'bg-terracotta-deep text-linen shadow-sm hover:bg-terracotta-deep/90 hover:shadow-md',
  ghost: 'bg-terracotta-deep/10 text-terracotta-deep hover:bg-terracotta-deep/20',
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
