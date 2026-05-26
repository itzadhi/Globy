const { EmbedBuilder } = require('discord.js');
const { config } = require('../config/env');

function baseEmbed({ title, description, color = config.colors.primary, client } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (client?.user) {
    embed.setFooter({
      text: 'Globy CV2',
      iconURL: client.user.displayAvatarURL({ size: 64 })
    });
  }

  return embed;
}

function successEmbed(description, client) {
  return baseEmbed({
    title: 'Success',
    description,
    color: config.colors.success,
    client
  });
}

function errorEmbed(description, client) {
  return baseEmbed({
    title: 'Action Blocked',
    description,
    color: config.colors.error,
    client
  });
}

function infoEmbed(title, description, client) {
  return baseEmbed({
    title,
    description,
    color: config.colors.primary,
    client
  });
}

module.exports = {
  baseEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed
};
