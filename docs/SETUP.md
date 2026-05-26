# Globy CV2 Setup Guide

This guide walks through a clean production setup.

## 1. Discord Developer Portal

1. Create an application at the Discord Developer Portal.
2. Open the Bot page and create a bot.
3. Enable:
   - Server Members Intent
   - Message Content Intent
4. Copy the bot token into `.env` as `DISCORD_TOKEN`.
5. Copy the application ID into `.env` as `CLIENT_ID`.

## 2. MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Copy the connection URI.
4. Put it in `.env` as `MONGO_URI`.

Use a database name in the URI, for example:

```text
mongodb+srv://user:password@cluster.mongodb.net/globy
```

## 3. Local Install

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill `.env` with your private values. The normal setup only needs:

```text
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
MONGO_URI=your_mongodb_connection_string
DEV_IDS=your_discord_user_id
PREFIX=,
DEFAULT_SYNC_MODE=plain
BOT_TAGLINE=A premium cross-server Discord bot for webhook chat, profiles, moderation, and recovery.
THEME_PRIMARY=#B829FF
THEME_SECONDARY=#35FF95
THEME_BACKGROUND=#050507
```

`DEV_IDS` users automatically get no-prefix access. Bot developers can add extra trusted users later with `/noprefix add` or `,noprefix add @user`.

## 4. Deploy Slash Commands

```bash
npm run deploy:commands
```

For fast testing in one guild, temporarily add `GUILD_ID=your_test_server_id` to `.env`. Remove it when deploying globally.

PowerShell one-off guild deploy:

```powershell
$env:DEPLOY_GUILD_ID="your_test_server_id"
$env:DEPLOY_SCOPE="guild"
npm run deploy:commands
```

The deploy script prints the commands Discord accepted. If commands do not show, verify `applications.commands` was selected when inviting the bot.

## 5. Start

```bash
npm start
```

The bot also starts a tiny Express health server:

```text
GET /health
```

## 6. Invite Permissions

Use the OAuth2 URL Generator and select:

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

## 7. First Sync Channel

Run this in every server/channel you want connected:

```text
/setchannel type:plain channel:#global-chat
/setchannel type:cv2
```

Or with prefix commands:

```text
,setchannel plain
,setchannel #global-chat plain
,setchannel #global-chat cv2
```

Messages sent in any connected channel will sync to the others.

Use `plain` for exact user-webhook messages. Use `cv2` for the bot-card style with the sender avatar and username inside a premium card. The style choice is required when connecting or updating a channel.

Check sync health:

```text
/synchealth channel:#global-chat repair:true
```

## Security Reminder

If a bot token, MongoDB URI, or client secret is posted anywhere outside your private machine, rotate it before using the bot in production.
