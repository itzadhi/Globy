const chalk = require('chalk');

function stamp() {
  return new Date().toISOString();
}

function line(label, color, args) {
  const prefix = color(`[${stamp()}] [${label}]`);
  console.log(prefix, ...args);
}

module.exports = {
  info: (...args) => line('INFO', chalk.cyan, args),
  success: (...args) => line('OK', chalk.green, args),
  warn: (...args) => line('WARN', chalk.yellow, args),
  error: (...args) => line('ERROR', chalk.red, args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      line('DEBUG', chalk.gray, args);
    }
  }
};
