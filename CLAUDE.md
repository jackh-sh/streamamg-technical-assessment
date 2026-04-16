# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun dev        # Start dev server with hot reload (tsx watch)
bun run build  # Compile TypeScript to dist/
bun start      # Run compiled output (node dist/index.js)
bun test       # Run test suite
```

## Architecture

This is a [Hono](https://hono.dev) HTTP API running on Node.js via `@hono/node-server`, written in TypeScript.

- **Entry point**: `src/index.ts` — creates the Hono app, registers routes, and starts the server on port 3000
- **TypeScript**: Strict mode, `NodeNext` module resolution, `verbatimModuleSyntax` enabled — use `.js` extensions in relative imports
- **JSX**: Configured with `hono/jsx` as the JSX runtime if needed

Routes are registered directly on the `app` instance in `src/index.ts`. As the app grows, split route handlers into separate files and use `app.route()` to mount them.

## Purpose

This is an asset metadata service with three endpoints:

- `GET /asset` — list asset
- `POST /asset` — create an asset
- `GET /asset/:id` - get a specific asset
- `GET /asset/events` (or similar) — streaming endpoint (likely SSE or chunked transfer)

Hono has built-in support for SSE via `streamSSE` and chunked streaming via `stream` / `streamText` helpers from `hono/streaming`.
