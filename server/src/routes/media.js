import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { extname, join } from 'node:path'
import multer from 'multer'
import { config } from '../config.js'
import { db } from '../db.js'
import { badRequest, notFound } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

mkdirSync(config.uploadDir, { recursive: true })

// Allowlist by mime type; the stored extension is derived from the mime, never from the client's filename.
const TYPES = {
  'image/jpeg': { type: 'image', ext: '.jpg' },
  'image/png': { type: 'image', ext: '.png' },
  'image/webp': { type: 'image', ext: '.webp' },
  'application/pdf': { type: 'pdf', ext: '.pdf' },
  'video/mp4': { type: 'video', ext: '.mp4' },
  'video/webm': { type: 'video', ext: '.webm' },
}
const MAX_BYTES = 100 * 1024 * 1024

const upload = multer({
  limits: { fileSize: MAX_BYTES, files: 10 },
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${randomBytes(16).toString('hex')}${TYPES[file.mimetype]?.ext ?? ''}`),
  }),
  fileFilter: (req, file, cb) => {
    // Hero banners must be images; "upcoming" also takes PDFs and videos.
    const info = TYPES[file.mimetype]
    const allowed = info && (req.params.kind === 'upcoming' || info.type === 'image')
    cb(allowed ? null : badRequest(`Unsupported file type: ${file.mimetype || 'unknown'}.`), Boolean(allowed))
  },
})

const router = Router()
router.use(requireAuth)

function kindGuard(req, _res, next) {
  next(['hero', 'upcoming'].includes(req.params.kind) ? undefined : notFound())
}

const present = (m) => ({ id: m.id, kind: m.kind, name: m.name, type: m.type, url: `/api/media/file/${m.id}` })

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM media ORDER BY id').all()
  res.json({
    heroImages: rows.filter((m) => m.kind === 'hero').map(present),
    upcoming: rows.filter((m) => m.kind === 'upcoming').map(present),
  })
})

router.get('/file/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(Number(req.params.id))
  if (!m) throw notFound()
  res.type(m.mime)
  res.set('Content-Disposition', 'inline')
  res.set('Cache-Control', 'private, max-age=3600')
  res.sendFile(join(config.uploadDir, m.file))
})

router.post('/:kind', requireRole('admin'), kindGuard, upload.array('files', 10), (req, res) => {
  if (!req.files?.length) throw badRequest('Choose at least one file.')
  const insert = db.prepare('INSERT INTO media (kind, name, type, mime, file) VALUES (?, ?, ?, ?, ?)')
  const created = req.files.map((f) => {
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 150)
    const { lastInsertRowid } = insert.run(req.params.kind, name, TYPES[f.mimetype].type, f.mimetype, f.filename)
    return present(db.prepare('SELECT * FROM media WHERE id = ?').get(lastInsertRowid))
  })
  res.status(201).json({ media: created })
})

router.delete('/:id', requireRole('admin'), (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(Number(req.params.id))
  if (!m) throw notFound()
  db.prepare('DELETE FROM media WHERE id = ?').run(m.id)
  rmSync(join(config.uploadDir, m.file), { force: true })
  res.status(204).end()
})

export default router
