const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(url)
        .setLabel('Invite Globy CV2')
    );

    await interaction.reply({
      embeds: [infoEmbed('Invite Globy CV2', 'Add the bot with the permissions needed for webhook sync and slash commands.', client)],
      components: [row],
      ephemeral: true
    });
  }
};
