const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  addNoPrefixUser,
  removeNoPrefixUser,
  listNoPrefixUsers,
  isNoPrefixAllowed
} = require('../../services/noPrefixService');
const { isDeveloper } = require('../../middleware/permissions');
const { config } = require('../../config/env');
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
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${emojis.spark} No-Prefix Status`)
        .setDescription([
          `System: **${config.commands.noPrefixEnabled ? 'Enabled' : 'Disabled'}**`,
          `You are allowed: **${allowed ? 'Yes' : 'No'}**`,
          `Prefix: \`${config.commands.prefix}\``
        ].join('\n'));

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!isDeveloper(interaction.user.id)) {
      throw new Error('Only configured bot developers can manage the no-prefix allowlist.');
    }

    if (action === 'add') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Trusted no-prefix user';
      const record = await addNoPrefixUser(user, interaction.user, reason);
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.spark} No-Prefix Added`)
        .setDescription(`${user.tag || user.username} can now run prefix commands without \`${config.commands.prefix}\`.`)
        .addFields({ name: 'Reason', value: record.reason, inline: false });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (action === 'remove') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Removed from no-prefix allowlist';
      const modified = await removeNoPrefixUser(user.id, interaction.user, reason);
      if (!modified) throw new Error('That user is not currently on the no-prefix allowlist.');

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.shield} No-Prefix Removed`)
        .setDescription(`${user.tag || user.username} must use \`${config.commands.prefix}\` again.`);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const records = await listNoPrefixUsers(15);
    const description = records.length
      ? records.map((record, index) => `${index + 1}. <@${record.userId}> - ${record.reason}`).join('\n')
      : 'No database allowlist users yet. Developers and `NO_PREFIX_IDS` still work automatically.';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${emojis.spark} No-Prefix Allowlist`)
      .setDescription(description);

    await interaction.editReply({ embeds: [embed] });
  }
};
