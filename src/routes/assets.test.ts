import { describe, test, expect } from "@jest/globals";
import { OpenAPIHono } from "@hono/zod-openapi";
import { assetRoutes } from "./assets.js";
import { InMemoryAssetRepository } from "../store/inMemoryAssetRepository.js";
import { AssetType, AssetStatus } from "../types/asset.js";

function makeApp() {
    const repo = new InMemoryAssetRepository();
    const app = new OpenAPIHono();
    app.route("/asset", assetRoutes(repo));
    return { app, repo };
}

describe("POST /asset", () => {
    test("creates an asset and returns 201", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Video", type: AssetType.VIDEO }),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.title).toBe("My Video");
        expect(body.type).toBe(AssetType.VIDEO);
        expect(body.status).toBe(AssetStatus.PROCESSING);
        expect(typeof body.id).toBe("string");
    });

    test("returns 400 with validation issues for missing fields", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(Array.isArray(body.issues)).toBe(true);
        expect(body.issues.length).toBeGreaterThan(0);
    });

    test("returns 400 when title is empty", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "", type: AssetType.VIDEO }),
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.issues.some((i: any) => i.path.includes("title"))).toBe(true);
    });
});

describe("GET /asset", () => {
    test("returns empty array when no assets", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
    });

    test("returns all created assets", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "A", type: AssetType.VIDEO });
        await repo.create({ title: "B", type: AssetType.AUDIO });
        const res = await app.request("/asset");
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(2);
    });

    test("filters by status query param", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "A", type: AssetType.VIDEO });
        const res = await app.request(`/asset?status=${AssetStatus.READY}`);
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(0);
    });

    test("filters by type query param", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "A", type: AssetType.VIDEO });
        await repo.create({ title: "B", type: AssetType.AUDIO });
        const res = await app.request(`/asset?type=${AssetType.AUDIO}`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.length).toBe(1);
        expect(body[0].type).toBe(AssetType.AUDIO);
    });

    test("filters by title query param", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "Hello World", type: AssetType.VIDEO });
        await repo.create({ title: "Goodbye", type: AssetType.VIDEO });
        const res = await app.request("/asset?title=hello");
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(1);
    });

    test("paginates with limit and offset", async () => {
        const { app, repo } = makeApp();
        for (let i = 0; i < 5; i++) {
            await repo.create({ title: `Asset ${i}`, type: AssetType.VIDEO });
        }
        const res = await app.request("/asset?limit=2&offset=0");
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(2);
    });

    test("returns 400 for invalid status value", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset?status=invalid");
        expect(res.status).toBe(400);
    });
});

describe("GET /asset/:id", () => {
    test("returns the asset when it exists", async () => {
        const { app, repo } = makeApp();
        const created = await repo.create({ title: "My Video", type: AssetType.VIDEO });
        const res = await app.request(`/asset/${created.id}`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(created.id);
        expect(body.title).toBe("My Video");
    });

    test("returns 404 when asset does not exist", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset/00000000-0000-0000-0000-000000000000");
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe("Asset not found");
    });

    test("returns 400 for invalid UUID", async () => {
        const { app } = makeApp();
        const res = await app.request("/asset/not-a-uuid");
        expect(res.status).toBe(400);
    });
});
