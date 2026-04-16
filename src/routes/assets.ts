import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AssetStatus, AssetType } from "../types/asset.js";
import { type AssetRepository } from "../store/assetRepository.js";
import { ValidationErrorSchema, validationHook } from "../middleware/validationHook.js";

const AssetSchema = z
    .object({
        id: z.uuid(),
        title: z.string(),
        type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
        status: z.enum([AssetStatus.PROCESSING, AssetStatus.READY]),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
    .openapi("Asset");

const CreateAssetSchema = z
    .object({
        title: z.string().min(1).max(255),
        type: z.enum([AssetType.VIDEO, AssetType.AUDIO]),
    })
    .openapi("CreateAsset");

const createAssetRoute = createRoute({
    method: "post",
    path: "/",
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

export function assetRoutes(repo: AssetRepository) {
    const app = new OpenAPIHono({ defaultHook: validationHook });

    app.openapi(createAssetRoute, async (c) => {
        const input = c.req.valid("json");
        const asset = await repo.create(input);

        // We'll add

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
