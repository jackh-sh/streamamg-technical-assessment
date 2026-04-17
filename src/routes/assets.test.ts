import { describe, test, expect, jest } from "@jest/globals";
import { OpenAPIHono } from "@hono/zod-openapi";
import { assetRoutes } from "./assets.js";
import { InMemoryAssetRepository } from "../store/inMemoryAssetRepository.js";
import { InMemoryEventBus } from "../events/inMemoryEventBus.js";
import { AssetType, AssetStatus } from "../types/asset.js";

function makeApp() {
    const repo = new InMemoryAssetRepository();
    const eventBus = new InMemoryEventBus();
    const app = new OpenAPIHono();
    app.route("/asset", assetRoutes(repo, eventBus));
    return { app, repo, eventBus };
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

    test("filters by from date", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "Old", type: AssetType.VIDEO });
        const future = new Date(Date.now() + 60_000).toISOString();
        const res = await app.request(`/asset?from=${encodeURIComponent(future)}`);
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(0);
    });

    test("filters by to date", async () => {
        const { app, repo } = makeApp();
        await repo.create({ title: "New", type: AssetType.VIDEO });
        const past = new Date(Date.now() - 60_000).toISOString();
        const res = await app.request(`/asset?to=${encodeURIComponent(past)}`);
        expect(res.status).toBe(200);
        expect((await res.json()).length).toBe(0);
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

describe("GET /asset/events", () => {
    test("returns 200 with text/event-stream content type", async () => {
        const { app } = makeApp();
        const controller = new AbortController();
        const res = await app.request("/asset/events", { signal: controller.signal });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/event-stream");
        controller.abort();
    });

    test("streams asset.created event when an asset is posted", async () => {
        const { app } = makeApp();
        const controller = new AbortController();
        const res = await app.request("/asset/events", { signal: controller.signal });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Video", type: AssetType.VIDEO }),
        });

        const { value } = await reader.read();
        const text = decoder.decode(value);

        expect(text).toContain("event: asset.created");
        expect(text).toContain("My Video");

        controller.abort();
        reader.cancel();
    });

    test("does not receive events after client disconnects", async () => {
        const { app, eventBus } = makeApp();
        const controller = new AbortController();
        await app.request("/asset/events", { signal: controller.signal });
        controller.abort();

        // Allow onAbort to fire and clean up the listener
        await new Promise((resolve) => setTimeout(resolve, 10));

        const listener = jest.fn();
        eventBus.on("asset.created", listener);

        await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Video", type: AssetType.VIDEO }),
        });

        // Only our explicit listener fires, not the disconnected SSE one
        expect(listener).toHaveBeenCalledTimes(1);
        eventBus.off("asset.created", listener);
    });
});

describe("EventBus", () => {
    test("emits asset.created when an asset is created", async () => {
        const { app, eventBus } = makeApp();
        const listener = jest.fn();
        eventBus.on("asset.created", listener);

        await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Video", type: AssetType.VIDEO }),
        });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0]).toMatchObject({
            title: "My Video",
            type: AssetType.VIDEO,
            status: AssetStatus.PROCESSING,
        });
    });

    test("does not emit asset.created when creation fails validation", async () => {
        const { app, eventBus } = makeApp();
        const listener = jest.fn();
        eventBus.on("asset.created", listener);

        await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        expect(listener).not.toHaveBeenCalled();
    });

    test("off removes a listener", async () => {
        const { app, eventBus } = makeApp();
        const listener = jest.fn();
        eventBus.on("asset.created", listener);
        eventBus.off("asset.created", listener);

        await app.request("/asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Video", type: AssetType.VIDEO }),
        });

        expect(listener).not.toHaveBeenCalled();
    });
});
