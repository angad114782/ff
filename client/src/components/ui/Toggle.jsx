export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-terracotta/40 ${
        checked ? 'bg-terracotta' : 'bg-sage-grey'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-linen shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
