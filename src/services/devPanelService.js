const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const { config } = require('../config/env');
const {
  botInviteUrl,
  guildDetails,
  listBotGuilds,
  resolveBotGuild
} = require('./botGuildService');
const { listNoPrefixUsers } = require('./noPrefixService');
const { cleanUiText, container, linkButton, text } = require('../utils/componentsV2');
const { ownedCustomId, parseOwnedCustomId } = require('../utils/componentIds');
const { discordTimestamp } = require('../utils/time');

const PANEL_TIME = 120000;

function flags(ephemeral) {
  return ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2;
}

function panel(blocks, options = {}) {
  return {
    components: [container({ blocks })],
    flags: flags(options.ephemeral),
    allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
  };
}

function clipped(value, limit = 90) {
  const clean = cleanUiText(value);
  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
}

function secondaryButton(scope, action, ownerId, label) {
  return new ButtonBuilder()
    .setCustomId(ownedCustomId(scope, action, ownerId))
    .setStyle(ButtonStyle.Secondary)
    .setLabel(label);
}

function botGuildLimit(value) {
  return Math.min(Math.max(Number(value) || 25, 1), 25);
}

function botGuildSelect(client, ownerId, selectedGuildId = null, limit = 25) {
  const guilds = listBotGuilds(client, botGuildLimit(limit));
  if (!guilds.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(ownedCustomId('botguild', 'select', ownerId))
      .setPlaceholder('Choose a server...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(guilds.map((guild) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(clipped(guild.name, 90) || guild.id)
          .setValue(guild.id)
          .setDescription(clipped(`${guild.memberCount || 'Unknown'} members | ${guild.id}`, 100))
          .setDefault(guild.id === selectedGuildId)
      ))
  );
}

function row(blocks, actionRow) {
  if (actionRow) blocks.push({ type: 'row', row: actionRow });
}

function buildBotGuildHomePayload(client, ownerId, options = {}) {
  const limit = botGuildLimit(options.limit);
  const guilds = listBotGuilds(client, limit);
  const blocks = [
    text([
      '# Bot Server Manager',
      '',
      'Select a server to inspect it. Use the invite subcommand when you need an invite link, and leave only when you are sure.'
    ].join('\n')),
    { type: 'separator' },
    text([
      `**Cached Servers:** ${client.guilds.cache.size}`,
      `**Shown In Menu:** ${guilds.length}`,
      `**Join Link:** available below`
    ].join('\n')),
    { type: 'separator' },
    text('**Choose a server:**')
  ];

  row(blocks, botGuildSelect(client, ownerId, null, limit));
  row(blocks, new ActionRowBuilder().addComponents(linkButton('Bot Join Link', botInviteUrl(config.clientId))));

  return panel(blocks, options);
}

async function buildBotGuildDetailPayload(client, guild, ownerId, options = {}) {
  const details = await guildDetails(guild);
  const blocks = [
    text([
      `# ${cleanUiText(details.name) || 'Server Details'}`,
      '',
      options.notice ? cleanUiText(options.notice) : 'Server details visible to the bot.'
    ].join('\n')),
    { type: 'separator' },
    text([
      `**Server ID:** \`${details.id}\``,
      `**Owner:** ${cleanUiText(details.owner)}`,
      `**Members:** ${details.members}`,
      `**Channels:** ${details.channels}`,
      `**Roles:** ${details.roles}`,
      `**Created:** ${discordTimestamp(details.createdAt, 'D')}`,
      `**Bot Joined:** ${details.joinedAt ? discordTimestamp(details.joinedAt, 'D') : 'Unknown'}`,
      `**Shard:** ${details.shardId}`
    ].join('\n')),
    { type: 'separator' }
  ];

  if (options.inviteUrl) {
    row(blocks, new ActionRowBuilder().addComponents(linkButton('Open Invite', options.inviteUrl)));
    blocks.push({ type: 'separator', divider: false });
  }

  blocks.push(text('**Jump to another server:**'));
  row(blocks, botGuildSelect(client, ownerId, guild.id, options.limit));
  row(blocks, new ActionRowBuilder().addComponents(secondaryButton('botguild', 'home', ownerId, 'Back to Main Page')));

  return panel(blocks, options);
}

function noPrefixSelect(records, ownerId, selectedUserId = null) {
  if (!records.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(ownedCustomId('noprefix', 'select', ownerId))
      .setPlaceholder('Choose a user...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(records.slice(0, 25).map((record) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(clipped(record.username || record.userId, 90) || record.userId)
          .setValue(record.userId)
          .setDescription(clipped(record.reason || 'Trusted no-prefix user', 100))
          .setDefault(record.userId === selectedUserId)
      ))
  );
}

async function safeNoPrefixUsers() {
  return listNoPrefixUsers(25).catch(() => []);
}

async function buildNoPrefixHomePayload(ownerId, options = {}) {
  const records = await safeNoPrefixUsers();
  const blocks = [
    text([
      '# No-Prefix Manager',
      '',
      'Review trusted users who can run commands without typing the prefix.'
    ].join('\n')),
    { type: 'separator' },
    text([
      `**System:** ${config.commands.noPrefixEnabled ? 'Enabled' : 'Disabled'}`,
      `**Prefix:** \`${config.commands.prefix}\``,
      `**Allowlisted Users:** ${records.length}`
    ].join('\n')),
    { type: 'separator' },
    text(records.length ? '**Choose a user:**' : 'No database allowlist users yet. Bot developers still work automatically.')
  ];

  row(blocks, noPrefixSelect(records, ownerId));
  return panel(blocks, options);
}

async function buildNoPrefixDetailPayload(ownerId, userId, options = {}) {
  const records = await safeNoPrefixUsers();
  const record = records.find((item) => item.userId === userId);
  if (!record) return buildNoPrefixHomePayload(ownerId, options);

  const blocks = [
    text([
      '# No-Prefix User',
      '',
      `Details for <@${record.userId}>.`
    ].join('\n')),
    { type: 'separator' },
    text([
      `**User ID:** \`${record.userId}\``,
      `**Saved Name:** ${cleanUiText(record.username || 'Unknown')}`,
      `**Reason:** ${cleanUiText(record.reason || 'No reason provided')}`,
      `**Added By:** <@${record.addedBy}>`,
      `**Added:** ${record.createdAt ? discordTimestamp(record.createdAt, 'D') : 'Unknown'}`
    ].join('\n')),
    { type: 'separator' },
    text('**Jump to another user:**')
  ];

  row(blocks, noPrefixSelect(records, ownerId, record.userId));
  row(blocks, new ActionRowBuilder().addComponents(secondaryButton('noprefix', 'home', ownerId, 'Back to Main Page')));

  return panel(blocks, options);
}

async function replyWithError(component, error) {
  await component.followUp({
    content: error.message || 'This panel could not be updated.',
    ephemeral: true
  }).catch(() => null);
}

function wireBotGuildCollector(message, ownerId, client, options = {}) {
  const collector = message.createMessageComponentCollector({
    time: options.time || PANEL_TIME,
    filter: (component) => component.user.id === ownerId
  });

  collector.on('collect', async (component) => {
    const parsed = parseOwnedCustomId(component.customId);
    if (!parsed || parsed.scope !== 'botguild') return;

    try {
      await component.deferUpdate();
      if (parsed.action === 'home') {
        await component.editReply(buildBotGuildHomePayload(client, ownerId, options));
        return;
      }

      if (parsed.action === 'select') {
        const guild = await resolveBotGuild(client, component.values?.[0]);
        await component.editReply(await buildBotGuildDetailPayload(client, guild, ownerId, options));
      }
    } catch (error) {
      await replyWithError(component, error);
    }
  });

  return collector;
}

function wireNoPrefixCollector(message, ownerId, options = {}) {
  const collector = message.createMessageComponentCollector({
    time: options.time || PANEL_TIME,
    filter: (component) => component.user.id === ownerId
  });

  collector.on('collect', async (component) => {
    const parsed = parseOwnedCustomId(component.customId);
    if (!parsed || parsed.scope !== 'noprefix') return;

    try {
      await component.deferUpdate();
      if (parsed.action === 'home') {
        await component.editReply(await buildNoPrefixHomePayload(ownerId, options));
        return;
      }

      if (parsed.action === 'select') {
        await component.editReply(await buildNoPrefixDetailPayload(ownerId, component.values?.[0], options));
      }
    } catch (error) {
      await replyWithError(component, error);
    }
  });

  return collector;
}

module.exports = {
  buildBotGuildHomePayload,
  buildBotGuildDetailPayload,
  buildNoPrefixHomePayload,
  buildNoPrefixDetailPayload,
  wireBotGuildCollector,
  wireNoPrefixCollector
};
