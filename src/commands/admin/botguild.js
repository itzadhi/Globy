const { SlashCommandBuilder } = require('discord.js');
const {
  botInviteUrl,
  createServerInvite,
  guildDetails,
  guildLine,
  listBotGuilds,
  resolveBotGuild
} = require('../../services/botGuildService');
const { discordTimestamp } = require('../../utils/time');
const { actionRow, infoPanel, linkButton, successPanel } = require('../../utils/componentsV2');
const { config } = require('../../config/env');

function notAvailable(value) {
  return value || 'Unknown';
}

module.exports = {
  category: 'Admin',
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
      const limit = interaction.options.getInteger('limit') || 10;
      const guilds = listBotGuilds(client, limit);
      await interaction.editReply(infoPanel('Bot Servers', guilds.length
        ? guilds.map(guildLine).join('\n\n')
        : 'The bot is not currently cached in any servers.', {
          ephemeral: true,
          fields: [{ name: 'Total Cached', value: `${client.guilds.cache.size}` }]
        }));
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
      const details = await guildDetails(guild);
      await interaction.editReply(infoPanel(details.name, 'Server details visible to the bot.', {
        ephemeral: true,
        fields: [
          { name: 'Server ID', value: details.id },
          { name: 'Owner', value: details.owner },
          { name: 'Members', value: `${details.members}` },
          { name: 'Channels', value: `${details.channels}` },
          { name: 'Roles', value: `${details.roles}` },
          { name: 'Created', value: discordTimestamp(details.createdAt, 'D') },
          { name: 'Bot Joined', value: details.joinedAt ? discordTimestamp(details.joinedAt, 'D') : 'Unknown' },
          { name: 'Shard', value: `${details.shardId}` }
        ]
      }));
      return;
    }

    if (action === 'invite') {
      const invite = await createServerInvite(guild, `Invite requested by ${interaction.user.tag || interaction.user.username}`);
      await interaction.editReply(infoPanel('Server Invite Created', `Invite for **${guild.name}**.`, {
        ephemeral: true,
        fields: [
          { name: 'Server ID', value: guild.id },
          { name: 'Channel', value: invite.vanity ? 'Vanity URL' : notAvailable(invite.channel?.toString()) }
        ],
        rows: [actionRow(linkButton('Open Invite', invite.url))]
      }));
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
