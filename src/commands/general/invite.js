const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { actionRow, infoPanel, linkButton } = require('../../utils/componentsV2');
const { config } = require('../../config/env');

function inviteUrl(clientId) {
  const permissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages
  ].reduce((total, permission) => total | permission, 0n);

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
}

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the invite link for Globy CV2.'),

  async execute(interaction, client) {
    const url = inviteUrl(config.clientId);
    const row = actionRow(linkButton('Invite Globy CV2', url));

    await interaction.reply(infoPanel('Invite Globy CV2', 'Add the bot with the permissions needed for webhook sync and slash commands.', {
      rows: [row],
      ephemeral: true
    }));
  }
};
