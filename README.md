# Globy CV2

Globy CV2 is a modern Discord cross-server communication bot. It connects text channels into named networks like `global`, `gaming`, `anime`, or `coding`, then mirrors messages across those channels through rich Discord webhooks.

The project is built with Node.js, discord.js v14, MongoDB, Mongoose, and Canvas. It is intentionally modular so beginners can understand it and experienced maintainers can scale it.

## Features

- Cross-server message sync with webhooks
- Network-based channel linking
- Real username, avatar, and source server display
- Text, replies, attachments, stickers, emoji, edits, and deletes
- Webhook creation, reuse, cache, recovery, and fail protection
- Global profile system with XP, levels, reputation, ranks, and leaderboards
- Canvas profile, rank, and leaderboard cards
- Global moderation: invite filter, spam protection, scam checks, toxic word filter, caps checks, repeated-message detection, emoji spam protection
- Mention protection for `@everyone`, `@here`, roles, and mass mention abuse
- Global blacklist, mute, warn, and moderation logs
- MongoDB-backed message logs and `/recovermessages`
- Premium slash command UI with embeds, buttons, and menus

## Quick Start

1. Install Node.js 18.17 or newer.
2. Clone the repository.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, `MONGO_URI`, and `DEV_IDS`.
6. Enable these Discord Developer Portal bot intents:
   - Server Members Intent
   - Message Content Intent
7. Invite the bot with these permissions:
   - Manage Webhooks
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - View Channel
   - Manage Messages
8. Deploy slash commands:

```bash
npm run deploy:commands
```

9. Start the bot:

```bash
npm start
```

## Main Commands

| Category | Commands |
| --- | --- |
| General | `/help`, `/ping`, `/stats`, `/userinfo`, `/serverinfo`, `/avatar`, `/invite`, `/about` |
| Sync | `/setchannel`, `/removechannel`, `/networkinfo`, `/recovermessages` |
| Profile | `/profile`, `/rank`, `/leaderboard`, `/rep` |
| Moderation | `/gban`, `/gunban`, `/gmute`, `/gunmute`, `/gwarn` |

## Connecting Channels

Only the server owner or users with Administrator permission can configure synced channels.

Example:

```text
/setchannel channel:#global-chat network:global
```

Any other channel connected to `global` will receive messages from that channel. Network names are lowercase, short, and easy to remember.

## Environment Variables

See `.env.example` for the complete list. Never commit `.env` to GitHub.

Important variables:

- `DISCORD_TOKEN`: your bot token
- `CLIENT_ID`: Discord application client ID
- `MONGO_URI`: MongoDB connection string
- `DEV_IDS`: bot developer IDs, comma-separated
- `TOXIC_WORDS`: optional comma-separated moderation list
- `EMOJI_*`: optional custom emoji markup for premium UI

## MongoDB

Globy CV2 uses Mongoose models with indexes for connected channels, networks, profiles, blacklists, moderation logs, and message recovery logs. MongoDB Atlas works well for production.

Recommended production settings:

- Use a dedicated database user with a strong password.
- Restrict network access where possible.
- Enable backups.
- Watch storage growth for `MessageLogs`.

## Scaling Tips

- Keep webhook permissions healthy in every connected channel.
- Use network names to split large communities by topic.
- Keep `SYNC_QUEUE_DELAY` above `500ms` for very large deployments.
- Use MongoDB Atlas indexes and monitor slow queries.
- Rotate Discord tokens immediately if they are ever shared publicly.

## Troubleshooting

- Commands do not appear: run `npm run deploy:commands` and wait a few minutes for global command propagation.
- Messages do not sync: check bot permissions in both source and target channels.
- Webhooks fail: delete the broken channel connection with `/removechannel`, then run `/setchannel` again, or use `/recovermessages`.
- Canvas install fails: install system build tools required by `canvas`, then run `npm install` again.

More detailed setup notes are in `docs/SETUP.md`.
