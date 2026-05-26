const { SlashCommandBuilder } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Profile = require('../../models/Profile');
const MessageLog = require('../../models/MessageLog');
const Blacklist = require('../../models/Blacklist');
const { panelPayload } = require('../../utils/componentsV2');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show global Globy CV2 platform stats.'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const [channels, profiles, messages, restrictions] = await Promise.all([
      SyncChannel.countDocuments({ active: true }),
      Profile.countDocuments(),
      MessageLog.countDocuments(),
      Blacklist.countDocuments({ active: true })
    ]);

    await interaction.editReply(panelPayload({
      title: 'Globy Stats',
      description: 'Current platform counters.',
      fields: [
        { name: 'Servers', value: `${client.guilds.cache.size}` },
        { name: 'Connected Channels', value: `${channels}` },
        { name: 'Profiles', value: `${profiles}` },
        { name: 'Logged Messages', value: `${messages}` },
        { name: 'Active Restrictions', value: `${restrictions}` }
      ]
    }));
  }
};
