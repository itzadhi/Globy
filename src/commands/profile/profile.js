const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { ensureProfile, getProfileRank } = require('../../services/profileService');
const { createProfileCard } = require('../../canvas/cardRenderer');

module.exports = {
  category: 'Profile',
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show a global Globy CV2 profile card.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The profile to view.').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') || interaction.user;
    await ensureProfile(user);
    const rankInfo = await getProfileRank(user.id);
    const buffer = await createProfileCard(user, rankInfo.profile, rankInfo.rank);
    const attachment = new AttachmentBuilder(buffer, { name: 'globy-profile.png' });

    await interaction.editReply({ files: [attachment] });
  }
};
