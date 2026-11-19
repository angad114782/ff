import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { bootstrapAdmin } from './db.js'
import { HttpError } from './lib/errors.js'
import { originCheck } from './middleware/security.js'
import { requireAuth } from './middleware/auth.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import stockRouter from './routes/stock.js'
import mediaRouter from './routes/media.js'

export async function createApp() {
  await bootstrapAdmin()

  const app = express()
  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', config.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'], // vendor product photos
          mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'self'"], // PDFs render inline from /api/media
          frameSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(originCheck)

  // Broad safety net against scripted abuse; login and setup have their own, much stricter limits.
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Slow down.' } }))
  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRouter)
  app.use('/api/stock', requireAuth, stockRouter)
  app.use('/api/media', mediaRouter)
  app.use('/api/admin', requireAuth, adminRouter)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))

  // Production: serve the built client, with SPA fallback for client-side routes.
  if (existsSync(join(config.clientDist, 'index.html'))) {
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(join(config.clientDist, 'index.html'))
    })
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (100 MB max).' : err.message
      return res.status(400).json({ error: msg })
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' })
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong.' })
  })

  return app
}
