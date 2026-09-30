import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table } from '../components/ui'
import { stockItems } from '../mock/data'

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to search"
      className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-linen shadow-sm transition-colors hover:bg-terracotta-deep"
    >
      ←
    </button>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-sage-grey/60 pb-2.5 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

const batchColumns = [
  { key: 'batch', label: 'Batch' },
  { key: 'loc', label: 'Loc' },
  { key: 'qty', label: 'Qty' },
]

export default function ItemDetail({ backPath }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const [infoTab, setInfoTab] = useState('po')

  const item = stockItems.find((i) => i.code.toLowerCase() === (code ?? '').toLowerCase())

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackButton onClick={() => navigate(backPath)} />
        <p className="text-sm text-ink/60">No item found for “{code}”.</p>
      </div>
    )
  }

  // Location has no role in this view — every branch is folded into one set of totals.
  const location = item.locations[0]
  const totalQty = item.locations.reduce((sum, loc) => sum + loc.qty, 0)
  const totalReservedQty = item.locations.reduce((sum, loc) => sum + loc.reservedQty, 0)
  const totalAvailable = totalQty - totalReservedQty
  const totalQtyInPO = item.locations.reduce((sum, loc) => sum + loc.poDetails.qtyInPO, 0)
  const allBatches = item.locations.flatMap((loc) => loc.batches)

  return (
    <div className="mx-auto max-w-4xl">
      <BackButton onClick={() => navigate(backPath)} />

      <div className="rounded-xl border border-sage-grey bg-linen shadow-[0_1px_2px_rgba(43,38,32,0.04),0_4px_12px_rgba(43,38,32,0.06)]">
        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:gap-8 sm:p-6">
          {/* Left column — product image; sticky only on sm+ where it sits beside the details, scrolls normally on mobile. */}
          <div
            className="flex aspect-[4/3] items-center justify-center self-start rounded-lg bg-sand/50 text-sage-soft sm:sticky sm:top-4"
            aria-hidden="true"
          >
            <svg viewBox="0 0 48 48" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="14" width="36" height="26" rx="2" />
              <path d="M6 22h36" />
              <path d="M16 14v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
            </svg>
          </div>

          {/* Right column — name, codes, tabs, and every detail section. */}
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold uppercase tracking-wide text-ink">{item.name}</h1>
              <div className="mt-4 space-y-2.5">
                <DetailRow label="Product Code" value={item.code} />
                <DetailRow label="Current Stock" value={totalQty} />
              </div>
            </div>

            <div className="space-y-2.5 border-t border-sage-grey pt-4 text-sm">
              <DetailRow label="Reserved Qty" value={totalReservedQty} />
              <DetailRow label="Current Available" value={totalAvailable} />
            </div>

            <div>
              <div className="flex gap-1 border-t border-sage-grey pt-4">
                {[
                  { value: 'po', label: 'PO Details' },
                  // { value: 'technical', label: 'Technical Details' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setInfoTab(tab.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                      infoTab === tab.value ? 'bg-terracotta text-linen shadow-sm' : 'text-ink/60 hover:bg-sand'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {infoTab === 'po' ? (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2.5 text-sm">
                    <DetailRow label="Qty in PO" value={totalQtyInPO} />
                    <DetailRow label="Expected" value={location.poDetails.expected} />
                  </div>

                  <Table columns={batchColumns} rows={allBatches} emptyMessage="No batches recorded." />
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 text-sm">
                  <DetailRow label="Material" value={location.technicalDetails.material} />
                  <DetailRow label="Dimensions" value={location.technicalDetails.dimensions} />
                  <DetailRow label="Weight" value={location.technicalDetails.weight} />
                  <div className="flex justify-between pb-2.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink/50">Finish</span>
                    <span className="font-medium text-ink">{location.technicalDetails.finish}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
