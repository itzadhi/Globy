const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Network = require('../../models/Network');
const Profile = require('../../models/Profile');
const MessageLog = require('../../models/MessageLog');
const Blacklist = require('../../models/Blacklist');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show global Globy CV2 platform stats.'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const [networks, channels, profiles, messages, restrictions] = await Promise.all([
      Network.countDocuments({ active: true }),
      SyncChannel.countDocuments({ active: true }),
      Profile.countDocuments(),
      MessageLog.countDocuments(),
      Blacklist.countDocuments({ active: true })
    ]);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${emojis.globe} Globy CV2 Stats`)
      .addFields(
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Networks', value: `${networks}`, inline: true },
        { name: 'Connected Channels', value: `${channels}`, inline: true },
        { name: 'Profiles', value: `${profiles}`, inline: true },
        { name: 'Logged Messages', value: `${messages}`, inline: true },
        { name: 'Active Restrictions', value: `${restrictions}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
