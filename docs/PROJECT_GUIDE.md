# Globy CV2 Project Guide

Globy CV2 is a lightweight Discord cross-server communication platform built with Node.js, discord.js v14, and MongoDB. It focuses on fast webhook sync, clean Components V2 command panels, global safety checks, recovery logs, and simple editing.

## Creator Credit

![Adhi profile](assets/adhi-profile.jpeg)

Created by **Adhi**.

- GitHub username: `itzadhi`
- Display name: `Adhi`

Please star the repository and follow `itzadhi` to support future scalable Discord bot projects.

## Credit Clause

You can edit this project freely. You can rename the bot, change the UI, remove systems, add systems, host it, and use it for your community.

The main clause: keep visible credit to the original creator.

```text
Globy CV2 by Adhi (GitHub: itzadhi)
```

Keep this credit in the README, docs, license, or any public project page. If you publish a public bot listing, product page, tutorial, or resale based on this project, include the credit there too.

## How The Bot Is Structured

```text
src/
├── commands/        Slash command definitions
├── prefixCommands/  Prefix and no-prefix command definitions
├── events/          Discord gateway events
├── handlers/        Startup loaders
├── models/          Mongoose database schemas
├── services/        Main business logic
├── middleware/      Permission and safety checks
├── utils/           Shared helpers and Components V2 builders
├── cache/           Runtime caches
└── config/          Environment config
```

## Core Systems

Globy CV2 includes:

- Cross-server webhook message sync
- Plain mode for exact user-style webhook messages
- CV2 mode for compact bot-card messages
- Message edit and delete syncing
- Attachment and sticker support
- MongoDB-backed message recovery
- Global ban, mute, warn, and purge tools for bot developers
- No-prefix access controlled by bot developers
- Bot server management panels for developers
- Mention protection and moderation filters

## Editing The Bot

Common files to edit:

- `src/config/env.js`: environment variable mapping
- `src/services/syncService.js`: message sync and CV2 card formatting
- `src/services/helpMenuService.js`: help menu categories and layout
- `src/services/devPanelService.js`: botguild and no-prefix panel navigation
- `src/commands/`: slash commands
- `src/prefixCommands/`: prefix command equivalents
- `src/models/`: MongoDB schemas

Keep features modular. If a command starts getting large, move the logic into `src/services/`.

## Environment

Required values:

```text
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=your_mongodb_uri
DEV_IDS=your_discord_user_id
```

Common optional values:

```text
PREFIX=,
DEFAULT_SYNC_MODE=plain
BOT_STATUS=Made by Adhi
SUPPORT_SERVER_URL=
WEBSITE_URL=
```

The project no longer uses custom emoji environment variables or generated setup banners.

## Running

Install dependencies:

```bash
npm install
```

Deploy slash commands:

```bash
npm run deploy:commands
```

Start the bot:

```bash
npm start
```

## Testing

Run syntax checks:

```bash
npm run check
```

Check dependencies:

```bash
npm audit --omit=dev
```

## Support The Creator

If you use this project:

- Star the repository.
- Follow `itzadhi`.
- Share credit when you publish your version.
- Keep improving the project cleanly so others can learn from it too.
