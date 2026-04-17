import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { InMemoryAssetRepository } from "./store/inMemoryAssetRepository.js";
import { InMemoryEventBus } from "./events/inMemoryEventBus.js";
import { assetRoutes } from "./routes/assets.js";

const repo = new InMemoryAssetRepository();
const eventBus = new InMemoryEventBus();

const app = new OpenAPIHono();

app.route("/asset", assetRoutes(repo, eventBus));

app.doc("/doc", {
    openapi: "3.0.0",
    info: { title: "Asset API", version: "1.0.0" },
});

app.get("/reference", Scalar({ url: "/doc" }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
