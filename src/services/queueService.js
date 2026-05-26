const { config } = require('../config/env');
const logger = require('../utils/logger');

const chains = new Map();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueue(key, task, delayMs = config.sync.queueDelayMs) {
  const previous = chains.get(key) || Promise.resolve();

  const current = previous
    .catch(() => undefined)
    .then(async () => {
      if (delayMs > 0) await wait(delayMs);
      return task();
    })
    .catch((error) => {
      logger.error(`Queue task failed for ${key}:`, error);
      throw error;
    });

  chains.set(
    key,
    current.finally(() => {
      if (chains.get(key) === current) {
        chains.delete(key);
      }
    })
  );

  return current;
}

module.exports = {
  enqueue,
  wait
};
