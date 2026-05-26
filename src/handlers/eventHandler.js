const path = require('path');
const { walkJavaScriptFiles } = require('../utils/files');
const logger = require('../utils/logger');

function loadEvents(client) {
  const eventDirectory = path.join(__dirname, '..', 'events');
  const eventFiles = walkJavaScriptFiles(eventDirectory);

  for (const file of eventFiles) {
    const event = require(file);
    if (!event?.name || typeof event.execute !== 'function') {
      logger.warn(`Skipped invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  logger.success(`Loaded ${eventFiles.length} event files`);
}

module.exports = {
  loadEvents
};
