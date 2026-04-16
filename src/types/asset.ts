export enum AssetType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum AssetStatus {
  PROCESSING = 'processing',
  READY = 'ready',
}

export interface Asset {
  id: string
  title: string
  type: AssetType
  status: AssetStatus
  createdAt: Date
  updatedAt: Date
}

export type CreateAssetInput = Pick<Asset, 'title' | 'type'>
