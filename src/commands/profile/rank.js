const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { ensureProfile, getProfileRank } = require('../../services/profileService');
const { createRankCard } = require('../../canvas/cardRenderer');

module.exports = {
  category: 'Profile',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show global XP rank and progress.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The rank card to view.').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') || interaction.user;
    await ensureProfile(user);
    const rankInfo = await getProfileRank(user.id);
    const buffer = await createRankCard(user, rankInfo);
    const attachment = new AttachmentBuilder(buffer, { name: 'globy-rank.png' });

    await interaction.editReply({ files: [attachment] });
  }
};
