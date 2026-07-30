import Skeleton from './Skeleton'

export default function TableSkeleton({ columns = 4, rows = 5 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-sage-grey">
      <div className="flex gap-4 border-b border-sage-grey bg-sand/50 px-3 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`flex gap-4 border-b border-sage-grey/60 px-3 py-3.5 last:border-b-0 ${
            r % 2 === 1 ? 'bg-sage-grey/10' : ''
          }`}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ animationDelay: `${(r * columns + c) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
