const { SlashCommandBuilder } = require('discord.js');
const { infoPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn what Globy CV2 does.'),

  async execute(interaction, client) {
    await interaction.reply(infoPanel(`${emojis.globe} Globy CV2`, 'A premium cross-server Discord communication platform powered by webhooks, synchronized profiles, global moderation, and recovery systems.', {
      fields: [
        { name: 'Sync Engine', value: 'Cross-server webhook sync with edits, deletes, attachments, replies, and recovery.' },
        { name: 'Profiles', value: 'Global XP, levels, message counts, and Canvas profile cards.' },
        { name: 'Safety', value: 'Mention protection, spam filters, scam checks, blacklist tools, and moderation logs.' }
      ]
    }));
  }
};
