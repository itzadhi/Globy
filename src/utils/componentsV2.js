const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} = require('discord.js');
const { config } = require('../config/env');

const CUSTOM_EMOJI_PATTERN = /<a?:[A-Za-z0-9_]{1,32}:\d{17,22}>/g;
const UNICODE_EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;

function colorToInt(value) {
  const clean = String(value || '').replace('#', '');
  const parsed = Number.parseInt(clean, 16);
  return Number.isFinite(parsed) ? parsed : 0x00e5ff;
}

function cleanUiText(value) {
  return String(value || '')
    .replace(CUSTOM_EMOJI_PATTERN, '')
    .replace(UNICODE_EMOJI_PATTERN, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function compactField(field) {
  const name = cleanUiText(field.name);
  const value = cleanUiText(Array.isArray(field.value) ? field.value.join('\n') : field.value) || 'None';

  if (value.length <= 90 && !value.includes('\n')) {
    return `**${name}:** ${value}`;
  }

  return `**${name}**\n${value}`;
}

function text(content) {
  return new TextDisplayBuilder().setContent(String(content || '\u200b').slice(0, 4000));
}

function separator(divider = true) {
  return new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(SeparatorSpacingSize.Small);
}

function mediaGallery(url, description) {
  const item = new MediaGalleryItemBuilder().setURL(url);
  if (description) item.setDescription(description);
  return new MediaGalleryBuilder().addItems(item);
}

function container({ accentColor = null, blocks = [] } = {}) {
  const panel = new ContainerBuilder();
  if (accentColor && process.env.COMPONENT_SIDEBARS === 'true') {
    panel.setAccentColor(colorToInt(accentColor));
  }

  for (const block of blocks.filter(Boolean)) {
    if (typeof block === 'string') {
      panel.addTextDisplayComponents(text(block));
    } else if (block.type === 'separator') {
      panel.addSeparatorComponents(separator(block.divider));
    } else if (block.type === 'row') {
      panel.addActionRowComponents(block.row);
    } else if (block.type === 'media') {
      panel.addMediaGalleryComponents(mediaGallery(block.url, block.description));
    } else if (block.type === 'section') {
      panel.addSectionComponents(block.section);
    } else {
      panel.addTextDisplayComponents(block);
    }
  }

  return panel;
}

function panelPayload({ title, description, fields = [], accentColor, ephemeral = false, rows = [] }) {
  const lines = [];
  if (title) lines.push(`## ${cleanUiText(title)}`);
  if (description) lines.push(cleanUiText(description));

  const blocks = [text(lines.join('\n'))];

  if (fields.length) {
    blocks.push({ type: 'separator' });
    blocks.push(text(fields.map(compactField).join('\n')));
  }

  for (const row of rows) {
    blocks.push({ type: 'separator', divider: false });
    blocks.push({ type: 'row', row });
  }

  return {
    components: [container({ accentColor, blocks })],
    flags: ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2,
    allowedMentions: {
      parse: [],
      users: [],
      roles: [],
      repliedUser: false
    }
  };
}

function successPanel(title, description, options = {}) {
  return panelPayload({
    title,
    description,
    accentColor: config.colors.success,
    ...options
  });
}

function errorPanel(title, description, options = {}) {
  return panelPayload({
    title,
    description,
    accentColor: config.colors.error,
    ...options
  });
}

function infoPanel(title, description, options = {}) {
  return panelPayload({
    title,
    description,
    accentColor: config.colors.primary,
    ...options
  });
}

function warningPanel(title, description, options = {}) {
  return panelPayload({
    title,
    description,
    accentColor: config.colors.warning,
    ...options
  });
}

function linkButton(label, url) {
  return new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setURL(url)
    .setLabel(label);
}

function actionRow(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

module.exports = {
  text,
  cleanUiText,
  separator,
  mediaGallery,
  container,
  panelPayload,
  successPanel,
  errorPanel,
  infoPanel,
  warningPanel,
  linkButton,
  actionRow
};
