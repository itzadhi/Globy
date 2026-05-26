const { SlashCommandBuilder } = require('discord.js');
const { discordTimestamp } = require('../../utils/time');
const { infoPanel } = require('../../utils/componentsV2');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server.'),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    await interaction.reply(infoPanel(guild.name, 'Server information for this Discord community.', {
      fields: [
        { name: 'Owner', value: owner ? `${owner.user.tag}` : 'Unknown' },
        { name: 'Members', value: `${guild.memberCount}` },
        { name: 'Created', value: discordTimestamp(guild.createdAt, 'D') },
        { name: 'Server ID', value: guild.id }
      ]
    }));
  }
};
