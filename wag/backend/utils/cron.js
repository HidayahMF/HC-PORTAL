const cron = require("node-cron");

function isValidCron(expression) {
  if (typeof expression !== "string" || !expression.trim()) return false;
  return cron.validate(expression.trim());
}

module.exports = { isValidCron };
