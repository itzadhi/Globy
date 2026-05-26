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
const { cleanUiText, container, text } = require('../utils/componentsV2');
const { config } = require('../config/env');
const { isDeveloper } = require('../middleware/permissions');

// Components V2 help menu inspired by Discord.py LayoutView containers.
// Command lists are discovered from the loaded slash/prefix commands so the menu
// stays current when commands are added, removed, or moved between categories.
const CATEGORY_META = {
  General: {
    description: 'Information, status, invite, and utility commands.'
  },
  Sync: {
    description: 'Connect channels, choose sync style, repair webhooks, and recover messages.'
  },
  Moderation: {
    description: 'Developer-only safety tools, global actions, warnings, mutes, bans, and cleanup.'
  },
  Admin: {
    description: 'Developer-only bot controls.'
  }
};

const CATEGORY_ORDER = ['General', 'Sync', 'Moderation', 'Admin'];
const excludedHelpCategories = new Set(['Profile']);

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

function commandCategories(client, options = {}) {
  const viewerIsDeveloper = isDeveloper(options.viewerId);
  const prefixMap = prefixCommandMap(client);
  const grouped = new Map();
  const seen = new Set();

  for (const command of client.commands?.values?.() || []) {
    const data = command.data?.toJSON?.();
    if (!data?.name) continue;

    const category = command.category || 'General';
    if (excludedHelpCategories.has(category)) continue;
    if (command.devOnly && !viewerIsDeveloper) continue;
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
    if (excludedHelpCategories.has(category)) continue;
    if (command.devOnly && !viewerIsDeveloper) continue;
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

function shortText(value, limit = 120) {
  const clean = cleanUiText(value);
  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
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
            .setDefault(category.id === selectedId)
        )
      )
  );
}

function homeSection(client, categories) {
  const total = totalCommandCount(categories);
  const welcomeText = [
    `# ${client.user.username} Help`,
    '',
    `> ${shortText(config.brand.tagline, 105)}`,
    '',
    `**${categories.length}** categories | **${total}** commands | **${Math.max(0, client.ws.ping)}ms** latency`
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
    const prefix = command.prefix ? `  |  \`${command.prefix}\`` : '';
    return `- **${command.name}**${prefix}\n  ${shortText(command.description, 110)}`;
  });

  let detailedText = [
    `# ${category.label} Commands`,
    '',
    shortText(category.description, 130),
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
  const categories = commandCategories(client, options);
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
  const categories = commandCategories(client, options);
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
  const viewerOptions = { viewerId: authorId };
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
      await component.update(buildHelpHomePayload(client, viewerOptions));
      return;
    }

    if (component.customId === 'help_category_select') {
      const categoryId = component.values?.[0];
      await component.update(buildHelpCategoryPayload(client, categoryId, viewerOptions));
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
