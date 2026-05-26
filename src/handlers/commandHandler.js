const path = require('path');
const { Collection } = require('discord.js');
const { walkJavaScriptFiles } = require('../utils/files');
const logger = require('../utils/logger');

function loadCommands(client) {
  client.commands = new Collection();
  const commandDirectory = path.join(__dirname, '..', 'commands');
  const commandFiles = walkJavaScriptFiles(commandDirectory);

  for (const file of commandFiles) {
    const command = require(file);
    if (!command?.data?.name || typeof command.execute !== 'function') {
      logger.warn(`Skipped invalid command file: ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  logger.success(`Loaded ${client.commands.size} slash commands`);
}

function registerPrefixCommand(client, command) {
  if (!command?.name || typeof command.execute !== 'function') {
    return false;
  }

  const names = [command.name, ...(command.aliases || [])]
    .map((name) => String(name).toLowerCase())
    .filter(Boolean);

  for (const name of names) {
    client.prefixCommands.set(name, command);
  }

  return true;
}

function loadPrefixCommands(client) {
  client.prefixCommands = new Collection();
  const commandDirectory = path.join(__dirname, '..', 'prefixCommands');
  const commandFiles = walkJavaScriptFiles(commandDirectory).filter((file) => !file.endsWith('helpers.js'));
  let loaded = 0;

  for (const file of commandFiles) {
    const exported = require(file);
    const commands = Array.isArray(exported) ? exported : [exported];

    for (const command of commands) {
      if (registerPrefixCommand(client, command)) {
        loaded += 1;
      } else {
        logger.warn(`Skipped invalid prefix command in: ${file}`);
      }
    }
  }

  logger.success(`Loaded ${loaded} prefix commands`);
}

module.exports = {
  loadCommands,
  loadPrefixCommands
};
