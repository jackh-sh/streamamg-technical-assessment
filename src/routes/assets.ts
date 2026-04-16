import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AssetType } from "../types/asset.js";
import { type AssetRepository } from "../store/assetRepository.js";

const createAssetSchema = z.object({
    title: z.string().min(1).max(255),
    type: z.enum(AssetType),
});

export function assetRoutes(repo: AssetRepository) {
    const app = new Hono();

    app.post("/", zValidator("json", createAssetSchema), async (c) => {
        const input = c.req.valid("json");
        const asset = await repo.create(input);
        return c.json(asset, 201);
    });

    return app;
}
