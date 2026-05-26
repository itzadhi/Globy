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

module.exports = {
  loadCommands
};
