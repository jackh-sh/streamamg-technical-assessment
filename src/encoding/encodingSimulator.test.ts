import { describe, test, expect, jest } from "@jest/globals";
import { simulateEncoding } from "./encodingSimulator.js";
import { InMemoryAssetRepository } from "../store/inMemoryAssetRepository.js";
import { InMemoryEventBus } from "../events/inMemoryEventBus.js";
import { AssetType, AssetStatus } from "../types/asset.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("simulateEncoding", () => {
    test("asset starts as PROCESSING before timeout fires", async () => {
        const repo = new InMemoryAssetRepository();
        const eventBus = new InMemoryEventBus();
        const asset = await repo.create({ title: "My Video", type: AssetType.VIDEO });

        simulateEncoding(repo, eventBus, asset, 100);

        expect((await repo.get(asset.id))!.status).toBe(AssetStatus.PROCESSING);
    });

    test("updates asset status to READY after timeout", async () => {
        const repo = new InMemoryAssetRepository();
        const eventBus = new InMemoryEventBus();
        const asset = await repo.create({ title: "My Video", type: AssetType.VIDEO });

        simulateEncoding(repo, eventBus, asset, 0);
        await tick();

        expect((await repo.get(asset.id))!.status).toBe(AssetStatus.READY);
    });

    test("emits asset.ready event after timeout", async () => {
        const repo = new InMemoryAssetRepository();
        const eventBus = new InMemoryEventBus();
        const asset = await repo.create({ title: "My Video", type: AssetType.VIDEO });
        const listener = jest.fn();
        eventBus.on("asset.ready", listener);

        simulateEncoding(repo, eventBus, asset, 0);
        expect(listener).not.toHaveBeenCalled();

        await tick();

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0]).toMatchObject({
            id: asset.id,
            status: AssetStatus.READY,
        });
    });

    test("does not emit if asset no longer exists", async () => {
        const repo = new InMemoryAssetRepository();
        const eventBus = new InMemoryEventBus();
        const asset = await repo.create({ title: "My Video", type: AssetType.VIDEO });
        const listener = jest.fn();
        eventBus.on("asset.ready", listener);

        simulateEncoding(repo, eventBus, { ...asset, id: "00000000-0000-0000-0000-000000000000" }, 0);
        await tick();

        expect(listener).not.toHaveBeenCalled();
    });
});
