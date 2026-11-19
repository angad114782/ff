import { Router } from 'express'
import { logs, users } from '../db.js'
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

router.get('/config/bc', async (_req, res) => res.json(await publicBcConfig()))

router.put('/config/bc', async (req, res) => {
  await saveBcConfig(req.body ?? {})
  res.json(await publicBcConfig())
})

// Fetches a token and runs a one-row search against the saved config.
router.post('/config/bc/test', async (_req, res) => {
  try {
    await searchStock({ pageSize: 1 })
    res.json({ ok: true, odataRoot: bcODataRoot(await getBcConfig()) })
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
})

const TYPES = ['login', 'search', 'reset_request', 'problem']

router.get('/logs', async (req, res) => {
  const type = TYPES.includes(req.query.type) ? req.query.type : null
  const pageSize = int(req.query.pageSize, 10, { max: 100 })
  const page = int(req.query.page, 1, { max: 100000 })
  const filter = type ? { type } : {}

  const [total, found] = await Promise.all([
    logs.countDocuments(filter),
    logs.find(filter).sort({ created_at: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
  ])

  res.json({
    total,
    logs: found.map((r) => ({
      id: r._id,
      type: r.type,
      name: r.name,
      email: r.email,
      query: r.query,
      found: r.found ?? null,
      detail: r.detail,
      timestamp: r.created_at,
    })),
  })
})

router.get('/stats', async (_req, res) => {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const today = startOfDay.toISOString()
  const week = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [activeSalesmen, totalSalesmen, searchesToday, loginsToday, searchesWeek, notFoundWeek] = await Promise.all([
    users.countDocuments({ role: 'salesman', active: true }),
    users.countDocuments({ role: 'salesman' }),
    logs.countDocuments({ type: 'search', created_at: { $gte: today } }),
    logs.countDocuments({ type: 'login', created_at: { $gte: today } }),
    logs.countDocuments({ type: 'search', created_at: { $gte: week } }),
    logs.countDocuments({ type: 'search', found: false, created_at: { $gte: week } }),
  ])
  res.json({ activeSalesmen, totalSalesmen, searchesToday, loginsToday, searchesWeek, notFoundWeek })
})

export default router
