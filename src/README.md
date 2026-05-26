# Source Folder

`src` contains the running bot. Each folder owns one part of the system so features can be changed without rewriting the whole project.

- `commands`: slash command definitions and responses
- `events`: Discord gateway event listeners
- `handlers`: boot-time loaders
- `models`: Mongoose schemas
- `services`: business logic such as sync, XP, recovery, and moderation
- `middleware`: permission and cooldown checks shared by commands
- `utils`: small reusable helpers
- `cache`: in-memory caches
- `canvas`: generated profile and leaderboard cards
- `config`: environment and UI configuration
