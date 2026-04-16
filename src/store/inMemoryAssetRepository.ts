import { randomUUID } from 'node:crypto'
import { type Asset, type CreateAssetInput, AssetStatus } from '../types/asset.js'
import { type AssetRepository } from './assetRepository.js'

export class InMemoryAssetRepository implements AssetRepository {
  private assets = new Map<string, Asset>()

  async list(): Promise<Asset[]> {
    return Array.from(this.assets.values())
  }

  async get(id: string): Promise<Asset | undefined> {
    return this.assets.get(id)
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const now = new Date()
    const asset: Asset = {
      id: randomUUID(),
      title: input.title,
      type: input.type,
      status: AssetStatus.PROCESSING,
      createdAt: now,
      updatedAt: now,
    }
    this.assets.set(asset.id, asset)
    return asset
  }
}
