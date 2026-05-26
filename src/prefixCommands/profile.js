const {
  ensureProfile,
  getProfileRank
} = require('../services/profileService');
const {
  createProfileCard
} = require('../canvas/cardRenderer');
const { resolveUser, attachment, safeReply } = require('./helpers');

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
  }
];
