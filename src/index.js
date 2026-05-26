const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const { config, requireRuntimeConfig } = require('./config/env');
const { connectDatabase, pingDatabase } = require('./services/databaseService');
const { loadCommands, loadPrefixCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const logger = require('./utils/logger');

async function startHealthServer(client) {
  const app = express();

  app.get('/', (request, response) => {
    response.json({
      name: 'Globy CV2',
      status: client.isReady() ? 'online' : 'starting'
    });
  });

  app.get('/health', async (request, response) => {
    const database = await pingDatabase().catch((error) => ({
      ok: false,
      latency: null,
      message: error.message
    }));

    response.json({
      status: client.isReady() && database.ok ? 'ok' : 'degraded',
      discord: client.isReady(),
      database,
      uptime: process.uptime()
    });
  });

  app.listen(config.port, () => {
    logger.success(`Health server listening on port ${config.port}`);
  });
}

async function main() {
  requireRuntimeConfig();
  logger.banner('Globy CV2 Boot', [
    ['Mode', config.nodeEnv],
    ['Node', process.version],
    ['Prefix', config.commands.prefix],
    ['Status', config.brand.status]
  ]);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
  });

  loadCommands(client);
  loadPrefixCommands(client);
  loadEvents(client);

  await connectDatabase();
  await startHealthServer(client);
  await client.login(config.token);
}

main().catch((error) => {
  logger.error('Failed to start Globy CV2:', error);
  process.exit(1);
});
