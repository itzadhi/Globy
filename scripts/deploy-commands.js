const path = require('path');
const { REST, Routes } = require('discord.js');
const { config, requireCommandDeployConfig } = require('../src/config/env');
const { walkJavaScriptFiles } = require('../src/utils/files');
const logger = require('../src/utils/logger');

async function main() {
  requireCommandDeployConfig();

  const commandDirectory = path.join(__dirname, '..', 'src', 'commands');
  const commands = walkJavaScriptFiles(commandDirectory)
    .map((file) => require(file))
    .filter((command) => command?.data?.toJSON)
    .map((command) => command.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.token);

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    logger.success(`Deployed ${commands.length} guild commands to ${config.guildId}`);
    return;
  }

  await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
  logger.success(`Deployed ${commands.length} global commands`);
}

main().catch((error) => {
  logger.error('Failed to deploy slash commands:', error);
  process.exit(1);
});
