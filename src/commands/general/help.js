const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} = require('discord.js');
const { config } = require('../../config/env');
const { container, text } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

const categories = {
  General: [
    { name: '/ping', value: 'Latency, database status, websocket ping, and uptime.' },
    { name: '/stats', value: 'Global platform statistics.' },
    { name: '/userinfo', value: 'Inspect a Discord user.' },
    { name: '/serverinfo', value: 'Inspect this server.' },
    { name: '/avatar', value: 'View a user avatar.' },
    { name: '/invite', value: 'Invite Globy CV2.' },
    { name: '/about', value: 'Learn what the platform does.' }
  ],
  Sync: [
    { name: '/setchannel', value: 'Make a text channel ready for global sync.' },
    { name: '/removechannel', value: 'Disconnect a channel from sync.' },
    { name: '/synchealth', value: 'Check and repair channel/webhook sync health.' },
    { name: '/recovermessages', value: 'Restore webhook messages from MongoDB logs.' }
  ],
  Moderation: [
    { name: '/gban', value: 'Globally block a user from sync and XP.' },
    { name: '/gunban', value: 'Remove a global ban.' },
    { name: '/gmute', value: 'Globally mute a user from synced chat.' },
    { name: '/gunmute', value: 'Remove a global mute.' },
    { name: '/gwarn', value: 'Record a global warning for a user.' }
  ],
  Profile: [
    { name: '/profile', value: 'Show a Canvas global profile card.' },
    { name: '/rank', value: 'Show rank and XP progress.' },
    { name: '/leaderboard', value: 'Show top global profiles.' },
    { name: '/rep', value: 'Give reputation to another user.' }
  ],
  Admin: [
    { name: '/noprefix', value: 'Manage users who can run commands without the comma prefix.' },
    { name: 'Required setup permission', value: 'Server Owner or Administrator.' },
    { name: 'Required bot permissions', value: 'Manage Webhooks, Send Messages, Embed Links, Attach Files, Read Message History, View Channel.' },
    { name: 'Safety defaults', value: 'Dangerous mentions are blocked before sync and webhook sends use empty allowed mentions.' }
  ]
};

function render(categoryName, page, client) {
  const entries = categories[categoryName];
  const pageSize = 4;
  const maxPage = Math.max(0, Math.ceil(entries.length / pageSize) - 1);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const slice = entries.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Choose a help category')
    .addOptions(
      Object.keys(categories).map((name) => ({
        label: name,
        value: name,
        default: name === categoryName
      }))
    );

  const navigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_previous')
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Previous')
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Next')
      .setDisabled(safePage === maxPage)
  );

  const commandLines = slice.map((entry) => `### ${entry.name}\n${entry.value}`).join('\n');
  const menuRow = new ActionRowBuilder().addComponents(menu);
  const panel = container({
    accentColor: config.colors.primary,
    blocks: [
      text(`# ${emojis.spark} Globy CV2 Help\nCategory: **${categoryName}**\nPage ${safePage + 1}/${maxPage + 1}`),
      { type: 'separator' },
      text(commandLines),
      { type: 'separator', divider: false },
      { type: 'row', row: menuRow },
      { type: 'row', row: navigation }
    ]
  });

  return {
    components: [panel],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    state: { categoryName, page: safePage }
  };
}

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the interactive Globy CV2 help menu.'),

  async execute(interaction, client) {
    let state = { categoryName: 'General', page: 0 };
    const initial = render(state.categoryName, state.page, client);
    state = initial.state;

    const response = await interaction.reply({
      components: initial.components,
      flags: initial.flags,
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180000
    });

    const buttonCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180000
    });

    collector.on('collect', async (component) => {
      if (component.user.id !== interaction.user.id) {
        await component.reply({ content: 'This help menu belongs to another user.', ephemeral: true });
        return;
      }

      state.categoryName = component.values[0];
      state.page = 0;
      const view = render(state.categoryName, state.page, client);
      state = view.state;
      await component.update({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    });

    buttonCollector.on('collect', async (component) => {
      if (component.user.id !== interaction.user.id) {
        await component.reply({ content: 'This help menu belongs to another user.', ephemeral: true });
        return;
      }

      state.page += component.customId === 'help_next' ? 1 : -1;
      const view = render(state.categoryName, state.page, client);
      state = view.state;
      await component.update({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    });
  }
};
