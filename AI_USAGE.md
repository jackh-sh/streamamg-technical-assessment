# When designing the data layer

| Let's build the data layer, I'm thinking we start out with a basic asset type. I'm thinking id, title, type (enum), status (enum), createdAt (date), updatedAt (date).
|
| ** Claude Code: ** 
|What values should the enums have? For a streaming service I'd suggest something like:
|
|  - Type: VIDEO, AUDIO, LIVE
|  - Status: PENDING, ACTIVE, INACTIVE
|
|  Should I go with those, or do you have specific values in mind?

    
Initially Claude wanted to write functions for each action (e.g. `getAsset()`). I pushed back on this and asked it to create a data repository pattern instead using an interface. This way, if we are to migrate to a persistant data storage stratergy in the future, we can just implement an interface for it.
