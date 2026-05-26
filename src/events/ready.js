const { ActivityType, Events } = require('discord.js');
const { upsertGuild } = require('../services/guildService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [
        {
          name: 'global networks sync',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    await Promise.allSettled(client.guilds.cache.map((guild) => upsertGuild(guild)));
    logger.success(`${client.user.tag} is online in ${client.guilds.cache.size} servers`);
  }
};
