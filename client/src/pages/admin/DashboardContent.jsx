import { useRef } from 'react'
import { Card, Button, Badge } from '../../components/ui'
import { useApp } from '../../context/AppContext'

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function mediaType(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'pdf'
}

export default function DashboardContent() {
  const { heroImages, setHeroImages, upcomingMedia, setUpcomingMedia, storageError, setStorageError } = useApp()
  const imageInputRef = useRef(null)
  const mediaInputRef = useRef(null)

  async function handleImagesChosen(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setStorageError('')
    const uploaded = await Promise.all(
      files.map(async (file) => ({ id: `${Date.now()}-${Math.random()}`, name: file.name, dataUrl: await readAsDataUrl(file) })),
    )
    setHeroImages((list) => [...list, ...uploaded])
  }

  async function handleMediaChosen(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setStorageError('')
    const uploaded = await Promise.all(
      files.map(async (file) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: mediaType(file),
        dataUrl: await readAsDataUrl(file),
      })),
    )
    setUpcomingMedia((list) => [...list, ...uploaded])
  }

  function removeHeroImage(id) {
    setHeroImages((list) => list.filter((img) => img.id !== id))
  }

  function removeMedia(id) {
    setUpcomingMedia((list) => list.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard Content</h1>
        <p className="text-sm text-ink/70">
          Hero images and upcoming-product files (PDF, image, or video) you upload here show up on the Salesman
          dashboard.
        </p>
      </div>

      {storageError && (
        <p className="rounded-lg border border-terracotta-deep/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          {storageError}
        </p>
      )}

      <Card
        title="Hero Images"
        action={
          <Button onClick={() => imageInputRef.current?.click()}>Upload Images</Button>
        }
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImagesChosen}
        />
        {heroImages.length === 0 ? (
          <p className="text-sm text-ink/60">No hero images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {heroImages.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-lg border border-sage-grey">
                <img src={img.dataUrl} alt={img.name} className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeHeroImage(img.id)}
                  aria-label={`Remove ${img.name}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-xs text-linen opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Upcoming Products"
        action={<Button onClick={() => mediaInputRef.current?.click()}>Upload PDF / Image / Video</Button>}
      >
        <input
          ref={mediaInputRef}
          type="file"
          accept="application/pdf,image/*,video/*"
          multiple
          className="hidden"
          onChange={handleMediaChosen}
        />
        {upcomingMedia.length === 0 ? (
          <p className="text-sm text-ink/60">No files uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingMedia.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-sage-grey px-4 py-2.5"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Badge variant="neutral">{item.type.toUpperCase()}</Badge>
                  <a
                    href={item.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-terracotta hover:underline"
                  >
                    {item.name}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  className="shrink-0 text-sm font-medium text-ink/60 transition-colors hover:text-terracotta-deep"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
