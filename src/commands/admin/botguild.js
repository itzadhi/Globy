const { SlashCommandBuilder } = require('discord.js');
const {
  botInviteUrl,
  createServerInvite,
  resolveBotGuild
} = require('../../services/botGuildService');
const {
  buildBotGuildDetailPayload,
  buildBotGuildHomePayload,
  wireBotGuildCollector
} = require('../../services/devPanelService');
const { actionRow, infoPanel, linkButton, successPanel } = require('../../utils/componentsV2');
const { config } = require('../../config/env');

function notAvailable(value) {
  return value || 'Unknown';
}

module.exports = {
  category: 'Dev',
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName('botguild')
    .setDescription('Developer-only bot server management.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List servers the bot is currently in.')
        .addIntegerOption((option) =>
          option.setName('limit').setDescription('How many servers to show.').setMinValue(1).setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Show details about a server the bot is in.')
        .addStringOption((option) =>
          option.setName('guild_id').setDescription('The server ID.').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('invite')
        .setDescription('Create or fetch an invite link for a server the bot is in.')
        .addStringOption((option) =>
          option.setName('guild_id').setDescription('The server ID.').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('leave')
        .setDescription('Make the bot leave a server.')
        .addStringOption((option) =>
          option.setName('guild_id').setDescription('The server ID.').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Why the bot is leaving.').setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('Get the bot OAuth link to invite it to a server.')
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const action = interaction.options.getSubcommand();

    if (action === 'list') {
      const limit = interaction.options.getInteger('limit') || 25;
      const response = await interaction.editReply(buildBotGuildHomePayload(client, interaction.user.id, { ephemeral: true, limit }));
      wireBotGuildCollector(response, interaction.user.id, client, { ephemeral: true, limit });
      return;
    }

    if (action === 'join') {
      const url = botInviteUrl(config.clientId);
      await interaction.editReply(infoPanel('Bot Join Link', 'Discord bots cannot self-join a server from a command. Use this OAuth link with an account that has permission to add bots.', {
        ephemeral: true,
        rows: [actionRow(linkButton('Invite Bot', url))]
      }));
      return;
    }

    const guild = await resolveBotGuild(client, interaction.options.getString('guild_id'));

    if (action === 'info') {
      const response = await interaction.editReply(await buildBotGuildDetailPayload(client, guild, interaction.user.id, { ephemeral: true }));
      wireBotGuildCollector(response, interaction.user.id, client, { ephemeral: true });
      return;
    }

    if (action === 'invite') {
      const invite = await createServerInvite(guild, `Invite requested by ${interaction.user.tag || interaction.user.username}`);
      const response = await interaction.editReply(await buildBotGuildDetailPayload(client, guild, interaction.user.id, {
        ephemeral: true,
        inviteUrl: invite.url,
        notice: `Invite created from ${invite.vanity ? 'Vanity URL' : notAvailable(invite.channel?.toString())}.`
      }));
      wireBotGuildCollector(response, interaction.user.id, client, { ephemeral: true });
      return;
    }

    const reason = interaction.options.getString('reason') || `Bot developer ${interaction.user.tag || interaction.user.username} requested leave`;
    const leavingCurrentGuild = guild.id === interaction.guildId;
    const title = leavingCurrentGuild ? 'Leaving Current Server' : 'Server Left';
    await interaction.editReply(successPanel(title, `Leaving **${guild.name}** (\`${guild.id}\`).`, {
      ephemeral: true,
      fields: [{ name: 'Reason', value: reason }]
    }));
    await guild.leave();
  }
};
