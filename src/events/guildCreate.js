const { Events } = require('discord.js');
const { upsertGuild } = require('../services/guildService');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    await upsertGuild(guild);
  }
};
