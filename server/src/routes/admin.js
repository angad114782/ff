import { Router } from 'express'
import { db } from '../db.js'
import { int } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'
import { bcODataRoot, getBcConfig, publicBcConfig, saveBcConfig } from '../services/bcConfig.js'
import { searchStock } from '../services/bcApiService.js'
import salesmenRouter from './salesmen.js'
import vendorsRouter from './vendors.js'

const router = Router()
router.use(requireRole('admin'))

router.use('/salesmen', salesmenRouter)
router.use('/vendors', vendorsRouter)

router.get('/config/bc', (_req, res) => res.json(publicBcConfig()))

router.put('/config/bc', (req, res) => {
  saveBcConfig(req.body ?? {})
  res.json(publicBcConfig())
})

// Fetches a token and runs a one-row search against the saved config.
router.post('/config/bc/test', async (_req, res) => {
  try {
    await searchStock({ pageSize: 1 })
    res.json({ ok: true, odataRoot: bcODataRoot(getBcConfig()) })
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
})

const TYPES = ['login', 'search', 'reset_request', 'problem']

router.get('/logs', (req, res) => {
  const type = TYPES.includes(req.query.type) ? req.query.type : null
  const pageSize = int(req.query.pageSize, 10, { max: 100 })
  const page = int(req.query.page, 1, { max: 100000 })
  const where = type ? 'WHERE type = ?' : ''
  const args = type ? [type] : []

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM logs ${where}`).get(...args)
  const rows = db
    .prepare(`SELECT * FROM logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...args, pageSize, (page - 1) * pageSize)

  res.json({
    total,
    logs: rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      email: r.email,
      query: r.query,
      found: r.found === null ? null : Boolean(r.found),
      detail: r.detail,
      timestamp: r.created_at,
    })),
  })
})

router.get('/stats', (_req, res) => {
  const count = (sql) => db.prepare(sql).get().n
  const since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'start of day')"
  const week = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')"
  res.json({
    activeSalesmen: count("SELECT COUNT(*) AS n FROM users WHERE role = 'salesman' AND active = 1"),
    totalSalesmen: count("SELECT COUNT(*) AS n FROM users WHERE role = 'salesman'"),
    searchesToday: count(`SELECT COUNT(*) AS n FROM logs WHERE type = 'search' AND created_at >= ${since}`),
    loginsToday: count(`SELECT COUNT(*) AS n FROM logs WHERE type = 'login' AND created_at >= ${since}`),
    searchesWeek: count(`SELECT COUNT(*) AS n FROM logs WHERE type = 'search' AND created_at >= ${week}`),
    notFoundWeek: count(`SELECT COUNT(*) AS n FROM logs WHERE type = 'search' AND found = 0 AND created_at >= ${week}`),
  })
})

export default router
