# Globy CV2

<p align="center">
  <img src="docs/assets/adhi-profile.jpeg" width="140" alt="Adhi profile">
</p>

Globy CV2 is a production-oriented Discord cross-server communication bot. Server admins choose a channel, and immediately starts mirroring messages across every connected channel using Discord webhooks.

Created by **Adhi** (`itzadhi`). If this project helps you, please star the repository and follow `itzadhi` to support more scalable Discord bot projects.

The project is built with:

- Node.js
- discord.js v14.26+
- MongoDB with Mongoose

The architecture is intentionally simple: commands call services, services use models, and MongoDB stays the source of truth.

## Credits And License

Globy CV2 is created by **Adhi**.

- GitHub username: `itzadhi`
- Display name: `Adhi`
- Full credit page: [docs/CREDITS.md](docs/CREDITS.md)
- Detailed project guide: [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)

You can edit, fork, host, customize, and build on this project freely. The main required clause is that public copies, forks, deployments, showcases, tutorials, and redistributed versions must keep clear credit:

```text
Globy CV2 by Adhi (GitHub: itzadhi)
```

See [LICENSE.md](LICENSE.md) for the full credit-required license.

## What Globy CV2 Does

- Syncs messages across servers in real time
- Uses webhooks so synced messages keep the real username and avatar
- Keeps synced webhook messages clean: only the user message content is shown
- Supports text, replies, attachments, stickers, emoji, edits, and deletes
- Stores message recovery data in MongoDB
- Rebuilds broken webhook messages with `/recovermessages`
- Tracks global XP, levels, and message counts
- Blocks dangerous pings before sync
- Filters spam, scam patterns, invite links, caps spam, repeat spam, and emoji spam
- Supports slash commands, comma-prefix commands, and developer-granted no-prefix commands
- Uses clean Discord Components V2 panels for command UI
- Preloads commands and webhook cache at startup

## Folder Map

```text
src/
├── commands/        Slash commands
├── prefixCommands/  Comma-prefix and no-prefix message commands
├── events/          Discord gateway event listeners
├── handlers/        Startup command/event loaders
├── models/          Mongoose schemas
├── services/        Sync, webhook, XP, recovery, moderation, and health logic
├── middleware/      Permission checks
├── utils/           Text, time, Components V2, logging, and file helpers
├── cache/           In-memory cooldown/webhook caches
└── config/          Environment and UI configuration
```

## Install

```bash
npm install
```

Use Node.js 18.17 or newer.

## Environment Setup

Create `.env` from the example:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Simple `.env`:

```text
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=your_mongodb_connection_string
DEV_IDS=your_discord_user_id
PREFIX=,
DEFAULT_SYNC_MODE=plain
BOT_TAGLINE=A premium cross-server Discord bot for webhook chat, profiles, moderation, and recovery.
BOT_STATUS=Made by Adhi
```

The bot still supports advanced optional variables such as `NO_PREFIX_ENABLED`, `WEBHOOK_NAME`, `SYNC_QUEUE_DELAY`, `MESSAGE_SPAM_LIMIT`, `CV2_WEBHOOK_USERNAME`, and link settings, but you do not need them for a normal setup.

No-prefix access is automatic for `DEV_IDS`. Extra users must be granted by a bot developer with `/noprefix add` or `,noprefix add`.

Never commit `.env`. It is ignored by Git.

## Discord Developer Portal

In the Discord Developer Portal:

1. Open your application.
2. Go to the Bot page.
3. Enable these privileged intents:
   - Server Members Intent
   - Message Content Intent
4. Copy the bot token into `.env`.
5. Copy the application ID into `CLIENT_ID`.

## Invite Permissions

Invite the bot with:

- `bot`
- `applications.commands`

Recommended bot permissions:

- View Channel
- Send Messages
- Manage Webhooks
- Embed Links
- Attach Files
- Read Message History
- Manage Messages

Webhook sync will not work without `Manage Webhooks` in every connected channel.

## Deploy Slash Commands

Deploy global commands:

```bash
npm run deploy:commands
```

The deploy script prints the command names Discord accepted. Global commands can take time to appear in the Discord client.

For instant testing in one server, set a guild ID:

```powershell
$env:DEPLOY_GUILD_ID="your_test_server_id"
$env:DEPLOY_SCOPE="guild"
npm run deploy:commands
```

Deploy both guild and global:

```powershell
$env:DEPLOY_GUILD_ID="your_test_server_id"
$env:DEPLOY_SCOPE="both"
npm run deploy:commands
```

If slash commands are not showing:

- Run `npm run deploy:commands`.
- Check that the bot was invited with `applications.commands`.
- If using global deploy, wait for Discord propagation.
- For immediate testing, use `DEPLOY_SCOPE=guild`.
- Make sure you are using the same `CLIENT_ID` as the bot token.

## Start

```bash
npm start
```

Health endpoints:

```text
GET /
GET /health
```

## Connecting Channels

Only the server owner or a user with Administrator permission can connect channels.

Slash:

```text
/setchannel type:plain channel:#global-chat
/setchannel type:cv2
```

Prefix:

```text
,setchannel plain
,setchannel #global-chat plain
,setchannel #global-chat cv2
```

Run the same setup command in each server/channel you want connected. There is no extra routing argument to type.

## Sync Display Styles

Each connected channel can choose its own message style:

- `plain`: synced messages use the real sender username and avatar as the webhook identity, then show only the message content.
- `cv2`: synced messages use the bot identity and show a premium Components V2 card with the sender avatar, exact username, level, message, attachments, and source channel info.

Slash examples:

```text
/setchannel type:plain
/setchannel type:cv2
```

Prefix examples:

```text
,setchannel plain
,setchannel cv2
```

The style is required every time you run setup. Running `/setchannel` again on an already connected channel updates the style instead of making you remove and reconnect it.

## Sync Health

Use this first when sync or webhooks do not work.

Slash:

```text
/synchealth channel:#global-chat repair:true
```

Prefix:

```text
,synchealth #global-chat repair
```

It reports:

- Whether the channel is connected
- Target channel count
- Webhook status
- Missing bot permissions
- Failed webhook copies
- Stored failure count

## Recovery

Recover missing or deleted webhook messages:

```text
/recovermessages limit:25 force:true
```

Prefix:

```text
,recovermessages 25 force
```

Recovery reads MongoDB `MessageLogs`, recreates missing webhook copies, avoids healthy duplicates, and queues sends to reduce rate-limit risk.

## Commands

General:

- `/help`, `,help`
- `/ping`, `,ping`
- `/stats`, `,stats`
- `/avatar`, `,avatar`
- `/invite`, `,invite`
- `/about`, `,about`

Sync:

- `/setchannel`, `,setchannel`
- `/removechannel`, `,removechannel`
- `/synchealth`, `,synchealth`
- `/recovermessages`, `,recovermessages`

Dev (bot developers only):

- `/gban`, `,gban`
- `/gunban`, `,gunban`
- `/gmute`, `,gmute`
- `/gunmute`, `,gunmute`
- `/gwarn`, `,gwarn`
- `/purge`, `,purge`
- `/noprefix`, `,noprefix`
- `/botguild`, `,botguild`

`/botguild` and `,botguild` can list bot servers, show server details, create an invite for a server the bot is already in, make the bot leave a server, and generate the OAuth link needed to add the bot to a new server. Discord does not allow bots to self-join servers without a user authorizing the OAuth invite.

## No-Prefix System

Bot developers are defined in `.env`:

```text
DEV_IDS=123456789012345678
```

Developers can grant no-prefix access:

```text
/noprefix add user:@User reason:Trusted staff
,noprefix add @User Trusted staff
```

Remove access:

```text
/noprefix remove user:@User
,noprefix remove @User
```

A no-prefix user can run:

```text
ping
help sync
```

No-prefix command messages are handled before sync, so they will not be mirrored to other servers.

## Webhook Sync Details

For each connected channel, Globy CV2:

1. Checks bot permissions.
2. Finds or creates a webhook.
3. Stores webhook ID/token in MongoDB.
4. Caches webhook credentials in memory.
5. Sends synced messages through the target channel webhook.
6. Stores every webhook message ID for edits, deletes, and recovery.
7. Recreates broken webhooks when Discord reports deleted/invalid webhook errors.

The receiving channel's selected style controls the webhook payload. One server can keep `plain` while another server receives the same synced chat in `cv2` card style.

Attachments are uploaded when small enough. If upload fails or the file is too large, Globy CV2 keeps the sync alive and includes clean attachment links instead of failing the whole webhook send.

When uploads succeed, attachments are not repeated as extra link text. If an upload fails, the same message falls back to safe link-only attachment output.

## Startup Preloading

Startup preloading warms:

- Slash command registry
- Prefix and no-prefix command registry
- Saved webhook credentials from MongoDB

## Moderation and Safety

Before syncing, Globy CV2 checks:

- `@everyone` and `@here`
- Role mention abuse
- Mass mention spam
- Invite links
- Scam patterns
- Toxic words from `TOXIC_WORDS`
- Excessive caps
- Repeated messages
- Emoji spam
- Rapid spam
- Global bans and mutes

Synced webhook messages use empty `allowedMentions`, so dangerous mentions cannot ping people across servers.

## MongoDB Collections

- `Users`: basic Discord user cache
- `Guilds`: server settings and sync state
- `Networks`: internal routing stats and feature switches
- `Channels`: connected channels and webhook credentials
- `Profiles`: XP, level, and message counts
- `XPs`: XP audit events
- `ModerationLogs`: blocked messages, actions, webhook failures, recovery logs
- `Blacklists`: global bans, mutes, warnings
- `MessageLogs`: original and webhook message mapping for recovery
- `Settings`: future scoped settings
- `NoPrefixUsers`: developer-granted no-prefix access

## Troubleshooting

Slash commands do not show:

- Run `npm run deploy:commands`.
- Confirm `CLIENT_ID` is the application ID.
- Reinvite the bot with `applications.commands`.
- Use guild deploy for instant testing.

Messages do not sync:

- Run `/synchealth repair:true`.
- Make sure `/setchannel` has been run in both channels.
- Check `Manage Webhooks`, `View Channel`, `Send Messages`, `Embed Links`, `Attach Files`, and `Read Message History`.

Webhooks fail:

- Run `/synchealth repair:true`.
- Check whether another bot/user deleted the webhook.
- Re-run `/setchannel` if the channel was deleted and recreated.
- Use `/recovermessages` after repairing.

## Production Notes

- Rotate tokens immediately if they are shared anywhere.
- Use MongoDB Atlas backups.
- Keep `SYNC_QUEUE_DELAY` above `500ms` for large deployments.
- Monitor `MessageLogs` growth.
- Use `/synchealth` after permission or channel changes.
