const { ActivityType, Events } = require('discord.js');
const { config } = require('../config/env');
const { upsertGuild } = require('../services/guildService');
const { preloadRuntime } = require('../services/preloadService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [
        {
          name: config.brand.status,
          state: config.brand.status,
          type: ActivityType.Custom
        }
      ],
      status: 'online'
    });

    await Promise.allSettled(client.guilds.cache.map((guild) => upsertGuild(guild)));
    const preload = await preloadRuntime(client);
    logger.startup(client, preload, config);
  }
};
