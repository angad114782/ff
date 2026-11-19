import { useState } from 'react'
import { Card, Badge, Table, Pagination, TableSkeleton } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'login', label: 'Logins' },
  { value: 'search', label: 'Searches' },
  { value: 'reset_request', label: 'Reset requests' },
  { value: 'problem', label: 'Problems' },
]

const TYPE_LABELS = { login: 'Login', search: 'Search', reset_request: 'Reset request', problem: 'Problem' }

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Logs() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const query = new URLSearchParams({ page, pageSize, ...(filter === 'all' ? {} : { type: filter }) })
  const { data, loading, error } = useFetch(`/api/admin/logs?${query}`)
  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const isLoading = loading && !data
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)

  function handleFilterChange(value) {
    setFilter(value)
    setPage(1)
  }

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'search' ? 'success' : row.type === 'problem' ? 'error' : 'neutral'}>{TYPE_LABELS[row.type]}</Badge>
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
        ) : row.type === 'problem' ? (
          <span className="text-terracotta-deep">
            {row.detail}
            {row.query ? <span className="text-ink/60"> · item {row.query}</span> : null}
          </span>
        ) : row.type === 'reset_request' ? (
          <span className="text-ink/70">Asked for a password reset — set one under Salesmen</span>
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
        <p className="text-sm text-ink/70">Salesman logins, searches, password-reset requests and problems (vendor or Business Central failures), most recent first.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
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

        {error && <p className="mb-3 text-sm text-terracotta-deep">{error}</p>}
        {isLoading ? (
          <TableSkeleton columns={4} rows={pageSize > 10 ? 10 : pageSize} />
        ) : (
          <>
            <Table columns={columns} rows={logs} emptyMessage="No activity yet." />
            <div className="mt-4">
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                totalItems={total}
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
