import { startBirthdayScheduler, stopBirthdayScheduler, manualBirthdayCheck } from "../../lib/functions/birthdayScheduler.js";

const birthdaySchedulerCommand = {
  name: "birthdayscheduler",
  aliases: ["bdscheduler", "bds"],
  description: "Control birthday scheduler",
  usage: "!birthdayscheduler [start/stop/check/status]",
  cooldown: 3000,
  ownerOnly: true,

  run: async ({ Javix, jid, message, args, sender, reply, isGroup, utils }) => {
    try {
      const action = args[0]?.toLowerCase() || "status";

      switch (action) {
        case "start": {
          startBirthdayScheduler(Javix);
          await reply("*🎂 Birthday Scheduler Started*\n\nThe bot will now:\n• Check birthdays at 11:55 PM (prepare wishes)\n• Send birthday wishes at 12:00 AM (midnight)\n• Send reminders at 9:00 AM");
          break;
        }

        case "stop": {
          stopBirthdayScheduler();
          await reply("*🎂 Birthday Scheduler Stopped*\n\nThe bot will no longer automatically send birthday wishes.");
          break;
        }

        case "check": {
          await reply("*🎂 Checking birthdays manually...*");
          await manualBirthdayCheck(Javix);
          await reply("*✅ Manual birthday check completed*\n\nCheck the console for detailed logs.");
          break;
        }

        case "status": {
          const isRunning = global.birthdayScheduler !== null;
          const status = isRunning ? "🟢 Running" : "🔴 Stopped";

          const statusMessage =
            `*🎂 Birthday Scheduler Status*\n\n` +
            `*Status:* ${status}\n` +
            `*Schedule:*\n` +
            `• 11:55 PM - Check tomorrow's birthdays\n` +
            `• 12:00 AM - Send birthday wishes\n` +
            `• 9:00 AM - Send reminders\n\n` +
            `*Features:*\n` +
            `• Automatic birthday wishes at midnight\n` +
            `• Birthday reminders\n` +
            `• Custom messages and themes\n` +
            `• Group and direct messages\n\n` +
            `*Commands:*\n` +
            `• \`!birthdayscheduler start\` - Start scheduler\n` +
            `• \`!birthdayscheduler stop\` - Stop scheduler\n` +
            `• \`!birthdayscheduler check\` - Manual check\n` +
            `• \`!birthdayscheduler status\` - Show status`;

          await reply(statusMessage);
          break;
        }

        default:
          await reply("*Invalid action!*\nUse: start/stop/check/status");
      }
    } catch (error) {
      console.error("Birthday scheduler command error:", error);
      await reply("*Failed to process birthday scheduler command!*");
    }
  },
};

export default birthdaySchedulerCommand;
