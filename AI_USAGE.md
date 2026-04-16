# When designing the data layer

My initial prompt:
| Let's build the data layer, I'm thinking we start out with a basic asset type. I'm thinking id, title, type (enum), status (enum), createdAt (date), updatedAt (date).

Claude Code initially suggested: Type: VIDEO, AUDIO, LIVE and Status: PENDING, ACTIVE, INACTIVE which doesn't fit the use case. Instead, I asked for more project appropriate enums (video, audio for type and processing, ready for status)    
    
Initially Claude wanted to write functions for each action (e.g. `getAsset()`). I pushed back on this and asked it to create a data repository pattern instead using an interface. This way, if we are to migrate to a persistant data storage stratergy in the future, we can just implement an interface for it.
