const { SlashCommandBuilder } = require('discord.js');
const { actionRow, infoPanel, linkButton } = require('../../utils/componentsV2');

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

    await interaction.reply(infoPanel(`${user.username}'s Avatar`, `[Open full-size avatar](${avatar})`, {
      rows: [actionRow(linkButton('Open Avatar', avatar))]
    }));
  }
};
