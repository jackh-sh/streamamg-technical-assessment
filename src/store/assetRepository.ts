import { type Asset, type CreateAssetInput } from '../types/asset.js'

export interface AssetRepository {
  list(): Promise<Asset[]>
  get(id: string): Promise<Asset | undefined>
  create(input: CreateAssetInput): Promise<Asset>
}
