export default function Table({ columns, rows, emptyMessage = 'No records found.' }) {
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
                className={`border-b border-sage-grey/60 transition-colors duration-150 last:border-b-0 hover:bg-sand/50 ${
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
