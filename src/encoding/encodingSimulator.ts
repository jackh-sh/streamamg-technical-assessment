import { AssetStatus, type Asset } from "../types/asset.js";
import { type AssetRepository } from "../store/assetRepository.js";
import { type EventBus } from "../events/eventBus.js";

const MIN_MS = 1_000;
const MAX_MS = 5_000;

export function simulateEncoding(repo: AssetRepository, eventBus: EventBus, asset: Asset, delay?: number): void {
    const ms = delay ?? MIN_MS + Math.random() * (MAX_MS - MIN_MS);
    setTimeout(async () => {
        const updated = await repo.update(asset.id, { status: AssetStatus.READY });
        if (updated) {
            eventBus.emit("asset.ready", updated);
        }
    }, ms);
}
