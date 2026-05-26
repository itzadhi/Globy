const { SlashCommandBuilder } = require('discord.js');
const {
  addNoPrefixUser,
  removeNoPrefixUser,
  listNoPrefixUsers,
  isNoPrefixAllowed
} = require('../../services/noPrefixService');
const { isDeveloper } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { panelPayload, successPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Admin',
  data: new SlashCommandBuilder()
    .setName('noprefix')
    .setDescription('Manage the no-prefix command allowlist.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Show your no-prefix status.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Allow a user to run commands without the prefix.')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to allow.').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Why this user is trusted.').setRequired(false).setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the no-prefix allowlist.')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to remove.').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Why this user is being removed.').setRequired(false).setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List active no-prefix users.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const action = interaction.options.getSubcommand();

    if (action === 'status') {
      const allowed = await isNoPrefixAllowed(interaction.user.id);
      await interaction.editReply(panelPayload({
        title: `${emojis.spark} No-Prefix Status`,
        description: 'Only bot developers can grant no-prefix access.',
        accentColor: config.colors.primary,
        ephemeral: true,
        fields: [
          { name: 'System', value: config.commands.noPrefixEnabled ? 'Enabled' : 'Disabled' },
          { name: 'You Are Allowed', value: allowed ? 'Yes' : 'No' },
          { name: 'Prefix', value: `\`${config.commands.prefix}\`` }
        ]
      }));
      return;
    }

    if (!isDeveloper(interaction.user.id)) {
      throw new Error('Only configured bot developers can manage the no-prefix allowlist.');
    }

    if (action === 'add') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Trusted no-prefix user';
      const record = await addNoPrefixUser(user, interaction.user, reason);
      await interaction.editReply(successPanel(`${emojis.spark} No-Prefix Added`, `${user.tag || user.username} can now run prefix commands without \`${config.commands.prefix}\`.`, {
        fields: [{ name: 'Reason', value: record.reason }],
        ephemeral: true
      }));
      return;
    }

    if (action === 'remove') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Removed from no-prefix allowlist';
      const modified = await removeNoPrefixUser(user.id, interaction.user, reason);
      if (!modified) throw new Error('That user is not currently on the no-prefix allowlist.');

      await interaction.editReply(successPanel(`${emojis.shield} No-Prefix Removed`, `${user.tag || user.username} must use \`${config.commands.prefix}\` again.`, {
        ephemeral: true
      }));
      return;
    }

    const records = await listNoPrefixUsers(15);
    const description = records.length
      ? records.map((record, index) => `${index + 1}. <@${record.userId}> - ${record.reason}`).join('\n')
      : 'No database allowlist users yet. Bot developers still work automatically.';

    await interaction.editReply(panelPayload({
      title: `${emojis.spark} No-Prefix Allowlist`,
      description,
      accentColor: config.colors.primary,
      ephemeral: true
    }));
  }
};
