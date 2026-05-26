const { SlashCommandBuilder } = require('discord.js');
const { infoPanel } = require('../../utils/componentsV2');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn what Globy CV2 does.'),

  async execute(interaction, client) {
    await interaction.reply(infoPanel('Globy CV2', 'Cross-server chat, webhook sync, safety, and recovery in one clean system.', {
      fields: [
        { name: 'Sync', value: 'Webhook relay with edits, deletes, replies, and files.' },
        { name: 'Safety', value: 'Mention protection, spam checks, and dev moderation.' },
        { name: 'Recovery', value: 'MongoDB-backed message repair after outages.' }
      ]
    }));
  }
};
