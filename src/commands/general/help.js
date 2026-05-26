const {
  ActionRowBuilder,
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const { createHelpBanner } = require('../../canvas/cardRenderer');
const { componentEmoji, container, text } = require('../../utils/componentsV2');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

const categories = [
  {
    id: 'general',
    label: 'General',
    iconKey: 'spark',
    description: 'Status, info, invite, and everyday bot utilities.',
    commands: [
      { name: '/ping', prefix: ',ping', value: 'Latency, database status, websocket ping, and uptime.' },
      { name: '/stats', prefix: ',stats', value: 'Global platform counters.' },
      { name: '/userinfo', prefix: ',userinfo @user', value: 'Inspect a Discord user.' },
      { name: '/serverinfo', prefix: ',serverinfo', value: 'Inspect this server.' },
      { name: '/avatar', prefix: ',avatar @user', value: 'Open a user avatar.' },
      { name: '/invite', prefix: ',invite', value: 'Get the bot invite link.' },
      { name: '/about', prefix: ',about', value: 'Learn what Globy CV2 does.' }
    ]
  },
  {
    id: 'sync',
    label: 'Sync',
    iconKey: 'link',
    description: 'Connect channels, pick message style, repair webhooks, and recover sync.',
    commands: [
      { name: '/setchannel', prefix: ',setchannel #channel cv2', value: 'Connect a channel. Choose `normal` or `cv2` style.' },
      { name: '/removechannel', prefix: ',removechannel #channel', value: 'Disconnect a channel from sync.' },
      { name: '/synchealth', prefix: ',synchealth #channel repair', value: 'Check and repair channel/webhook health.' },
      { name: '/recovermessages', prefix: ',recovermessages 25 force', value: 'Restore missing webhook messages from MongoDB logs.' }
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    iconKey: 'rank',
    description: 'Canvas cards, XP, ranks, leaderboard, and reputation.',
    commands: [
      { name: '/profile', prefix: ',profile @user', value: 'Show a Canvas global profile card.' },
      { name: '/rank', prefix: ',rank @user', value: 'Show rank and XP progress.' },
      { name: '/leaderboard', prefix: ',leaderboard 10', value: 'Show the global XP leaderboard card.' },
      { name: '/rep', prefix: ',rep @user', value: 'Give reputation to another user.' }
    ]
  },
  {
    id: 'moderation',
    label: 'Moderation',
    iconKey: 'shield',
    description: 'Clean channels and manage global safety actions.',
    commands: [
      { name: '/purge', prefix: ',purge 25 @user reason', value: 'Bulk-delete recent messages in this channel.' },
      { name: '/gban', prefix: ',gban @user 7d reason', value: 'Globally block a user from synced chat and XP.' },
      { name: '/gunban', prefix: ',gunban @user reason', value: 'Remove a global ban.' },
      { name: '/gmute', prefix: ',gmute @user 1h reason', value: 'Globally mute a user from synced chat.' },
      { name: '/gunmute', prefix: ',gunmute @user reason', value: 'Remove a global mute.' },
      { name: '/gwarn', prefix: ',gwarn @user reason', value: 'Record a global warning.' }
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    iconKey: 'warn',
    description: 'Developer-only controls and required setup permissions.',
    commands: [
      { name: '/noprefix', prefix: ',noprefix add @user reason', value: 'Grant or remove no-prefix access. Bot developers only.' },
      { name: 'Setup Access', prefix: 'Server Owner / Administrator', value: 'Only server owners or admins can connect and disconnect sync channels.' },
      { name: 'Bot Permissions', prefix: 'Manage Webhooks + Manage Messages', value: 'Sync needs webhooks. Purge needs Manage Messages and Read Message History.' },
      { name: 'Safety Defaults', prefix: 'Mentions blocked', value: 'Synced messages cannot ping @everyone, @here, roles, or mass mentions.' }
    ]
  }
];

function categoryById(id) {
  return categories.find((category) => category.id === id) || categories[0];
}

function totalCommands() {
  return categories.reduce((total, category) => total + category.commands.length, 0);
}

function runtimeCommandCount(client) {
  const prefixUnique = client.prefixCommands
    ? new Set([...client.prefixCommands.values()].map((command) => command.name)).size
    : 0;
  return Math.max(client.commands?.size || 0, prefixUnique) || totalCommands();
}

function categorySelect(activeId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category...')
      .addOptions(
        categories.map((category) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(category.label)
            .setValue(category.id)
            .setDescription(category.description.slice(0, 100))
            .setEmoji(componentEmoji(emojis[category.iconKey]))
            .setDefault(category.id === activeId)
        )
      )
  );
}

function commandList(category) {
  return category.commands
    .map((command) => [
      `- **${command.name}**`,
      `  \`${command.prefix}\``,
      `  ${command.value}`
    ].join('\n'))
    .join('\n');
}

async function render(client, state) {
  const category = categoryById(state.categoryId);
  const categoryIcon = emojis[category.iconKey] || emojis.spark;
  const banner = await createHelpBanner(client, {
    title: category.id === 'general' ? client.user.username : category.label.toUpperCase(),
    eyebrow: category.id === 'general' ? 'Main Menu' : 'Category',
    commandCount: runtimeCommandCount(client)
  });

  const panel = container({
    blocks: [
      { type: 'media', url: 'attachment://globy-help.png', description: `${client.user.username} help banner` },
      text([
        `## ${categoryIcon} ${category.label}`,
        `Hello, I'm **${client.user.username}** - a cross-server sync bot with webhook chat, Canvas profiles, recovery, and safety tools.`,
        '',
        '**System Info**',
        `- Prefix: \`${config.commands.prefix}\``,
        `- Commands: **${runtimeCommandCount(client)}**`,
        `- Latency: **${client.ws.ping}ms**`,
        '',
        '**Select a category below to get started.**'
      ].join('\n')),
      { type: 'separator' },
      text(commandList(category)),
      { type: 'separator', divider: false },
      { type: 'row', row: categorySelect(category.id) }
    ]
  });

  return {
    components: [panel],
    files: [new AttachmentBuilder(banner, { name: 'globy-help.png' })],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    state: { categoryId: category.id }
  };
}

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the visual Globy CV2 command center.'),

  async execute(interaction) {
    let state = { categoryId: 'general' };
    const initial = await render(interaction.client, state);
    state = initial.state;

    const response = await interaction.reply({
      components: initial.components,
      files: initial.files,
      flags: initial.flags,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180000
    });

    collector.on('collect', async (component) => {
      if (component.user.id !== interaction.user.id) {
        await component.reply({
          content: 'This help menu belongs to another user.',
          ephemeral: true
        });
        return;
      }

      state.categoryId = component.values[0] || 'general';
      const view = await render(interaction.client, state);
      state = view.state;

      await component.update({
        components: view.components,
        files: view.files,
        attachments: [],
        flags: MessageFlags.IsComponentsV2
      });
    });
  }
};
