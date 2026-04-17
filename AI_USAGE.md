# When designing the data layer

Prompt:
| Let's build the data layer, I'm thinking we start out with a basic asset type. I'm thinking id, title, type (enum), status (enum), createdAt (date), updatedAt (date).

Claude Code initially suggested: Type: VIDEO, AUDIO, LIVE and Status: PENDING, ACTIVE, INACTIVE which doesn't fit the use case. Instead, I asked for more project appropriate enums (video, audio for type and processing, ready for status)    
    
Initially Claude wanted to write functions for each action (e.g. `getAsset()`). I pushed back on this and asked it to create a data repository pattern instead using an interface. This way, if we are to migrate to a persistant data storage stratergy in the future, we can just implement an interface for it.

# Asset Creation Endpoint

Prompt: 
| Let's now build an endpoint for creating a new asset. Use zod to handle validation

Typically with hono, you create a router for sub routes (i.e. `/assets/`) and mount it at the root router. Usually this is done in one file at execution time. Claude suggested a dependency injection technique. I asked Claude whether a singleton approach would be better, however it suggested that a DI method is easier for testing in isolation. It's a clever approach, combined with the abstract data repository interface it means the route doesn't have to know which storage stratery is active, it just calls the implemented methods.

With Claude's implementation, there was two issues which I noticed. There wasn't a max length on the title, which means it's possible to pass very long strings which could cause unintented behaivour. Secondly, whilst not as severe as the first issue, `z.nativeEnum()` was used which is now deprecated.

# Documentation Addition

To set it up early so it becomes a practice throughout the API, I added the `@hono/zod-openapi` and `scalar` for documentation. Claude scaffolded the documentation and types for use. Claude suggested a deprecated function again, the `apiReference()` middleware function which I replaced manually to `Scalar()`

# Error Handling

By default, the error handling returns the following response:

```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "message": "[\n  {\n    \"origin\": \"string\",\n    \"code\": \"too_small\",\n    \"minimum\": 1,\n    \"inclusive\": true,\n    \"path\": [\n      \"title\"\n    ],\n    \"message\": \"Too small: expected string to have >=1 characters\"\n  }\n]"
  }
}
```

This is response is not very friendly and also could theoreticaly be a security issue. The name ZodError makes the consumer aware that zod is used for validation meaning it could be exploited. Also, the message returned is not very readable. I asked claude to address this:

|  The response when a 400 returns a message but it's actually a string encoded object, can we fix that for the openapi definition?

# Asset Filtering

Next, the list endpoint was added. When adding this endpoint, I intended to add just a couple of filtering approaches. I asked Claude about what would be good filtering options that I missed. It said title (searching) and  limit / offset (pagination). I asked claude to implement these and also the other filtering stratergies using the data layer and having options there.

# Testing

With testing, I asked claude to add some tests to test the creation and retrieving of assets. I also asked for some tests to cover the different filtering options.

# Get Single Asset Endpoint

I asked Claude to add a `GET /asset/:id` endpoint. It correctly identified that the `get(id)` method already existed on the `AssetRepository` interface and wired it up, returning 404 when not found and 400 for invalid UUIDs. Tests were added alongside.

# Event Bus

I asked Claude to investigate adding an event bus. It proposed a simple in-process `EventEmitter`-based approach. I pushed back and asked whether it was worth adding an interface first, in case we wanted to swap in an external broker (Redis, RabbitMQ, etc.) later. Claude agreed and implemented an `EventBus` interface alongside an `InMemoryEventBus` implementation — mirroring the same pattern already used for `AssetRepository`. The `asset.created` event is emitted after a successful POST. Tests were added to verify the event fires, doesn't fire on validation failure, and that `off` correctly removes listeners.

# SSE Streaming Endpoint

I asked Claude to add a `GET /asset/events` SSE endpoint that pushes events from the bus to connected clients. The route was registered before `/:id` to avoid "events" being matched as a UUID param. Claude initially used `stream.sleep(Number.MAX_SAFE_INTEGER)` to keep the connection open, which produced a Node.js `TimeoutOverflowWarning`. This was corrected by replacing the sleep loop with `await new Promise<void>((resolve) => stream.onAbort(resolve))`, which suspends the handler until the client disconnects and then cleans up the event listener.

# Logging

I asked Claude to add request logging to the Hono router. It used Hono's built-in `logger()` middleware, which logs method, path, status code, and response time for every request.

# Encoding Simulator

I asked Claude to add a feature where creating an asset triggers a status transition to `READY` after a simulated encoding delay. Claude added an `update` method to the `AssetRepository` interface and `InMemoryAssetRepository`, added `asset.ready` to the `EventBus` event map, and created an `encodingSimulator` that fires after a random 1–5 second timeout and emits `asset.ready`. The SSE endpoint was also missing `asset.ready` — it only forwarded `asset.created` — which was caught and fixed after I noticed no ready event was firing when creating an asset. To keep tests fast, the delay was made injectable rather than relying on fake timers, which `jest.runAllTimersAsync` (not available in Bun's Jest compat) would have required.

# OpenAPI Path Parameter Bug

After adding the get single asset endpoint, requests via the Scalar UI were returning 404 even when the asset existed in the list. I identified that the issue was with the `:id` syntax — `createRoute` had been defined using Hono's `:id` notation rather than OpenAPI's `{id}` notation. This caused the generated spec to contain the path `/asset/:id` literally, so Scalar was sending requests to `/asset/:id` instead of substituting the actual ID value. Changing the path to `/{id}` fixed the spec. Along the way, the path param validation was also relaxed from `z.uuid()` (Zod v4's strict variant regex was rejecting valid UUIDs) to `z.string()`, meaning unknown IDs now consistently return 404 rather than 400.
