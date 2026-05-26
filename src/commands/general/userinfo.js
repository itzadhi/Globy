const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../../config/env');
const { discordTimestamp } = require('../../utils/time');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to inspect.').setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(user.tag || user.username)
      .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
      .addFields(
        { name: 'User ID', value: user.id, inline: false },
        { name: 'Created', value: discordTimestamp(user.createdAt, 'D'), inline: true },
        { name: 'Joined', value: member?.joinedAt ? discordTimestamp(member.joinedAt, 'D') : 'Not in this server', inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
