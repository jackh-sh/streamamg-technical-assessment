import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { AssetStatus, AssetType } from '../types/asset.js'
import { type AssetRepository } from '../store/assetRepository.js'

const AssetSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
  status: z.enum([AssetStatus.PROCESSING, AssetStatus.READY]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Asset')

const CreateAssetSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
}).openapi('CreateAsset')

const createAssetRoute = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: {
      content: { 'application/json': { schema: CreateAssetSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: AssetSchema } },
      description: 'Asset created',
    },
  },
})

export function assetRoutes(repo: AssetRepository) {
  const app = new OpenAPIHono()

  app.openapi(createAssetRoute, async (c) => {
    const input = c.req.valid('json')
    const asset = await repo.create(input)
    return c.json({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    }, 201)
  })

  return app
}
