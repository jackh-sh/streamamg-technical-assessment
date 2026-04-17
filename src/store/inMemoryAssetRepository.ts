import { randomUUID } from "node:crypto";
import {
    type Asset,
    type CreateAssetInput,
    AssetStatus,
} from "../types/asset.js";
import {
    type AssetRepository,
    type ListAssetsFilter,
} from "./assetRepository.js";

export class InMemoryAssetRepository implements AssetRepository {
    private assets = new Map<string, Asset>();

    async list(filter?: ListAssetsFilter): Promise<Asset[]> {
        let assets = Array.from(this.assets.values()).filter((a) => {
            if (filter?.status && a.status !== filter.status) return false;
            if (filter?.type && a.type !== filter.type) return false;
            if (
                filter?.title &&
                !a.title.toLowerCase().includes(filter.title.toLowerCase())
            )
                return false;
            if (filter?.from && a.createdAt < filter.from) return false;
            if (filter?.to && a.createdAt > filter.to) return false;
            return true;
        });
        const offset = filter?.offset ?? 0;
        const limit = filter?.limit;
        assets = assets.slice(
            offset,
            limit !== undefined ? offset + limit : undefined,
        );
        return assets;
    }

    async get(id: string): Promise<Asset | undefined> {
        return this.assets.get(id);
    }

    async update(id: string, patch: { status: AssetStatus }): Promise<Asset | undefined> {
        const asset = this.assets.get(id);
        if (!asset) return undefined;
        const updated = { ...asset, ...patch, updatedAt: new Date() };
        this.assets.set(id, updated);
        return updated;
    }

    async create(input: CreateAssetInput): Promise<Asset> {
        const now = new Date();
        const asset: Asset = {
            id: randomUUID(),
            title: input.title,
            type: input.type,
            status: AssetStatus.PROCESSING,
            createdAt: now,
            updatedAt: now,
        };
        this.assets.set(asset.id, asset);
        return asset;
    }
}
