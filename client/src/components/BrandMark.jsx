import verticalPrimary from '../assets/logo/VerticalLogoLockup-Primary.png'
import horizontalPrimary from '../assets/logo/HorizontalLogoLockup-Primary.svg'

// The sidebar/header backgrounds here are light (sand/linen), so per the
// brand guide's own "logo in colours" usage we place the Primary-colour
// (terracotta) logo directly on them — no boxed/chip background. The White
// logo variant is reserved for actual colour blocks (see Login screen).
//
// variant="full": the Primary Logo (vertical lockup) — the guide's own most-
// preferred unit, rendered at its 160px digital minimum. Used everywhere
// there's room for it (Admin sidebar/drawer, Salesman header).
// variant="compact": the horizontal lockup, ~170px wide (clears the 150px
// minimum) — reserved for the one genuinely cramped spot, the Admin mobile
// sticky top bar, per the guide's own rule for when the vertical unit
// "doesn't fit and becomes too small."
export default function BrandMark({ label, variant = 'compact', className = '' }) {
  if (variant === 'full') {
    return (
      <div className={className}>
        <img src={verticalPrimary} alt="" className="mx-auto h-40 w-auto object-contain" />
        <p className="mt-1 text-center text-xs font-medium uppercase tracking-wide text-ink/50">{label} Portal</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <img src={horizontalPrimary} alt="" className="h-5 w-auto object-contain" />
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink/50">{label} Portal</p>
    </div>
  )
}
