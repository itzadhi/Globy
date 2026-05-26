const { SlashCommandBuilder } = require('discord.js');
const { pingDatabase } = require('../../services/databaseService');
const { formatDuration } = require('../../utils/time');
const { config } = require('../../config/env');
const { panelPayload } = require('../../utils/componentsV2');

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

    await interaction.editReply(panelPayload({
      title: 'Globy Status',
      description: 'Live CV2 runtime.',
      accentColor: color,
      fields: [
        { name: 'API Ping', value: `${apiLatency}ms` },
        { name: 'Database', value: database.ok ? `Connected (${database.latency}ms)` : `Offline: ${database.message}` },
        { name: 'WebSocket', value: `${client.ws.ping}ms` },
        { name: 'Uptime', value: formatDuration(client.uptime || 0) }
      ]
    }));
  }
};
