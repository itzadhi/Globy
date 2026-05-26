const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn what Globy CV2 does.'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${emojis.globe} Globy CV2`)
      .setDescription('A premium cross-server Discord communication platform powered by webhooks, synchronized profiles, global moderation, and recovery systems.')
      .addFields(
        { name: 'Sync Engine', value: 'Network-based webhook sync with edits, deletes, attachments, replies, and recovery.', inline: false },
        { name: 'Profiles', value: 'Global XP, levels, reputation, ranks, leaderboards, and Canvas cards.', inline: false },
        { name: 'Safety', value: 'Mention protection, spam filters, scam checks, blacklist tools, and moderation logs.', inline: false }
      )
      .setFooter({ text: 'Globy CV2', iconURL: client.user.displayAvatarURL({ size: 64 }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
