const chalk = require('chalk');
const util = require('util');

function stamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function render(value) {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'object' && value !== null) {
    return util.inspect(value, {
      depth: 5,
      colors: process.stdout.isTTY,
      compact: false
    });
  }
  return String(value);
}

function line(label, color, args) {
  const prefix = [
    chalk.gray(stamp()),
    color(label.padEnd(5))
  ].join(' ');
  console.log(prefix, args.map(render).join(' '));
}

function pad(value, width) {
  const text = String(value);
  return `${text}${' '.repeat(Math.max(0, width - text.length))}`;
}

function box(title, rows = []) {
  const normalized = rows.map(([name, value]) => [String(name), String(value)]);
  const width = Math.max(
    42,
    title.length + 4,
    ...normalized.map(([name, value]) => name.length + value.length + 7)
  );
  const border = chalk.greenBright(`+${'-'.repeat(width)}+`);
  const titleLine = `${chalk.greenBright('|')} ${chalk.whiteBright.bold(pad(title, width - 2))} ${chalk.greenBright('|')}`;

  console.log(border);
  console.log(titleLine);
  console.log(border);
  for (const [name, value] of normalized) {
    const clean = `${name}: ${value}`;
    console.log(`${chalk.greenBright('|')} ${chalk.gray(pad(clean, width - 2))} ${chalk.greenBright('|')}`);
  }
  console.log(border);
}

module.exports = {
  info: (...args) => line('INFO', chalk.cyan, args),
  success: (...args) => line('OK', chalk.green, args),
  warn: (...args) => line('WARN', chalk.yellow, args),
  error: (...args) => line('ERROR', chalk.red, args),
  banner: box,
  startup: (client, preload, config) => box('Globy CV2 Online', [
    ['Bot', client.user.tag],
    ['Servers', client.guilds.cache.size],
    ['Slash Commands', preload.slashCommands],
    ['Prefix Commands', `${preload.prefixCommands} commands / ${preload.prefixAliases} aliases`],
    ['Cached Webhooks', preload.cachedWebhooks],
    ['Status', config.brand.status],
    ['Health', `http://localhost:${config.port}/health`]
  ]),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      line('DEBUG', chalk.gray, args);
    }
  }
};
