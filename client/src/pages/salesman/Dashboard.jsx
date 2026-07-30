import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

const SLIDE_INTERVAL_MS = 4000

function placeholderHeroSvg(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'>
    <rect width='800' height='450' fill='#F2E5D6'/>
    <text x='400' y='235' font-family='sans-serif' font-size='28' fill='#8D381E' text-anchor='middle'>${label}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Shown until the admin uploads real content from Dashboard Content — keeps the
// layout visible in the meantime, swapped out automatically once real data exists.
const PLACEHOLDER_HERO_IMAGES = [1, 2, 3].map((n) => ({
  id: `placeholder-hero-${n}`,
  name: `Hero Banner ${n}`,
  dataUrl: placeholderHeroSvg(`Hero Banner ${n} (placeholder)`),
}))

const PLACEHOLDER_MEDIA = [
  { id: 'placeholder-media-1', name: 'Sample Product Sheet' },
  { id: 'placeholder-media-2', name: 'Sample Catalogue' },
  { id: 'placeholder-media-3', name: 'Sample Price List' },
]

function HeroCarousel({ images }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [images.length])

  // Fewer images uploaded than the last render — clamp so we don't point past the end.
  const activeIndex = index % images.length

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-sage-grey">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {images.map((img) => (
          <img key={img.id} src={img.dataUrl} alt={img.name} className="aspect-video w-full shrink-0 object-cover" />
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIndex ? 'w-5 bg-linen' : 'w-1.5 bg-linen/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlaceholderMediaCard({ name }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-sage-grey bg-sand/30">
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-sage-soft">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
          <path d="M15 2v5h5" />
        </svg>
        <span className="text-xs font-medium uppercase tracking-wide">Placeholder</span>
      </div>
      <p className="truncate border-t border-sage-grey px-3 py-2.5 text-sm font-medium text-ink/60">{name}</p>
    </div>
  )
}

function MediaCard({ item }) {
  return (
    <a
      href={item.dataUrl}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-xl border border-sage-grey bg-linen transition-shadow duration-150 hover:shadow-md"
    >
      {item.type === 'image' ? (
        <img src={item.dataUrl} alt={item.name} className="h-64 w-full object-cover" />
      ) : item.type === 'video' ? (
        <video src={item.dataUrl} controls className="h-64 w-full bg-ink object-cover" />
      ) : (
        <embed src={item.dataUrl} type="application/pdf" className="h-64 w-full pointer-events-none" />
      )}
      <p className="truncate border-t border-sage-grey px-3 py-2.5 text-sm font-medium text-ink group-hover:text-terracotta">
        {item.name}
      </p>
    </a>
  )
}

export default function Dashboard() {
  const { heroImages, upcomingMedia } = useApp()

  const displayHeroImages = heroImages.length > 0 ? heroImages : PLACEHOLDER_HERO_IMAGES
  const showingPlaceholderMedia = upcomingMedia.length === 0
  const displayMedia = showingPlaceholderMedia ? PLACEHOLDER_MEDIA : upcomingMedia

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink/70">What's new at F&F.</p>
      </div>

      <HeroCarousel images={displayHeroImages} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Upcoming Products</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {showingPlaceholderMedia
            ? displayMedia.map((item) => <PlaceholderMediaCard key={item.id} name={item.name} />)
            : displayMedia.map((item) => <MediaCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  )
}
