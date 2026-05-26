const { EmbedBuilder } = require('discord.js');
const {
  ensureProfile,
  getProfileRank,
  getLeaderboard,
  giveReputation
} = require('../services/profileService');
const { isBlocked } = require('../services/blacklistService');
const {
  createProfileCard,
  createRankCard,
  createLeaderboardCard
} = require('../canvas/cardRenderer');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const { resolveUser, attachment, safeReply, usage } = require('./helpers');

module.exports = [
  {
    name: 'profile',
    aliases: ['p'],
    category: 'Profile',
    usage: 'profile [user]',
    description: 'Show a global Canvas profile card.',
    cooldown: 5,
    async execute(message, args) {
      const user = args[0] ? await resolveUser(message, args[0]) : message.author;
      if (!user) throw new Error('I could not find that user.');

      await ensureProfile(user);
      const rankInfo = await getProfileRank(user.id);
      const buffer = await createProfileCard(user, rankInfo.profile, rankInfo.rank);
      await safeReply(message, { files: [attachment(buffer, 'globy-profile.png')] });
    }
  },
  {
    name: 'rank',
    aliases: ['r'],
    category: 'Profile',
    usage: 'rank [user]',
    description: 'Show global XP rank and progress.',
    cooldown: 5,
    async execute(message, args) {
      const user = args[0] ? await resolveUser(message, args[0]) : message.author;
      if (!user) throw new Error('I could not find that user.');

      await ensureProfile(user);
      const rankInfo = await getProfileRank(user.id);
      const buffer = await createRankCard(user, rankInfo);
      await safeReply(message, { files: [attachment(buffer, 'globy-rank.png')] });
    }
  },
  {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    category: 'Profile',
    usage: 'leaderboard [limit]',
    description: 'Show the global XP leaderboard.',
    cooldown: 5,
    async execute(message, args) {
      const limit = Math.min(Math.max(Number(args[0]) || 10, 3), 15);
      const entries = await getLeaderboard(limit);

      if (!entries.length) {
        await safeReply(message, {
          embeds: [new EmbedBuilder().setColor(config.colors.primary).setTitle('Leaderboard Empty').setDescription('No profiles have earned XP yet.')]
        });
        return;
      }

      const buffer = await createLeaderboardCard(entries);
      await safeReply(message, { files: [attachment(buffer, 'globy-leaderboard.png')] });
    }
  },
  {
    name: 'rep',
    aliases: ['reputation'],
    category: 'Profile',
    usage: 'rep @user',
    description: 'Give global reputation to another user.',
    async execute(message, args, { prefix }) {
      const receiver = await resolveUser(message, args[0]);
      if (!receiver) throw new Error(`${usage(prefix, 'rep @user')}`);
      if (receiver.bot) throw new Error('Bots cannot receive reputation.');
      if (await isBlocked(message.author.id)) throw new Error('Blacklisted users cannot give reputation.');

      const profile = await giveReputation(message.author, receiver);
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.rank} Reputation Sent`)
        .setDescription(`${receiver} now has **${profile.reputation}** reputation.`);

      await safeReply(message, { embeds: [embed] });
    }
  }
];
