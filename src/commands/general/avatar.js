const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../../config/env');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user avatar.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to inspect.').setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const avatar = user.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${user.username}'s avatar`)
      .setImage(avatar)
      .setDescription(`[Open avatar](${avatar})`);

    await interaction.reply({ embeds: [embed] });
  }
};
