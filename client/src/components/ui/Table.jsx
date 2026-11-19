// Clicks on buttons, switches and fields inside a row belong to them, not to the row.
const INTERACTIVE = 'button, a, input, select, textarea, label, [role="switch"]'

export default function Table({ columns, rows, emptyMessage = 'No records found.', onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-sage-grey">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-sage-grey bg-sand/50">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/60">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-ink/60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={onRowClick ? (e) => !e.target.closest(INTERACTIVE) && onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(row)
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={`${onRowClick ? 'cursor-pointer ' : ''}border-b border-sage-grey/60 transition-colors duration-150 last:border-b-0 hover:bg-sand/50 ${
                  i % 2 === 1 ? 'bg-sage-grey/10' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 align-middle text-ink">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
