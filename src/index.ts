import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { InMemoryAssetRepository } from './store/inMemoryAssetRepository.js'
import { assetRoutes } from './routes/assets.js'

const repo = new InMemoryAssetRepository()

const app = new Hono()

app.route('/asset', assetRoutes(repo))

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
