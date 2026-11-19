import { useNavigate, useParams } from 'react-router-dom'
import { Table, Skeleton, Badge } from '../components/ui'
import { useFetch } from '../hooks/useFetch'

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

const DASH = '—'

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-sage-grey/60 pb-2.5 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</span>
      <span className="text-right font-medium text-ink">{value ?? DASH}</span>
    </div>
  )
}

const lotColumns = [
  { key: 'lotNo', label: 'Lot' },
  { key: 'location', label: 'Loc' },
  { key: 'qty', label: 'Qty' },
]

const formatInr = (n) => (n === null || n === undefined ? DASH : `₹${n.toLocaleString('en-IN')}`)

export default function ItemDetail({ backPath }) {
  const { code } = useParams()
  const navigate = useNavigate()

  const { data, error, loading } = useFetch(`/api/stock/item/${encodeURIComponent(code ?? '')}`)
  const item = data?.item

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <BackButton onClick={() => navigate(backPath)} />
        <div className="space-y-4 rounded-xl border border-sage-grey p-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackButton onClick={() => navigate(backPath)} />
        <p className="text-sm text-ink/60">{error || `No item found for “${code}”.`}</p>
      </div>
    )
  }

  const { stock, po } = item
  // Our own lots first, then the vendor's lots in the same table.
  const lotRows = [
    ...stock.lots,
    ...(item.vendor?.status === 'ok'
      ? item.vendor.breakdown.map((b) => ({ lotNo: b.label, location: b.location ?? DASH, qty: b.qty }))
      : []),
  ]
  const unit = item.uom ? ` ${item.uom}` : ''
  const qty = (n) => `${n}${unit}`

  return (
    <div className="mx-auto max-w-4xl">
      <BackButton onClick={() => navigate(backPath)} />

      <div className="rounded-xl border border-sage-grey bg-linen shadow-[0_1px_2px_rgba(43,38,32,0.04),0_4px_12px_rgba(43,38,32,0.06)]">
        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:gap-8 sm:p-6">
          {item.vendor?.image ? (
            <img
              src={item.vendor.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full self-start rounded-lg bg-sand/50 object-cover sm:sticky sm:top-4"
            />
          ) : (
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
          )}

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold uppercase tracking-wide text-ink">{item.name}</h1>
                <Badge variant={item.status === 'in_stock' ? 'success' : 'error'} className="shrink-0">
                  {item.status === 'in_stock' ? 'In stock' : 'Out of stock'}
                </Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                <DetailRow label="Product Code" value={item.code} />
                <DetailRow label="Collection" value={item.collection} />
                <DetailRow label="Color" value={item.color} />
                <DetailRow label="Width" value={item.width ? `${item.width} cm` : null} />
                <DetailRow label="Length" value={item.length} />
                <DetailRow label="Horizontal Repeat" value={item.horizontalRepeat} />
                <DetailRow label="Vertical Repeat" value={item.verticalRepeat} />
                <DetailRow label="MRP" value={item.mrp === null ? null : `${formatInr(item.mrp)}${item.uom ? ` / ${item.uom}` : ''}`} />
              </div>
            </div>

            <div className="space-y-2.5 border-t border-sage-grey pt-4 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-terracotta/10 px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-terracotta-deep">Available</span>
                <span className="text-xl font-bold text-terracotta-deep">{qty(item.totalStock)}</span>
              </div>

              {item.vendor?.status === 'error' && (
                <p className="text-ink/60">Vendor stock is not available — see the alert below.</p>
              )}
            </div>

            <div className="space-y-5 border-t border-sage-grey pt-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Stock by Lot</p>
                <Table columns={lotColumns} rows={lotRows} emptyMessage="No lots recorded." />
              </div>

              <div className="space-y-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">PO Details</p>
                <DetailRow label="Qty in PO" value={qty(po.qty)} />
                <DetailRow label="Status" value={po.deliveryStatus} />
                <DetailRow label="Expected" value={po.deliveryDate} />
                <DetailRow label="Transport" value={po.transport} />
                <DetailRow label="Bilty No" value={po.biltyNo} />
                <DetailRow label="Bilty Date" value={po.biltyDate} />
                {item.vendor?.status === 'ok' && item.vendor.po && (
                  <>
                    <DetailRow label="Vendor PO Qty" value={item.vendor.po.qty === null ? null : qty(item.vendor.po.qty)} />
                    <DetailRow label="Vendor PO Expected" value={item.vendor.po.expected} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {item.alerts?.length > 0 && (
          <div role="alert" className="space-y-1.5 rounded-b-xl border-t border-terracotta-deep/30 bg-terracotta/10 px-5 py-4 text-sm text-terracotta-deep sm:px-6">
            <p className="font-semibold">{item.alerts.length > 1 ? 'Problems' : 'Problem'}</p>
            {item.alerts.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
