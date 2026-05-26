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

Fill `.env` with your private values.

Useful command settings:

```text
PREFIX=,
NO_PREFIX_ENABLED=true
NO_PREFIX_IDS=
```

`DEV_IDS` users automatically get no-prefix access. Add extra trusted users later with `/noprefix add` or `,noprefix add @user`.

## 4. Deploy Slash Commands

```bash
npm run deploy:commands
```

For fast testing in one guild, temporarily add `GUILD_ID=your_test_server_id` to `.env`. Remove it when deploying globally.

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

## 7. First Network

Run this in every server/channel you want connected:

```text
/setchannel channel:#global-chat network:global
```

Or with prefix commands:

```text
,setchannel #global-chat global
```

Messages sent in any connected `global` channel will sync to the others.

## Security Reminder

If a bot token, MongoDB URI, or client secret is posted anywhere outside your private machine, rotate it before using the bot in production.
