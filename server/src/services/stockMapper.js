// Maps a Business Central SearchStock row to the shape the client renders.
//
// Quantities (verified against sample data):
//   currentStock = sum of lots  (= QtyFree + QtySO)
//   reserved     = QtySO        (open sales orders)
//   available    = QtyFree      (can be negative when over-committed)

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : 0)
const text = (v) => (v === null || v === undefined ? '' : String(v).trim())
const orNull = (v) => text(v) || null

export function mapSummary(row) {
  const available = round2(num(row.QtyFree))
  return {
    code: text(row.itemNo),
    name: text(row.itemName),
    collection: orNull(row.collectionCode),
    color: orNull(row.Color),
    uom: orNull(row.UOM),
    available,
    current: round2(Array.isArray(row.lots) && row.lots.length
      ? row.lots.reduce((sum, l) => sum + num(l.quantity), 0)
      : available + num(row.QtySO)),
    status: available > 0 ? 'in_stock' : 'out_of_stock',
  }
}

export function mapItem(row, { admin = false } = {}) {
  const lots = (Array.isArray(row.lots) ? row.lots : []).map((l) => ({
    lotNo: text(l.lotNo),
    location: text(l.locationCode),
    qty: round2(num(l.quantity)),
  }))

  const byLocation = new Map()
  for (const lot of lots) byLocation.set(lot.location, round2((byLocation.get(lot.location) ?? 0) + lot.qty))

  const available = round2(num(row.QtyFree))
  const reserved = round2(num(row.QtySO))
  const lotTotal = round2(lots.reduce((sum, l) => sum + l.qty, 0))

  const item = {
    ...mapSummary(row),
    category: orNull(row.Category),
    family: orNull(row.itemFamily) ?? orNull(row.ItemFamily),
    productLook: orNull(row.ProductLook),
    width: orNull(row.width),
    length: orNull(row.length),
    horizontalRepeat: orNull(row.horizontalRepeat),
    verticalRepeat: orNull(row.verticalRepeat),
    mrp: row.mrp === undefined ? null : round2(num(row.mrp)),
    qrCode: orNull(row.qrCode),
    stock: {
      current: lots.length ? lotTotal : round2(available + reserved),
      reserved,
      available,
      locations: [...byLocation].map(([location, qty]) => ({ location, qty })).sort((a, b) => a.location.localeCompare(b.location)),
      lots,
    },
    po: {
      qty: round2(num(row.QtyPO)),
      transport: orNull(row.Transport),
      biltyNo: orNull(row.BiltyNo),
      biltyDate: orNull(row.BiltyDate),
      deliveryStatus: orNull(row.DeliveryStatus),
      deliveryDate: orNull(row.DeliveryDate),
    },
  }

  // Purchase price and vendor details never leave the server for salesman accounts.
  if (admin) {
    item.admin = {
      searchName: orNull(row.SerachName),
      purchasePrice: row.PurchasePrices === undefined ? null : round2(num(row.PurchasePrices)),
      vendorName: orNull(row.PrimaryVendorName),
      vendorGroup: orNull(row.VendorGroup),
      contactNo: orNull(row.ContactNo),
      externalItemId: orNull(row.ExternalItemId),
    }
  }
  return item
}
