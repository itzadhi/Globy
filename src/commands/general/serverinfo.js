const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../../config/env');
const { discordTimestamp } = require('../../utils/time');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server.'),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: owner ? `${owner.user.tag}` : 'Unknown', inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created', value: discordTimestamp(guild.createdAt, 'D'), inline: true },
        { name: 'Server ID', value: guild.id, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
