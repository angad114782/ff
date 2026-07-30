import { Link } from 'react-router-dom'
import { Card, Badge, Table, TableSkeleton, Skeleton } from '../../components/ui'
import { dashboardStats, recentSyncs } from '../../mock/data'
import { useApp } from '../../context/AppContext'
import { useLoading } from '../../hooks/useLoading'

const quickLinks = [
  { to: '/admin/config', label: 'API Configuration' },
  { to: '/admin/salesmen', label: 'Manage Salesmen' },
  { to: '/admin/stock-upload', label: 'Stock Sync' },
  { to: '/admin/stock-check', label: 'Check Product Stock' },
]

const syncColumns = [
  { key: 'file', label: 'File' },
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

export default function Dashboard() {
  const { salesmen } = useApp()
  const isLoading = useLoading()
  const stats = dashboardStats.map((stat) =>
    stat.label === 'Active Salesmen'
      ? { ...stat, value: salesmen.filter((s) => s.active).length.toString() }
      : stat,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink/70">Stock overview across all branches.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading
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

      <Card title="Recent Syncs">
        {isLoading ? <TableSkeleton columns={4} rows={3} /> : <Table columns={syncColumns} rows={recentSyncs} />}
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
