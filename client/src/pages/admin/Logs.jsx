import { useMemo, useState } from 'react'
import { Card, Badge, Table, Pagination, TableSkeleton } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useLoading } from '../../hooks/useLoading'

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'login', label: 'Logins' },
  { value: 'search', label: 'Searches' },
]

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Logs() {
  const { logs } = useApp()
  const isLoading = useLoading()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((log) => log.type === filter)),
    [logs, filter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function handleFilterChange(value) {
    setFilter(value)
    setPage(1)
  }

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'login' ? 'neutral' : 'success'}>
          {row.type === 'login' ? 'Login' : 'Search'}
        </Badge>
      ),
    },
    {
      key: 'name',
      label: 'Salesman',
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.name}</p>
          <p className="text-xs text-ink/60">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (row) =>
        row.type === 'login' ? (
          <span className="text-ink/70">Logged in</span>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-ink/70">
            Searched <span className="font-medium text-ink">{row.query}</span>
            <Badge variant={row.found ? 'success' : 'error'}>{row.found ? 'Found' : 'Not found'}</Badge>
          </span>
        ),
    },
    {
      key: 'timestamp',
      label: 'Time',
      render: (row) => <span className="text-xs text-ink/60">{formatTimestamp(row.timestamp)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Activity Logs</h1>
        <p className="text-sm text-ink/70">Salesman logins and product searches, most recent first.</p>
      </div>

      <Card>
        <div className="mb-4 flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                filter === f.value ? 'bg-terracotta text-linen shadow-sm' : 'text-ink hover:bg-sand'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton columns={4} rows={pageSize > 10 ? 10 : pageSize} />
        ) : (
          <>
            <Table columns={columns} rows={pageItems} emptyMessage="No activity yet." />
            <div className="mt-4">
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
