const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const { componentEmoji, container, text } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

const categories = [
  {
    id: 'general',
    label: 'General',
    iconKey: 'spark',
    description: 'Status, info, invite, and utility commands.',
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
    description: 'Connect channels, repair webhooks, and recover synced messages.',
    commands: [
      { name: '/setchannel', prefix: ',setchannel or ,setchannel #channel', value: 'Make this channel, or a chosen channel, ready for global sync.' },
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

const pageSize = 5;

function categoryById(id) {
  return categories.find((category) => category.id === id) || categories[0];
}

function categoryRow(activeId) {
  return new ActionRowBuilder().addComponents(
    categories.map((category) =>
      new ButtonBuilder()
        .setCustomId(`help_category:${category.id}`)
        .setStyle(category.id === activeId ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji(componentEmoji(emojis[category.iconKey]))
        .setLabel(category.label)
        .setDisabled(category.id === activeId)
    )
  );
}

function navigationRow(category, page, maxPage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_home')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(componentEmoji(emojis.spark))
      .setLabel('Home'),
    new ButtonBuilder()
      .setCustomId('help_previous')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(componentEmoji('◀️'))
      .setLabel('Previous')
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(componentEmoji('▶️'))
      .setLabel('Next')
      .setDisabled(page === maxPage),
    new ButtonBuilder()
      .setCustomId('help_close')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(componentEmoji(emojis.warn))
      .setLabel('Close')
  );
}

function renderCommandList(category, page) {
  const maxPage = Math.max(0, Math.ceil(category.commands.length / pageSize) - 1);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const commands = category.commands.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return {
    safePage,
    maxPage,
    content: commands
      .map((command) => [
        `### ${command.name}`,
        `\`${command.prefix}\``,
        command.value
      ].join('\n'))
      .join('\n\n')
  };
}

function render(state) {
  const category = categoryById(state.categoryId);
  const list = renderCommandList(category, state.page);
  const categoryIcon = emojis[category.iconKey] || emojis.spark;

  const panel = container({
    blocks: [
      text([
        `# ${emojis.spark} Globy CV2 Command Center`,
        `${categoryIcon} **${category.label}** — ${category.description}`,
        '',
        '**Fast start:** run `/setchannel` in the chat channel, then send a message. No extra IDs needed.'
      ].join('\n')),
      { type: 'separator' },
      text(list.content),
      { type: 'separator', divider: false },
      { type: 'row', row: categoryRow(category.id) },
      { type: 'row', row: navigationRow(category, list.safePage, list.maxPage) },
      { type: 'separator', divider: false },
      text(`Page **${list.safePage + 1}/${list.maxPage + 1}** • Slash, comma-prefix, and developer-granted no-prefix commands are supported.`)
    ]
  });

  return {
    components: [panel],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    state: {
      categoryId: category.id,
      page: list.safePage
    }
  };
}

function closedView() {
  return {
    components: [
      container({
        blocks: [text(`# ${emojis.spark} Help Closed\nRun \`/help\` again whenever you need the command center.`)]
      })
    ],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
  };
}

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the interactive Globy CV2 command center.'),

  async execute(interaction) {
    let state = { categoryId: 'general', page: 0 };
    const initial = render(state);
    state = initial.state;

    const response = await interaction.reply({
      components: initial.components,
      flags: initial.flags,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
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

      if (component.customId === 'help_close') {
        collector.stop('closed');
        await component.update(closedView());
        return;
      }

      if (component.customId.startsWith('help_category:')) {
        state.categoryId = component.customId.split(':')[1];
        state.page = 0;
      } else if (component.customId === 'help_home') {
        state.categoryId = 'general';
        state.page = 0;
      } else if (component.customId === 'help_previous') {
        state.page -= 1;
      } else if (component.customId === 'help_next') {
        state.page += 1;
      }

      const view = render(state);
      state = view.state;
      await component.update({
        components: view.components,
        flags: MessageFlags.IsComponentsV2
      });
    });
  }
};
