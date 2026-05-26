const { SlashCommandBuilder } = require('discord.js');
const { giveReputation } = require('../../services/profileService');
const { isBlocked } = require('../../services/blacklistService');
const { config } = require('../../config/env');
const { successPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Profile',
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give global reputation to another user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user receiving reputation.').setRequired(true)
    ),

  async execute(interaction) {
    const receiver = interaction.options.getUser('user');

    if (receiver.bot) {
      throw new Error('Bots cannot receive reputation.');
    }

    if (await isBlocked(interaction.user.id)) {
      throw new Error('Blacklisted users cannot give reputation.');
    }

    const profile = await giveReputation(interaction.user, receiver);
    await interaction.reply(successPanel(`${emojis.rank} Reputation Sent`, `${receiver} now has **${profile.reputation}** reputation.`));
  }
};
