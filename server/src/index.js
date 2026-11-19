import { config } from './config.js'
import { db } from './db.js'
import { createApp } from './app.js'

const server = createApp().listen(config.port, () => {
  console.log(`API listening on :${config.port} (${config.isProd ? 'production' : 'development'})`)
})

function shutdown(signal) {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
