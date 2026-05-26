const { Events } = require('discord.js');
const SyncChannel = require('../models/Channel');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel?.id) return;
    await SyncChannel.updateOne(
      { channelId: channel.id },
      {
        $set: {
          active: false
        }
      }
    );
  }
};
