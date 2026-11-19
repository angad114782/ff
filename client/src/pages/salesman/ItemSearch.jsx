import StockSearch from '../../components/StockSearch'

export default function ItemSearch() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold text-ink">Item Search</h1>
        <p className="text-sm text-ink/70">Scan a barcode or search by item no, name or SKU.</p>
      </div>
      <StockSearch detailPath={(code) => `/salesman/item/${code}`} />
    </div>
  )
}
