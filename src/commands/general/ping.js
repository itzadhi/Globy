const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pingDatabase } = require('../../services/databaseService');
const { formatDuration } = require('../../utils/time');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Show Globy CV2 latency, database status, websocket ping, and uptime.'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const apiLatency = Date.now() - interaction.createdTimestamp;
    const database = await pingDatabase().catch((error) => ({
      ok: false,
      latency: null,
      message: error.message
    }));
    const color = database.ok && client.ws.ping < 250 ? config.colors.success : config.colors.warning;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emojis.ping} Globy Status`)
      .addFields(
        { name: 'API Ping', value: `${apiLatency}ms`, inline: true },
        { name: 'Database', value: database.ok ? `Connected (${database.latency}ms)` : `Offline: ${database.message}`, inline: true },
        { name: 'WebSocket', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Uptime', value: formatDuration(client.uptime || 0), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Globy CV2', iconURL: client.user.displayAvatarURL({ size: 64 }) });

    await interaction.editReply({ embeds: [embed] });
  }
};
