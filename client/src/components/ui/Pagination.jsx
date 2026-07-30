const PAGE_SIZE_OPTIONS = [10, 25, 50]

function getPageNumbers(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
}

export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sage-grey pt-4">
      <div className="flex items-center gap-3 text-sm text-ink/60">
        <span>
          {start}–{end} of {totalItems}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-sage-grey px-2 py-1 text-sm outline-none transition-colors duration-150 hover:border-sage-soft focus:border-terracotta focus:ring-2 focus:ring-terracotta/40"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Prev
        </button>

        {pageNumbers.map((p, i) => {
          const prev = pageNumbers[i - 1]
          const showEllipsis = prev !== undefined && p - prev > 1
          return (
            <span key={p} className="flex items-center">
              {showEllipsis && <span className="px-1 text-ink/40">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-8 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  p === page ? 'bg-terracotta text-linen shadow-sm' : 'text-ink hover:bg-sand'
                }`}
              >
                {p}
              </button>
            </span>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>
    </div>
  )
}
