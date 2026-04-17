# StreamAMG Technical Assessment

## Setup and Run

This project was built and tested with [Bun](https://bun.sh), but also runs on Node.js.

**Install dependencies:**
```sh
bun i
```

**Start the dev server (with hot reload):**
```sh
bun dev
```

**Run the compiled output:**
```sh
bun run build
bun start
```

**Run the test suite:**
```sh
bun test
```

The server starts on `http://localhost:3000`. Interactive API documentation is available at `http://localhost:3000/reference`.

---

## Architecture

This is a Hono HTTP API running on Node.js via `@hono/node-server`, written in TypeScript. Hono was chosen for its first-class support for web technologies needed in this project, including SSE streaming and OpenAPI documentation, without requiring additional libraries for either. The entry point (`src/index.ts`) wires together the dependencies and mounts the asset routes under `/asset`. Route handlers live in `src/routes/assets.ts` and are kept thin. They validate input, delegate to the repository or event bus, and return responses. All business logic (e.g. filtering, pagination, encoding simulation) lives outside the route layer. In a production application, this would be handled by a database layer.

The data layer uses a repository pattern (`AssetRepository` interface in `src/store/`) with an in-memory implementation (`InMemoryAssetRepository`). The event system follows the same pattern: an `EventBus` interface with an `InMemoryEventBus` backed by Node's `EventEmitter`. Both interfaces are injected into the route factory function, which means routes are fully decoupled from storage and messaging concerns and are straightforward to test in isolation.

---

## Key Technical Decisions

- **Repository pattern for storage**: `AssetRepository` is an interface rather than a concrete class. Swapping in a database (Postgres, Redis, etc.) only requires a new implementation so there are no route code changes. Under peak load, a read replica can be introduced for list queries with no changes to the route layer.
- **EventBus interface**: same as the repository. `InMemoryEventBus` is the current implementation, but an external broker (Redis Pub/Sub, RabbitMQ) can be substituted without changing the consumers. This would also allow multiple service instances to share events, enabling horizontal scaling.
- **Dependency injection over singletons**: the `assetRoutes(repo, eventBus)` factory receives its dependencies rather than importing them. Because routes hold no state themselves, multiple instances of the HTTP server can run behind a load balancer without coordination.
- **Zod + `@hono/zod-openapi`**: validation and OpenAPI documentation are derived from the same schema definitions, keeping them in sync by construction.
- **SSE via `streamSSE`**: the `/asset/events` endpoint uses Hono's built-in SSE helper. The handler suspends on `stream.onAbort` and cleans up event listeners when the client disconnects, preventing listener leaks. At scale, SSE fan-out would move to a dedicated pub/sub layer (e.g. Redis) so any instance can push to any connected client regardless of which instance handled the original request. For AWS deployments, API Gateway's managed WebSocket/SSE support could offload connection management entirely.
- **Hono + Node.js for serverless**: Hono is runtime-agnostic and has first-class support for Lambda deployments via `@hono/aws-lambda`. Combined with Node.js, the service can be deployed as a Lambda function behind API Gateway with minimal changes, allowing the compute layer to scale to zero and handle traffic spikes automatically.
- **Encoding simulator**: a `simulateEncoding` function fires a `setTimeout` (1–5s random delay) after asset creation, updates the status to `READY`, and emits `asset.ready` on the bus. The delay is injectable for testability. In production this would be replaced by a job queue (e.g. BullMQ) so encoding workers can scale independently of the API with back-pressure and retry logic.

---

## AI Artefacts and Workflow

**Tools used:** Claude Code - used via the CLI throughout the entire project for code generation, debugging, and test writing.

AI tools were used throughout this project. The `AI_USAGE.md` file documents the main interactions in detail, including where suggestions were accepted, where they were pushed back on, and where bugs introduced by the AI were caught and corrected.

Notable examples:
- The initial data layer used plain functions; this was redirected to a repository pattern.
- The event bus was initially proposed as a concrete class; an interface-first approach was requested to mirror the repository pattern.
- Several deprecated API usages were caught and corrected manually (`z.nativeEnum()`, `apiReference()`).
- An SSE `TimeoutOverflowWarning` was introduced by using `Number.MAX_SAFE_INTEGER` as a sleep duration, caught at runtime, and fixed.
- The `asset.ready` event was not being forwarded to SSE clients - noticed during manual testing and fixed.
- An OpenAPI path param bug (`:id` vs `{id}`) caused Scalar to construct incorrect URLs - identified during manual testing.

---

## Assumptions

- **In-memory storage is sufficient**: no persistence is required for this assessment. The store resets on every server restart, which is expected behaviour.
- **Single process**: the event bus is in-process. There is no expectation of multi-instance deployment or cross-process event fan-out.
- **Encoding is simulated**: the `PROCESSING → READY` transition uses a random timeout to simulate an encoding pipeline. No real encoding is performed.
- **Asset IDs are server-generated**: clients cannot specify an ID on creation; UUIDs are assigned by the server via `crypto.randomUUID()`.
- **SSE clients are assumed to reconnect**: the server does not buffer missed events. If a client disconnects and reconnects, it will only receive events emitted after reconnection.
