const { Events } = require('discord.js');
const { isDeveloper } = require('../middleware/permissions');
const { parseOwnedCustomId } = require('../utils/componentIds');
const { errorPanel } = require('../utils/componentsV2');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isMessageComponent()) {
      const owner = parseOwnedCustomId(interaction.customId);
      if (owner && owner.ownerId !== interaction.user.id) {
        await interaction.reply({
          content: 'This panel belongs to the user who ran the command.',
          ephemeral: true
        }).catch(() => null);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (command.devOnly && !isDeveloper(interaction.user.id)) {
        throw new Error('Only configured bot developers can use this command.');
      }

      await command.execute(interaction, client);
    } catch (error) {
      logger.error(`Command /${interaction.commandName} failed:`, error);
      const payload = errorPanel('Action Blocked', error.message || 'Something went wrong while running this command.', {
        ephemeral: true
      });

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  }
};
