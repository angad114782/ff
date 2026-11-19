import { Router } from 'express'
import { badRequest, notFound } from '../lib/errors.js'
import { int } from '../lib/validate.js'
import { logActivity, logProblem } from '../services/activity.js'
import { BcError, searchStock } from '../services/bcApiService.js'
import { mapItem, mapSummary } from '../services/stockMapper.js'
import { lookupVendor } from '../services/vendorConnector.js'

const router = Router()

// BC problems are reported to the client without leaking upstream details; admins get the
// config hint, salesmen are told to contact an admin.
function bcFailure(err, user) {
  console.error('Business Central error:', err.message)
  logProblem(user, `Business Central: ${err.message}`)
  if (err instanceof BcError && err.configIssue) {
    return {
      status: 503,
      error: user.role === 'admin'
        ? `${err.message} Check API Config.`
        : 'Stock lookup is unavailable right now. Please contact your admin.',
    }
  }
  return { status: 502, error: 'Stock lookup failed. Please try again.' }
}

// GET /api/stock/search?q=<name | item no | SKU>&barcode=<scanned code>&page=1&pageSize=20
// A scanned code (or a pasted scan link) goes to BC as `qrCode`; everything else as `searchText`.
router.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 150)
  const barcode = String(req.query.barcode ?? '').trim().slice(0, 300)
  if (!q && !barcode) throw badRequest('Enter an item to search for.')

  const page = int(req.query.page, 1, { max: 1000 })
  const pageSize = int(req.query.pageSize, 20, { max: 50 })
  const scanned = barcode || (/^https?:\/\//i.test(q) ? q : '')

  let rows
  try {
    rows = await searchStock({
      searchText: scanned ? '' : q,
      qrCode: scanned,
      pageNo: page,
      pageSize,
    })
  } catch (err) {
    const { status, error } = bcFailure(err, req.user)
    return res.status(status).json({ error })
  }

  if (req.user.role === 'salesman') {
    logActivity({ type: 'search', user: req.user, query: scanned || q, found: rows.length > 0 })
  }
  // Combined total = our stock + vendor stock. A single match opens the detail page, which does
  // its own vendor lookup, so skip the extra call there.
  // One match: warm the vendor cache now so the detail page opens without waiting on the vendor.
  if (rows.length === 1) lookupVendor(rows[0].PrimaryVendorName, rows[0].ExternalItemId).catch(() => {})
  const items = await Promise.all(
    rows.map(async (row) => {
      const summary = mapSummary(row)
      if (rows.length === 1) return summary
      const vendor = await lookupVendor(row.PrimaryVendorName, row.ExternalItemId)
      summary.vendorStock = vendor.status === 'ok' ? vendor.stock : null
      summary.total = Math.round((summary.current + (summary.vendorStock ?? 0)) * 100) / 100
      // "Non stock" items live at the vendor: in stock if we OR the vendor can supply it.
      summary.status = summary.available > 0 || (summary.vendorStock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'
      return summary
    }),
  )
  res.json({ items, page, pageSize, hasMore: rows.length >= pageSize })
})

// GET /api/stock/item/:code — full detail for one item no.
router.get('/item/:code', async (req, res) => {
  const code = String(req.params.code).trim().slice(0, 100)
  let rows
  try {
    rows = await searchStock({ searchText: code, pageSize: 25 })
  } catch (err) {
    const { status, error } = bcFailure(err, req.user)
    return res.status(status).json({ error })
  }

  const row = rows.find((r) => String(r.itemNo).toLowerCase() === code.toLowerCase())
  if (!row) throw notFound(`No item found for “${code}”.`)

  const admin = req.user.role === 'admin'
  const item = mapItem(row, { admin })
  item.vendor = await lookupVendor(row.PrimaryVendorName, row.ExternalItemId)
  // Problems are shown at the bottom of the page and kept in the logs. Salesmen get a plain
  // sentence only: vendor names and technical reasons stay with admins.
  item.alerts = []
  if (item.vendor.status === 'error') {
    logProblem(req.user, item.vendor.message, code)
    item.alerts.push(admin ? item.vendor.message : 'Vendor stock could not be checked right now.')
  }
  if (!admin) delete item.vendor.message
  item.totalStock = Math.round((item.stock.current + (item.vendor.status === 'ok' ? item.vendor.stock ?? 0 : 0)) * 100) / 100
  if (item.vendor.status === 'ok' && (item.vendor.stock ?? 0) > 0) item.status = 'in_stock'
  res.json({ item })
})

export default router
