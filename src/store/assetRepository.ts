import {
    type Asset,
    type CreateAssetInput,
    AssetStatus,
    AssetType,
} from "../types/asset.js";

export interface ListAssetsFilter {
    status?: AssetStatus;
    type?: AssetType;
    title?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
}

export interface AssetRepository {
    list(filter?: ListAssetsFilter): Promise<Asset[]>;
    get(id: string): Promise<Asset | undefined>;
    create(input: CreateAssetInput): Promise<Asset>;
    update(id: string, patch: { status: AssetStatus }): Promise<Asset | undefined>;
}
