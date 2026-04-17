import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { AssetStatus, AssetType } from "../types/asset.js";
import { type AssetRepository } from "../store/assetRepository.js";
import {
    ValidationErrorSchema,
    validationHook,
} from "../middleware/validationHook.js";
import { type ListAssetsFilter } from "../store/assetRepository.js";
import { type EventBus } from "../events/eventBus.js";
import type { Asset } from "../types/asset.js";
import { simulateEncoding } from "../encoding/encodingSimulator.js";

const AssetSchema = z
    .object({
        id: z.uuid(),
        title: z.string(),
        type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
        status: z.enum([AssetStatus.PROCESSING, AssetStatus.READY]),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
    .openapi("Asset", {
        example: {
            id: "dc7e2617-05ff-4c0a-9df2-c10373ab9037",
            title: "Premier League Highlights",
            type: AssetType.VIDEO,
            status: AssetStatus.READY,
            createdAt: "2026-04-17T10:00:00.000Z",
            updatedAt: "2026-04-17T10:00:05.000Z",
        },
    });

const CreateAssetSchema = z
    .object({
        title: z.string().min(1).max(255),
        type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
    })
    .openapi("CreateAsset", {
        example: {
            title: "Premier League Highlights",
            type: AssetType.VIDEO,
        },
    });

const listAssetsRoute = createRoute({
    method: "get",
    path: "/",
    summary: "List assets",
    description: "Returns a paginated list of assets. Supports filtering by status, type, title (case-insensitive substring), and creation date range.",
    request: {
        query: z.object({
            status: z
                .enum([AssetStatus.PROCESSING, AssetStatus.READY])
                .optional(),
            type: z.enum([AssetType.VIDEO, AssetType.AUDIO]).optional(),
            title: z.string().max(255).optional(),
            from: z.iso.datetime().optional(),
            to: z.iso.datetime().optional(),
            limit: z.coerce.number().int().min(1).max(100).optional(),
            offset: z.coerce.number().int().min(0).optional(),
        }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: z.array(AssetSchema) } },
            description: "List of assets",
        },
    },
});

const getAssetRoute = createRoute({
    method: "get",
    path: "/{id}",
    summary: "Get asset",
    description: "Retrieve a single asset by its ID.",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: AssetSchema } },
            description: "Asset found",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({ error: z.string() }).openapi("NotFound"),
                },
            },
            description: "Asset not found",
        },
    },
});

const eventsRoute = createRoute({
    method: "get",
    path: "/events",
    summary: "Stream asset events",
    description: "Opens a Server-Sent Events stream. Emits `asset.created` when an asset is created and `asset.ready` when encoding completes.",
    responses: {
        200: {
            content: {
                "text/event-stream": {
                    schema: z.string().openapi({
                        example: "event: asset.created\ndata: {\"id\":\"dc7e2617-05ff-4c0a-9df2-c10373ab9037\",\"title\":\"Premier League Highlights\",\"type\":\"video\",\"status\":\"processing\"}\n\n",
                    }),
                },
            },
            description: "SSE stream of asset events",
        },
    },
});

const createAssetRoute = createRoute({
    method: "post",
    path: "/",
    summary: "Create asset",
    description: "Creates a new asset with status `processing`. An encoding simulation runs in the background and transitions the asset to `ready` after a short delay, emitting an `asset.ready` event on the SSE stream.",
    request: {
        body: {
            content: { "application/json": { schema: CreateAssetSchema } },
            required: true,
        },
    },
    responses: {
        201: {
            content: { "application/json": { schema: AssetSchema } },
            description: "Asset created",
        },
        400: {
            content: { "application/json": { schema: ValidationErrorSchema } },
            description: "Validation error",
        },
    },
});

export function assetRoutes(repo: AssetRepository, eventBus: EventBus) {
    const app = new OpenAPIHono({ defaultHook: validationHook });

    app.openapi(listAssetsRoute, async (c) => {
        const { status, type, title, from, to, limit, offset } =
            c.req.valid("query");
        const filter: ListAssetsFilter = {
            status,
            type,
            title,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit,
            offset,
        };
        const assets = await repo.list(filter);
        return c.json(
            assets.map((asset) => ({
                ...asset,
                createdAt: asset.createdAt.toISOString(),
                updatedAt: asset.updatedAt.toISOString(),
            })),
            200,
        );
    });

    app.openapi(eventsRoute, (c) => {
        return streamSSE(c, async (stream) => {
            const serialize = (asset: Asset) =>
                JSON.stringify({
                    ...asset,
                    createdAt: asset.createdAt.toISOString(),
                    updatedAt: asset.updatedAt.toISOString(),
                });

            const onCreated = async (asset: Asset) => {
                await stream.writeSSE({
                    event: "asset.created",
                    data: serialize(asset),
                });
            };
            const onReady = async (asset: Asset) => {
                await stream.writeSSE({
                    event: "asset.ready",
                    data: serialize(asset),
                });
            };

            eventBus.on("asset.created", onCreated);
            eventBus.on("asset.ready", onReady);
            await new Promise<void>((resolve) => stream.onAbort(resolve));
            eventBus.off("asset.created", onCreated);
            eventBus.off("asset.ready", onReady);
        });
    });

    app.openapi(getAssetRoute, async (c) => {
        const { id } = c.req.valid("param");
        const asset = await repo.get(id);
        if (!asset) {
            return c.json({ error: "Asset not found" }, 404);
        }
        return c.json(
            {
                ...asset,
                createdAt: asset.createdAt.toISOString(),
                updatedAt: asset.updatedAt.toISOString(),
            },
            200,
        );
    });

    app.openapi(createAssetRoute, async (c) => {
        const input = c.req.valid("json");
        const asset = await repo.create(input);
        eventBus.emit("asset.created", asset);
        simulateEncoding(repo, eventBus, asset);
        return c.json(
            {
                ...asset,
                createdAt: asset.createdAt.toISOString(),
                updatedAt: asset.updatedAt.toISOString(),
            },
            201,
        );
    });

    return app;
}
