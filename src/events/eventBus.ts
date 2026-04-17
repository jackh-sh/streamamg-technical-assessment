import type { Asset } from "../types/asset.js";

export interface AssetEvents {
    "asset.created": Asset;
    "asset.ready": Asset;
}

export type AssetEventName = keyof AssetEvents;
export type AssetEventPayload<T extends AssetEventName> = AssetEvents[T];

export interface EventBus {
    emit<T extends AssetEventName>(event: T, payload: AssetEventPayload<T>): void;
    on<T extends AssetEventName>(event: T, listener: (payload: AssetEventPayload<T>) => void): void;
    off<T extends AssetEventName>(event: T, listener: (payload: AssetEventPayload<T>) => void): void;
}
