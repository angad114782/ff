import { useState } from 'react'
import { Card, Button, Badge, Table, TableSkeleton, Skeleton } from '../../components/ui'
import { recentSyncs as initialSyncs } from '../../mock/data'
import { useLoading } from '../../hooks/useLoading'

const syncColumns = [
  { key: 'file', label: 'Source' },
  { key: 'syncedAt', label: 'Synced At' },
  { key: 'rows', label: 'Rows' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge variant={row.status === 'success' ? 'success' : 'error'}>
        {row.status === 'success' ? 'Success' : 'Failed'}
      </Badge>
    ),
  },
]

export default function StockUpload() {
  const isLoading = useLoading()
  const [syncs, setSyncs] = useState(initialSyncs)
  const [syncing, setSyncing] = useState(false)

  const lastSync = syncs[0]

  function handleSync() {
    setSyncing(true)
    // TODO: replace with a real call to POST /api/admin/stock/sync once the backend exists —
    // it should pull the latest stock from whichever source is configured on the API Config
    // screen (ERP API, or the FTP pull job). No manual file upload is exposed to the admin.
    setTimeout(() => {
      setSyncs((list) => [
        {
          id: Date.now(),
          file: 'ERP API',
          syncedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          status: 'success',
          rows: 3482,
        },
        ...list,
      ])
      setSyncing(false)
    }, 1200)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stock Sync</h1>
        <p className="text-sm text-ink/70">
          Inventory syncs automatically from the ERP API and/or FTP source configured under API Config. There
          is no manual stock upload — trigger an on-demand sync below if needed.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink/60">Last synced</p>
              <p className="text-sm font-medium text-ink">{lastSync ? lastSync.syncedAt : 'Never'}</p>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        )}
      </Card>

      <Card title="Recent Syncs">
        {isLoading ? <TableSkeleton columns={4} rows={3} /> : <Table columns={syncColumns} rows={syncs} />}
      </Card>
    </div>
  )
}
