// Placeholder data — the real backend (Node/Express + MongoDB) will replace this.

export const adminProfile = {
  name: 'Angad Yadav',
  email: 'admin@fandf.in',
  phone: '+91 98765 43210',
  role: 'Administrator',
}

export const salesmen = [
  { id: 1, name: 'Rohit Sharma', email: 'rohit.sharma@fandf.in', phone: '+91 98100 12345', branch: 'Gurgaon', active: true },
  { id: 2, name: 'Priya Nair', email: 'priya.nair@fandf.in', phone: '+91 98200 54321', branch: 'Mumbai', active: true },
  { id: 3, name: 'Arjun Mehta', email: 'arjun.mehta@fandf.in', phone: '+91 99110 67890', branch: 'Bengaluru', active: true },
]

// Items with more than one entry in `locations` render as horizontal tabs on
// the item detail page — one tab per branch/store carrying that SKU. Only
// branches actually present in `locations` get a tab; nothing is auto-added
// for branches the item isn't stocked in.
//
// The extra fields (vendor/PO/batch/pricing) back the Admin-only "complete
// details" view — Salesman keeps the stock-only view (no pricing) per the
// earlier rule.
export const stockItems = [
  {
    id: 1,
    code: 'FF-CUSH-2201',
    name: 'Wild Terracotta Cushion Cover',
    searchName: 'CUSH-TERRACOTTA-2201',
    locations: [
      {
        branch: 'Gurgaon',
        status: 'in_stock',
        qty: 42,
        itemFamilyCode: 'STOCK',
        reservedQty: 4,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'TEE GEE FABRICS',
        contactNo: '+91 98110 22334',
        externalItemNo: 'JES150-5',
        purchasePrice: 640,
        mrp: 1499,
        dp: 1050,
        poDetails: {
          qtyInPO: 90,
          expected: '15/07/2026',
          biltyNo: '—',
          biltyDate: '—',
          transport: 'BY TEMPO',
          status: 'RECEIVED',
        },
        technicalDetails: {
          material: 'Cotton Velvet',
          dimensions: '45 x 45 cm',
          weight: '0.4 kg',
          finish: 'Machine Wash',
        },
        batches: [
          { batch: '16538', loc: 'FFDH', company: 'FFI', qty: 12 },
          { batch: '19157', loc: 'FFDH', company: 'FFI', qty: 20 },
          { batch: '20731', loc: 'FFDH', company: 'FFI', qty: 10 },
        ],
      },
      {
        branch: 'Mumbai',
        status: 'in_stock',
        qty: 18,
        itemFamilyCode: 'STOCK',
        reservedQty: 0,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'TEE GEE FABRICS',
        contactNo: '+91 98110 22334',
        externalItemNo: 'JES150-5',
        purchasePrice: 640,
        mrp: 1499,
        dp: 1050,
        poDetails: {
          qtyInPO: 30,
          expected: '18/07/2026',
          biltyNo: '—',
          biltyDate: '—',
          transport: 'BY ROAD',
          status: 'RECEIVED',
        },
        technicalDetails: {
          material: 'Cotton Velvet',
          dimensions: '45 x 45 cm',
          weight: '0.4 kg',
          finish: 'Machine Wash',
        },
        batches: [{ batch: '20981', loc: 'FFMB', company: 'FFI', qty: 18 }],
      },
    ],
  },
  {
    id: 2,
    code: 'FF-RUG-1140',
    name: 'Sand Weave Area Rug',
    searchName: 'RUG-SANDWEAVE-1140',
    locations: [
      {
        branch: 'Mumbai',
        status: 'out_of_stock',
        qty: 0,
        itemFamilyCode: 'STOCK',
        reservedQty: 0,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'JAIPUR LOOM CO.',
        contactNo: '+91 98220 44556',
        externalItemNo: 'JLC-402',
        purchasePrice: 3200,
        mrp: 6999,
        dp: 5200,
        poDetails: {
          qtyInPO: 40,
          expected: '02/08/2026',
          biltyNo: '—',
          biltyDate: '—',
          transport: 'BY TEMPO',
          status: 'PENDING',
        },
        technicalDetails: {
          material: 'Jute & Wool Blend',
          dimensions: '160 x 230 cm',
          weight: '4.2 kg',
          finish: 'Hand Woven',
        },
        batches: [],
      },
    ],
  },
  {
    id: 3,
    code: 'FF-VASE-0872',
    name: 'Linen Ceramic Vase',
    searchName: 'VASE-LINEN-0872',
    locations: [
      {
        branch: 'Bengaluru',
        status: 'in_stock',
        qty: 15,
        itemFamilyCode: 'STOCK',
        reservedQty: 2,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'CLAYWORKS STUDIO',
        contactNo: '+91 98450 11223',
        externalItemNo: 'CWS-0872',
        purchasePrice: 410,
        mrp: 999,
        dp: 720,
        poDetails: {
          qtyInPO: 25,
          expected: '20/07/2026',
          biltyNo: '—',
          biltyDate: '—',
          transport: 'BY TEMPO',
          status: 'RECEIVED',
        },
        technicalDetails: {
          material: 'Ceramic',
          dimensions: '18 x 18 x 30 cm',
          weight: '1.1 kg',
          finish: 'Matte Glaze',
        },
        batches: [{ batch: '30221', loc: 'FFBL', company: 'FFI', qty: 15 }],
      },
      {
        branch: 'Gurgaon',
        status: 'out_of_stock',
        qty: 0,
        itemFamilyCode: 'STOCK',
        reservedQty: 0,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'CLAYWORKS STUDIO',
        contactNo: '+91 98450 11223',
        externalItemNo: 'CWS-0872',
        purchasePrice: 410,
        mrp: 999,
        dp: 720,
        poDetails: {
          qtyInPO: 0,
          expected: '—',
          biltyNo: '—',
          biltyDate: '—',
          transport: '—',
          status: 'NOT RAISED',
        },
        technicalDetails: {
          material: 'Ceramic',
          dimensions: '18 x 18 x 30 cm',
          weight: '1.1 kg',
          finish: 'Matte Glaze',
        },
        batches: [],
      },
    ],
  },
  {
    id: 4,
    code: 'FF-THRW-3305',
    name: 'Sage Knit Throw Blanket',
    searchName: 'THRW-SAGEKNIT-3305',
    locations: [
      {
        branch: 'Gurgaon',
        status: 'in_stock',
        qty: 8,
        itemFamilyCode: 'STOCK',
        reservedQty: 1,
        vendorGroup: 'CR-DOM-SUP',
        primaryVendor: 'TEE GEE FABRICS',
        contactNo: '+91 98110 22334',
        externalItemNo: 'JES150-9',
        purchasePrice: 890,
        mrp: 1999,
        dp: 1450,
        poDetails: {
          qtyInPO: 15,
          expected: '25/07/2026',
          biltyNo: '—',
          biltyDate: '—',
          transport: 'BY TEMPO',
          status: 'RECEIVED',
        },
        technicalDetails: {
          material: 'Merino Wool Knit',
          dimensions: '130 x 170 cm',
          weight: '0.9 kg',
          finish: 'Dry Clean',
        },
        batches: [{ batch: '18845', loc: 'FFDH', company: 'FFI', qty: 8 }],
      },
    ],
  },
]

export const recentSyncs = [
  { id: 1, file: 'stock_gurgaon_23jul.xlsx', syncedAt: '2026-07-23 09:14', status: 'success', rows: 1204 },
  { id: 2, file: 'stock_mumbai_22jul.csv', syncedAt: '2026-07-22 18:02', status: 'success', rows: 986 },
  { id: 3, file: 'stock_bengaluru_22jul.csv', syncedAt: '2026-07-22 11:47', status: 'failed', rows: 0 },
]

export const dashboardStats = [
  { label: 'Total SKUs', value: '3,482' },
  { label: 'In Stock', value: '3,110' },
  { label: 'Out of Stock', value: '372' },
  { label: 'Active Salesmen', value: salesmen.filter((s) => s.active).length.toString() },
]

// Seed activity history so the Logs screen has enough rows to demonstrate pagination.
export const seedLogs = Array.from({ length: 42 }, (_, i) => {
  const person = salesmen[i % salesmen.length]
  const isSearch = i % 3 !== 0
  const timestamp = new Date(Date.now() - i * 5 * 3600 * 1000).toISOString()

  return isSearch
    ? {
        id: `seed-${i}`,
        type: 'search',
        name: person.name,
        email: person.email,
        query: stockItems[i % stockItems.length].code,
        found: i % 7 !== 0,
        timestamp,
      }
    : {
        id: `seed-${i}`,
        type: 'login',
        name: person.name,
        email: person.email,
        timestamp,
      }
})
