import { Link } from 'react-router-dom'
import { Card, Badge, Table, TableSkeleton, Skeleton } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'

const quickLinks = [
  { to: '/admin/config', label: 'API Configuration' },
  { to: '/admin/salesmen', label: 'Manage Salesmen' },
  { to: '/admin/logs', label: 'Activity Logs' },
  { to: '/admin/stock-check', label: 'Check Product Stock' },
]

const activityColumns = [
  { key: 'name', label: 'Salesman' },
  {
    key: 'details',
    label: 'Activity',
    render: (row) =>
      row.type === 'search' ? (
        <span className="flex flex-wrap items-center gap-2">
          Searched <span className="font-medium">{row.query}</span>
          <Badge variant={row.found ? 'success' : 'error'}>{row.found ? 'Found' : 'Not found'}</Badge>
        </span>
      ) : row.type === 'login' ? (
        'Logged in'
      ) : row.type === 'problem' ? (
        <span className="text-terracotta-deep">Problem: {row.detail}</span>
      ) : (
        'Asked for a password reset'
      ),
  },
  {
    key: 'timestamp',
    label: 'Time',
    render: (row) => (
      <span className="text-xs text-ink/60">
        {new Date(row.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    ),
  },
]

export default function Dashboard() {
  const { data: statsData, loading: statsLoading, error: statsError } = useFetch('/api/admin/stats')
  const { data: logData, loading: logLoading } = useFetch('/api/admin/logs?pageSize=8')
  const stats = statsData
    ? [
        { label: 'Active Salesmen', value: `${statsData.activeSalesmen} / ${statsData.totalSalesmen}` },
        { label: 'Searches Today', value: statsData.searchesToday },
        { label: 'Logins Today', value: statsData.loginsToday },
        { label: 'Searches (7 days)', value: statsData.searchesWeek },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink/70">Salesman activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="text-center">
                <Skeleton className="mx-auto h-7 w-16" />
                <Skeleton className="mx-auto mt-2 h-3 w-20" />
              </Card>
            ))
          : stats.map((stat) => (
              <Card
                key={stat.label}
                className="text-center transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(43,38,32,0.06),0_8px_20px_rgba(43,38,32,0.08)]"
              >
                <p className="text-2xl font-semibold text-terracotta">{stat.value}</p>
                <p className="mt-1 text-xs text-ink/60">{stat.label}</p>
              </Card>
            ))}
      </div>

      {statsError && <p className="text-sm text-terracotta-deep">{statsError}</p>}

      <Card title="Recent Activity">
        {logLoading ? (
          <TableSkeleton columns={3} rows={4} />
        ) : (
          <Table columns={activityColumns} rows={logData?.logs ?? []} emptyMessage="No activity yet." />
        )}
      </Card>

      <Card title="Quick Links">
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-sage-soft px-5 py-2.5 text-sm font-medium text-terracotta transition-all duration-150 hover:-translate-y-0.5 hover:bg-sand hover:shadow-sm"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
