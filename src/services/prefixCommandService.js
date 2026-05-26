const { cooldownCache } = require('../cache/runtimeCache');
const { config } = require('../config/env');
const { isNoPrefixAllowed } = require('./noPrefixService');
const { errorEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

function tokenize(input) {
  const matches = String(input || '').match(/"[^"]+"|'[^']+'|\S+/g) || [];
  return matches.map((item) => item.replace(/^["']|["']$/g, ''));
}

function stripBotMentionPrefix(content, client) {
  const mentionPatterns = [`<@${client.user.id}>`, `<@!${client.user.id}>`];
  const matched = mentionPatterns.find((prefix) => content.startsWith(prefix));
  if (!matched) return null;
  return content.slice(matched.length).trim();
}

async function resolveCommandInput(message, client) {
  const raw = message.content || '';
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(config.commands.prefix)) {
    const body = trimmed.slice(config.commands.prefix.length).trim();
    return {
      body,
      usedPrefix: config.commands.prefix,
      noPrefix: false,
      commandRequired: true
    };
  }

  const mentionBody = stripBotMentionPrefix(trimmed, client);
  if (mentionBody !== null) {
    return {
      body: mentionBody,
      usedPrefix: 'mention',
      noPrefix: false,
      commandRequired: true
    };
  }

  if (!config.commands.noPrefixEnabled) return null;

  const [firstToken] = tokenize(trimmed);
  if (!firstToken) return null;
  const command = client.prefixCommands.get(firstToken.toLowerCase());
  if (!command) return null;

  const allowed = await isNoPrefixAllowed(message.author.id);
  if (!allowed) return null;

  return {
    body: trimmed,
    usedPrefix: '',
    noPrefix: true,
    commandRequired: true
  };
}

async function handlePrefixCommand(message, client) {
  if (!message.guild || message.author.bot || message.webhookId) return false;
  if (!client.prefixCommands?.size) return false;

  const input = await resolveCommandInput(message, client);
  if (!input) return false;

  const parts = tokenize(input.body);
  const name = (parts.shift() || '').toLowerCase();
  if (!name) return true;

  const command = client.prefixCommands.get(name);
  if (!command) {
    if (input.commandRequired) {
      await message.reply({
        content: `Unknown command. Try \`${config.commands.prefix}help\`.`,
        allowedMentions: { repliedUser: false }
      }).catch(() => null);
    }
    return true;
  }

  const cooldownKey = `prefix:${message.author.id}:${command.name}`;
  if (cooldownCache.get(cooldownKey)) {
    await message.reply({
      content: 'Slow down a moment before using that command again.',
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
    return true;
  }

  cooldownCache.set(cooldownKey, true, command.cooldown || 2);

  try {
    await command.execute(message, parts, {
      client,
      prefix: config.commands.prefix,
      noPrefix: input.noPrefix,
      usedPrefix: input.usedPrefix
    });
  } catch (error) {
    logger.error(`Prefix command ${command.name} failed:`, error);
    await message.reply({
      embeds: [errorEmbed(error.message || 'Something went wrong while running that command.', client)],
      allowedMentions: { repliedUser: false }
    }).catch(() => null);
  }

  return true;
}

module.exports = {
  tokenize,
  handlePrefixCommand
};
