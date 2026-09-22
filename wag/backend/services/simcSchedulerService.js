const cron = require("node-cron");
const { isWorkingDay } = require("../utils/workingDay");
const { APP_TZ } = require("../utils/schedule");
const logger = require("../utils/logger");

const jobs = {};
const running = new Set();

function buildCronExpression(hour, minute, onlyWorkingDays) {
  if (onlyWorkingDays) {
    return `${minute} ${hour} * * 1-5`;
  }
  return `${minute} ${hour} * * *`;
}

async function registerSchedule(type, controller) {
  const LOG = type.toUpperCase();

  try {
    const config = await controller.getConfig();
    if (!config) {
      logger.info(`No config found, skipping`, { type: LOG });
      return;
    }

    if (jobs[type]) {
      jobs[type].stop();
      jobs[type] = null;
    }

    if (!config.is_active) {
      logger.info(`Auto-send is inactive, skipping`, { type: LOG });
      return;
    }

    const onlyWorkingDays = !!config.only_working_days;
    const cronExpr = buildCronExpression(config.send_hour, config.send_minute, onlyWorkingDays);

    if (!cron.validate(cronExpr)) {
      logger.error(`Invalid cron expression: "${cronExpr}"`, { type: LOG });
      return;
    }

    jobs[type] = cron.schedule(
      cronExpr,
      async () => {
        if (running.has(type)) {
          logger.warn("auto-send still running, skipped tick", { type: LOG });
          return;
        }
        running.add(type);
        try {
          if (onlyWorkingDays) {
            const working = await isWorkingDay();
            if (!working) {
              logger.info("Skipped: today is not a working day", { type: LOG });
              return;
            }
          }
          await controller.executeAutoSend();
        } catch (err) {
          logger.error("Auto-send error", { type: LOG, err: err?.message });
        } finally {
          running.delete(type);
        }
      },
      { timezone: APP_TZ }
    );

    const modeLabel = onlyWorkingDays ? " [working days only]" : "";
    logger.info("SIM scheduler registered", {
      type: LOG,
      cron: cronExpr,
      time: `${config.send_hour}:${String(config.send_minute).padStart(2, "0")}`,
      mode: modeLabel,
    });
  } catch (err) {
    logger.error("Failed to register SIM scheduler", { type: LOG, err: err?.message });
  }
}

function unregisterSchedule(type) {
  if (jobs[type]) {
    jobs[type].stop();
    jobs[type] = null;
    logger.info("SIM scheduler unregistered", { type: type.toUpperCase() });
  }
}

function unregisterAll() {
  Object.keys(jobs).forEach((type) => unregisterSchedule(type));
}

function createSimcScheduler(simcController, simaController) {
  return {
    registerSimcSchedule: () => registerSchedule("simc", simcController),
    registerSimaSchedule: () => registerSchedule("sima", simaController),
    unregisterSimcSchedule: () => unregisterSchedule("simc"),
    unregisterSimaSchedule: () => unregisterSchedule("sima"),
    unregisterAllSchedules: unregisterAll,
  };
}

module.exports = { createSimcScheduler };
