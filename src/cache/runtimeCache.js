const NodeCache = require('node-cache');

const webhookCache = new NodeCache({
  stdTTL: 60 * 30,
  checkperiod: 60,
  useClones: false
});

const cooldownCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 30,
  useClones: false
});

const fingerprintCache = new NodeCache({
  stdTTL: 20,
  checkperiod: 10,
  useClones: false
});

module.exports = {
  webhookCache,
  cooldownCache,
  fingerprintCache
};
