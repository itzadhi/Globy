const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { getSyncHealth } = require('../../services/syncHealthService');
const { isOwnerOrAdmin } = require('../../middleware/permissions');
const { panelPayload } = require('../../utils/componentsV2');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('synchealth')
    .setDescription('Check and optionally repair sync/webhook health for a channel.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to inspect. Defaults to this channel.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('repair')
        .setDescription('Recreate or refresh the webhook if permissions allow it.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwnerOrAdmin(interaction.member, interaction.guild)) {
      throw new Error('Only the server owner or users with Administrator permission can check and repair sync health.');
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const health = await getSyncHealth(interaction.client, channel, {
      repair: interaction.options.getBoolean('repair') || false
    });

    await interaction.editReply(panelPayload({
      title: `${emojis.shield} Sync Health`,
      description: `Health report for ${channel}.`,
      accentColor: health.missing?.length ? config.colors.warning : config.colors.success,
      ephemeral: true,
      fields: health.fields
    }));
  }
};
