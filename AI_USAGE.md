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

This is response is not very friendly and also could theoreticaly be a security issue. The name ZodError makes the consumer aware that zod is used for validation meaning that it could be exploited. Also, the message returned is not very readable. I asked claude to address this:

|  The response when a 400 returns a message but it's actually a string encoded object, can we fix that for the openapi definition?

# Asset Filtering

Next, the list endpoint was added. When adding this endpoint, I intended to add just a couple of filtering approaches. I asked Claude about what would be good filtering options that I missed. It said title (searching) and  limit / offset (pagination). I asked claude to implement these and also the other filtering stratergies using the data layer and having options there.
