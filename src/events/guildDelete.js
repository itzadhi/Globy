const { Events } = require('discord.js');
const { markGuildLeft } = require('../services/guildService');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    await markGuildLeft(guild);
  }
};
