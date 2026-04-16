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
