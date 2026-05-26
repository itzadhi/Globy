const { SlashCommandBuilder } = require('discord.js');
const { discordTimestamp } = require('../../utils/time');
const { infoPanel } = require('../../utils/componentsV2');

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

    await interaction.reply(infoPanel(user.tag || user.username, 'Discord account information.', {
      fields: [
        { name: 'User ID', value: user.id },
        { name: 'Created', value: discordTimestamp(user.createdAt, 'D') },
        { name: 'Joined', value: member?.joinedAt ? discordTimestamp(member.joinedAt, 'D') : 'Not in this server' },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No' }
      ]
    }));
  }
};
