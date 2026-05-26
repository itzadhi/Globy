const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SectionBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ThumbnailBuilder
} = require('discord.js');
const { componentEmoji, container, text } = require('../utils/componentsV2');
const { config } = require('../config/env');
const emojis = require('../config/emojis');

// Components V2 help menu inspired by Discord.py LayoutView containers.
// Command lists are discovered from the loaded slash/prefix commands so the menu
// stays current when commands are added, removed, or moved between categories.
const CATEGORY_META = {
  General: {
    icon: () => emojis.spark,
    description: 'Information, status, invite, and utility commands.'
  },
  Sync: {
    icon: () => emojis.link,
    description: 'Connect channels, choose sync style, repair webhooks, and recover messages.'
  },
  Profile: {
    icon: () => emojis.profile,
    description: 'Global XP, levels, message counts, and profile cards.'
  },
  Moderation: {
    icon: () => emojis.shield,
    description: 'Safety tools, global actions, warnings, mutes, bans, and cleanup.'
  },
  Admin: {
    icon: () => emojis.warn,
    description: 'Developer and administrator controls.'
  }
};

const CATEGORY_ORDER = ['General', 'Sync', 'Profile', 'Moderation', 'Admin'];

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

function commandDescription(command) {
  return command.data?.toJSON?.().description || command.description || 'No description provided.';
}

function prefixCommandMap(client) {
  const map = new Map();
  for (const command of client.prefixCommands?.values?.() || []) {
    if (!map.has(command.name)) map.set(command.name, command);
  }
  return map;
}

function formatPrefixUsage(command) {
  if (!command) return null;
  return `${config.commands.prefix}${command.usage || command.name}`;
}

function commandCategories(client) {
  const prefixMap = prefixCommandMap(client);
  const grouped = new Map();
  const seen = new Set();

  for (const command of client.commands?.values?.() || []) {
    const data = command.data?.toJSON?.();
    if (!data?.name) continue;

    const category = command.category || 'General';
    if (!grouped.has(category)) grouped.set(category, []);

    const matchingPrefix = prefixMap.get(data.name);
    grouped.get(category).push({
      id: data.name,
      name: `/${data.name}`,
      prefix: formatPrefixUsage(matchingPrefix),
      description: commandDescription(command)
    });
    seen.add(data.name);
  }

  for (const command of prefixMap.values()) {
    if (seen.has(command.name)) continue;
    const category = command.category || 'General';
    if (!grouped.has(category)) grouped.set(category, []);

    grouped.get(category).push({
      id: command.name,
      name: formatPrefixUsage(command),
      prefix: null,
      description: command.description || 'No description provided.'
    });
  }

  const categories = [...grouped.entries()]
    .map(([name, commands]) => {
      const meta = CATEGORY_META[name] || {};
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        label: name,
        icon: meta.icon?.() || emojis.spark,
        description: meta.description || `${name} commands for Globy CV2.`,
        commands: commands.sort((a, b) => a.id.localeCompare(b.id))
      };
    })
    .sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.name);
      const bIndex = CATEGORY_ORDER.indexOf(b.name);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return a.name.localeCompare(b.name);
    });

  if (categories.length) return categories;

  return [{
    id: 'general',
    name: 'General',
    label: 'General',
    icon: emojis.spark,
    description: CATEGORY_META.General.description,
    commands: []
  }];
}

function categoryById(categories, id) {
  return categories.find((category) => category.id === id) || categories[0];
}

function totalCommandCount(categories) {
  return categories.reduce((sum, category) => sum + category.commands.length, 0);
}

function botAvatarUrl(client) {
  return client.user.displayAvatarURL({ extension: 'png', size: 256 });
}

function quickLinkButtons(client) {
  const buttons = [
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Invite')
      .setURL(inviteUrl(config.clientId))
  ];

  if (config.links.supportServerUrl) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Support')
        .setURL(config.links.supportServerUrl)
    );
  }

  if (config.links.websiteUrl) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Website')
        .setURL(config.links.websiteUrl)
    );
  }

  return buttons.slice(0, 5);
}

function categorySelect(categories, selectedId = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Choose a category...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        categories.slice(0, 25).map((category) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(category.label)
            .setValue(category.id)
            .setDescription(`View ${category.commands.length} commands`)
            .setEmoji(componentEmoji(category.icon))
            .setDefault(category.id === selectedId)
        )
      )
  );
}

function homeSection(client, categories) {
  const total = totalCommandCount(categories);
  const welcomeText = [
    `# ${client.user.username} Help!`,
    '',
    `> ${config.brand.tagline}`,
    '',
    '**Quick Stats:**',
    `> - **${categories.length}** Command Categories`,
    `> - **${total}** Total Commands`,
    `> - **${Math.max(0, client.ws.ping)}ms** Live Latency`
  ].join('\n');

  return new SectionBuilder()
    .addTextDisplayComponents(text(welcomeText))
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(botAvatarUrl(client))
        .setDescription(`${client.user.username} avatar`)
    );
}

function categorySection(client, category) {
  const commandLines = category.commands.map((command) => {
    const prefix = command.prefix ? `\n> Prefix: \`${command.prefix}\`` : '';
    return `- **${command.name}**\n> ${command.description}${prefix}`;
  });

  let detailedText = [
    `# ${category.label} Commands`,
    '',
    category.description,
    '',
    commandLines.join('\n')
  ].join('\n');

  if (detailedText.length > 3950) {
    detailedText = `${detailedText.slice(0, 3900)}\n\n... and more commands`;
  }

  return new SectionBuilder()
    .addTextDisplayComponents(text(detailedText))
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(botAvatarUrl(client))
        .setDescription(`${category.label} commands`)
    );
}

function actionRowsForHome(client, categories) {
  const rows = [
    categorySelect(categories)
  ];
  const links = quickLinkButtons(client);
  if (links.length) rows.push(new ActionRowBuilder().addComponents(links));
  return rows;
}

function actionRowsForCategory(categories, category) {
  return [
    categorySelect(categories, category.id),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_back_home')
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Back to Main Menu')
    )
  ];
}

function payloadFlags(ephemeral) {
  return ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2;
}

function buildHelpHomePayload(client, options = {}) {
  const categories = commandCategories(client);
  const blocks = [
    { type: 'section', section: homeSection(client, categories) },
    { type: 'separator' },
    text('**Choose a category:**')
  ];

  for (const row of actionRowsForHome(client, categories)) {
    blocks.push({ type: 'row', row });
  }

  return {
    components: [container({ blocks })],
    flags: payloadFlags(options.ephemeral),
    allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
  };
}

function buildHelpCategoryPayload(client, categoryId, options = {}) {
  const categories = commandCategories(client);
  const category = categoryById(categories, categoryId);
  const blocks = [
    { type: 'section', section: categorySection(client, category) },
    { type: 'separator' },
    text('**Choose another category or go back:**')
  ];

  for (const row of actionRowsForCategory(categories, category)) {
    blocks.push({ type: 'row', row });
  }

  return {
    components: [container({ blocks })],
    flags: payloadFlags(options.ephemeral),
    allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
  };
}

function wireHelpCollector(message, authorId, client, options = {}) {
  const collector = message.createMessageComponentCollector({ time: options.time || 120000 });

  collector.on('collect', async (component) => {
    if (component.user.id !== authorId) {
      await component.reply({
        content: "This help menu isn't for you. Please run the help command yourself.",
        ephemeral: true
      });
      return;
    }

    if (component.customId === 'help_back_home') {
      await component.update(buildHelpHomePayload(client));
      return;
    }

    if (component.customId === 'help_category_select') {
      const categoryId = component.values?.[0];
      await component.update(buildHelpCategoryPayload(client, categoryId));
    }
  });

  return collector;
}

module.exports = {
  buildHelpHomePayload,
  buildHelpCategoryPayload,
  commandCategories,
  wireHelpCollector
};
