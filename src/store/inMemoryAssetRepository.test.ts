import { describe, test, expect } from "@jest/globals";
import { InMemoryAssetRepository } from "./inMemoryAssetRepository.js";
import { AssetStatus, AssetType } from "../types/asset.js";

function makeRepo() {
    return new InMemoryAssetRepository();
}

describe("InMemoryAssetRepository", () => {
    describe("list", () => {
        test("returns all assets when no filter given", async () => {
            const repo = makeRepo();
            await repo.create({ title: "A", type: AssetType.VIDEO });
            await repo.create({ title: "B", type: AssetType.AUDIO });
            expect((await repo.list()).length).toBe(2);
        });

        test("filters by status", async () => {
            const repo = makeRepo();
            await repo.create({ title: "A", type: AssetType.VIDEO });
            await repo.create({ title: "B", type: AssetType.VIDEO });
            const results = await repo.list({ status: AssetStatus.PROCESSING });
            expect(results.length).toBe(2);
            const none = await repo.list({ status: AssetStatus.READY });
            expect(none.length).toBe(0);
        });

        test("filters by type", async () => {
            const repo = makeRepo();
            await repo.create({ title: "A", type: AssetType.VIDEO });
            await repo.create({ title: "B", type: AssetType.AUDIO });
            const videos = await repo.list({ type: AssetType.VIDEO });
            expect(videos.length).toBe(1);
            expect(videos[0].type).toBe(AssetType.VIDEO);
        });

        test("filters by title (case-insensitive substring)", async () => {
            const repo = makeRepo();
            await repo.create({ title: "Hello World", type: AssetType.VIDEO });
            await repo.create({ title: "Goodbye", type: AssetType.VIDEO });
            expect((await repo.list({ title: "hello" })).length).toBe(1);
            expect((await repo.list({ title: "WORLD" })).length).toBe(1);
            expect((await repo.list({ title: "xyz" })).length).toBe(0);
        });

        test("filters by from/to date range", async () => {
            const repo = makeRepo();
            await repo.create({ title: "A", type: AssetType.VIDEO });
            const past = new Date(Date.now() - 10000);
            const future = new Date(Date.now() + 10000);
            expect((await repo.list({ from: past })).length).toBe(1);
            expect((await repo.list({ to: future })).length).toBe(1);
            expect((await repo.list({ from: future })).length).toBe(0);
        });

        test("paginates with limit and offset", async () => {
            const repo = makeRepo();
            for (let i = 0; i < 5; i++) {
                await repo.create({ title: `Asset ${i}`, type: AssetType.VIDEO });
            }
            expect((await repo.list({ limit: 2 })).length).toBe(2);
            expect((await repo.list({ limit: 2, offset: 4 })).length).toBe(1);
            expect((await repo.list({ offset: 5 })).length).toBe(0);
        });
    });

    describe("create", () => {
        test("creates an asset with PROCESSING status", async () => {
            const repo = makeRepo();
            const asset = await repo.create({ title: "Test", type: AssetType.VIDEO });
            expect(asset.status).toBe(AssetStatus.PROCESSING);
            expect(asset.title).toBe("Test");
            expect(asset.type).toBe(AssetType.VIDEO);
            expect(typeof asset.id).toBe("string");
        });
    });

    describe("get", () => {
        test("returns asset by id", async () => {
            const repo = makeRepo();
            const created = await repo.create({ title: "Test", type: AssetType.AUDIO });
            const found = await repo.get(created.id);
            expect(found).toEqual(created);
        });

        test("returns undefined for unknown id", async () => {
            const repo = makeRepo();
            expect(await repo.get("non-existent")).toBeUndefined();
        });
    });
});
