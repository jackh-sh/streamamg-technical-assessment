import { EventEmitter } from "node:events";
import type { EventBus, AssetEventName, AssetEventPayload } from "./eventBus.js";

export class InMemoryEventBus implements EventBus {
    private emitter = new EventEmitter();

    emit<T extends AssetEventName>(event: T, payload: AssetEventPayload<T>): void {
        this.emitter.emit(event, payload);
    }

    on<T extends AssetEventName>(event: T, listener: (payload: AssetEventPayload<T>) => void): void {
        this.emitter.on(event, listener);
    }

    off<T extends AssetEventName>(event: T, listener: (payload: AssetEventPayload<T>) => void): void {
        this.emitter.off(event, listener);
    }
}
