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
  const deployGuildId = process.env.DEPLOY_GUILD_ID || config.guildId;
  const scope = (process.env.DEPLOY_SCOPE || (deployGuildId ? 'guild' : 'global')).toLowerCase();

  if (scope === 'guild' || scope === 'both') {
    if (!deployGuildId) {
      throw new Error('DEPLOY_SCOPE=guild requires DEPLOY_GUILD_ID or GUILD_ID.');
    }

    await rest.put(Routes.applicationGuildCommands(config.clientId, deployGuildId), { body: commands });
    const registered = await rest.get(Routes.applicationGuildCommands(config.clientId, deployGuildId));
    logger.success(`Deployed ${registered.length} guild commands to ${deployGuildId}: ${registered.map((command) => command.name).join(', ')}`);
  }

  if (scope === 'global' || scope === 'both') {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    const registered = await rest.get(Routes.applicationCommands(config.clientId));
    logger.success(`Deployed ${registered.length} global commands: ${registered.map((command) => command.name).join(', ')}`);
  }

  if (!['guild', 'global', 'both'].includes(scope)) {
    throw new Error('DEPLOY_SCOPE must be guild, global, or both.');
  }
}

main().catch((error) => {
  logger.error('Failed to deploy slash commands:', error);
  process.exit(1);
});
