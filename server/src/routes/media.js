import { Router } from 'express'
import multer from 'multer'
import { badRequest, notFound } from '../lib/errors.js'
import { media, mediaFiles, nextId, now, row } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

// Allowlist by mime type. Uploaded files are stored inside the database (GridFS), so the app needs no disk.
const TYPES = {
  'image/jpeg': { type: 'image' },
  'image/png': { type: 'image' },
  'image/webp': { type: 'image' },
  'application/pdf': { type: 'pdf' },
  'video/mp4': { type: 'video' },
  'video/webm': { type: 'video' },
}
const MAX_BYTES = 100 * 1024 * 1024

// Streams each upload straight into GridFS (no temp files, no 100 MB buffers in memory).
const gridStorage = {
  _handleFile(_req, file, cb) {
    const out = mediaFiles.openUploadStream(file.originalname, { contentType: file.mimetype })
    file.stream.pipe(out)
    out.on('error', cb)
    out.on('finish', () => cb(null, { fileId: out.id, size: out.length }))
  },
  _removeFile(_req, file, cb) {
    mediaFiles.delete(file.fileId).then(() => cb(null), () => cb(null))
  },
}

const upload = multer({
  limits: { fileSize: MAX_BYTES, files: 10 },
  storage: gridStorage,
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

router.get('/', async (_req, res) => {
  const rows = (await media.find().sort({ _id: 1 }).toArray()).map(row)
  res.json({
    heroImages: rows.filter((m) => m.kind === 'hero').map(present),
    upcoming: rows.filter((m) => m.kind === 'upcoming').map(present),
  })
})

router.get('/file/:id', async (req, res) => {
  const m = await media.findOne({ _id: Number(req.params.id) })
  if (!m) throw notFound()
  res.type(m.mime)
  res.set('Content-Disposition', 'inline')
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Cache-Control', 'private, max-age=3600')
  const stream = mediaFiles.openDownloadStream(m.file_id)
  stream.on('error', () => (res.headersSent ? res.destroy() : res.status(404).end()))
  stream.pipe(res)
})

router.post('/:kind', requireRole('admin'), kindGuard, upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) throw badRequest('Choose at least one file.')
  const created = []
  for (const f of req.files) {
    const doc = {
      _id: await nextId('media'),
      kind: req.params.kind,
      name: Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 150),
      type: TYPES[f.mimetype].type,
      mime: f.mimetype,
      file_id: f.fileId,
      created_at: now(),
    }
    await media.insertOne(doc)
    created.push(present(row(doc)))
  }
  res.status(201).json({ media: created })
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const m = await media.findOne({ _id: Number(req.params.id) })
  if (!m) throw notFound()
  await media.deleteOne({ _id: m._id })
  await mediaFiles.delete(m.file_id).catch(() => {})
  res.status(204).end()
})

export default router
