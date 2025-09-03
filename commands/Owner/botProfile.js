import { requireGroupPermissions } from "../../utils/groupChecks.js";
import BotMode from "../../models/botmode.model.js";
import config from "#config";
import { getActiveSessionId } from "../../utils/getSessionId.js";
import { getStatusMessages, addStatusMessage, removeStatusMessage, resetStatusMessages } from "../../lib/functions/status.js";

const STATUS_MODES = {
  OFF: "off",
  UPTIME_ONLY: "uptime",
  CUSTOM_ONLY: "custom",
  MIXED: "mixed",
};

async function initializeStatusMode() {
  // Use config.sessionId directly to avoid requiring a session before authentication
  const sessionId = config.sessionId;
  let botMode = await BotMode.findOne({ sessionId });
  let mode = botMode?.statusMode || STATUS_MODES.UPTIME_ONLY;
  global.statusMode = mode;
  global.botMode = botMode?.mode || "public";
  global.groupOnly = botMode?.groupOnly || false;
}

const botProfileCommand = {
  name: "setbot",
  aliases: ["botset"],
  description: "Manage bot profile status and messages",
  usage: `!setbot about [off/uptime/custom/mixed] [on/off]\n!setbot add [message]\n!setbot remove [message]\n!setbot list\n!setbot reset`,
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, jid, args, isOwner, isGroup } = ctx;
    try {
      if (isGroup) {
        if (!(await requireGroupPermissions(ctx, { admin: true, botAdmin: true }))) return;
      }
      if (!isOwner) {
        return await Javix.sendMessage(jid, { text: "*This command can only be used by the bot owner!*" });
      }

      const sessionId = await getActiveSessionId();
      let botMode = await BotMode.findOne({ sessionId });
      if (!botMode) {
        botMode = await BotMode.create({ sessionId });
      }

      // 'about' subcommand: show or set status mode and aboutmsg
      if (args[0]?.toLowerCase() === "about") {
        const mode = args[1]?.toLowerCase();
        const aboutmsgArg = args[2]?.toLowerCase();
        const validModes = Object.values(STATUS_MODES);
        let changed = false;
        let msg = "";

        // If no mode and no on/off, show current
        if (!mode) {
          const statusMode = botMode.statusMode || STATUS_MODES.UPTIME_ONLY;
          const aboutmsg = botMode.showAboutOnStartup === false ? "OFF" : "ON";
          const botAccessMode = botMode.mode || "public";
          const groupOnly = botMode.groupOnly ? "ON" : "OFF";
          return await Javix.sendMessage(jid, {
            text: `*Current Status Mode:* ${statusMode}\n*About message on startup:* ${aboutmsg}\n*Bot Access Mode:* ${botAccessMode}\n*Group Only:* ${groupOnly}`,
          });
        }

        // Set status mode if valid
        if (mode && validModes.includes(mode)) {
          botMode.statusMode = mode;
          global.statusMode = mode;
          changed = true;
          msg += `✅ *Status mode set to:* ${mode}\n`;
        } else if (mode) {
          return await Javix.sendMessage(jid, {
            text: `*Invalid mode!* Use one of: off, uptime, custom, mixed.`,
          });
        }

        // Set aboutmsg if present
        if (aboutmsgArg && (aboutmsgArg === "on" || aboutmsgArg === "off")) {
          botMode.showAboutOnStartup = aboutmsgArg === "on";
          changed = true;
          msg += `✅ *About message on startup is now:* ${aboutmsgArg === "on" ? "ON" : "OFF"}\n`;
        } else if (aboutmsgArg) {
          return await Javix.sendMessage(jid, {
            text: `*Invalid about message setting!* Use 'on' or 'off'.`,
          });
        }

        if (changed) {
          await botMode.save();
          return await Javix.sendMessage(jid, { text: msg.trim() });
        }

        // If invalid usage
        return await Javix.sendMessage(jid, {
          text: `*Usage:* !setbot about [off/uptime/custom/mixed] [on/off] - Set status mode and about message on startup\n!setbot about - Show current status mode and about message on startup`,
        });
      }

      // Add a custom status message (in-memory)
      if (args[0]?.toLowerCase() === "add") {
        const argStr = args.slice(1).join(" ").trim();
        if (!argStr) {
          return await Javix.sendMessage(jid, { text: `*Usage:*\n!setbot add [your status message]` });
        }
        const { addStatusMessage } = await import("../../functions/status.js");
        const added = addStatusMessage(argStr);
        if (added) {
          return await Javix.sendMessage(jid, { text: `✅ *Status message added:* ${argStr}` });
        } else {
          return await Javix.sendMessage(jid, { text: `*That status message already exists or is invalid.*` });
        }
      }

      // Remove a custom status message (in-memory)
      if (args[0]?.toLowerCase() === "remove") {
        const argStr = args.slice(1).join(" ").trim();
        if (!argStr) {
          return await Javix.sendMessage(jid, { text: `*Usage:*\n!setbot remove [your status message]` });
        }
        const { removeStatusMessage } = await import("../../functions/status.js");
        const removed = removeStatusMessage(argStr);
        if (removed) {
          return await Javix.sendMessage(jid, { text: `✅ *Status message removed:* ${argStr}` });
        } else {
          return await Javix.sendMessage(jid, { text: `*Could not remove. Either it doesn't exist or it's a default message.*` });
        }
      }

      // List all status messages (in-memory)
      if (args[0]?.toLowerCase() === "list") {
        const { getStatusMessages } = await import("../../functions/status.js");
        const messages = getStatusMessages();
        return await Javix.sendMessage(jid, {
          text: `*Status Messages:*
${messages.map((msg, i) => `${i + 1}. ${msg}`).join("\n")}`,
        });
      }

      // Reset status messages to default (in-memory)
      if (args[0]?.toLowerCase() === "reset") {
        const { resetStatusMessages } = await import("../../functions/status.js");
        resetStatusMessages();
        return await Javix.sendMessage(jid, { text: `✅ *Status messages reset to default!*` });
      }

      // Unknown subcommand
      return await Javix.sendMessage(jid, {
        text: `*Unknown subcommand.*\n\n*Usage:*
!setbot about [off/uptime/custom/mixed] [on/off] - Set status mode and about message on startup\n!setbot about - Show current status mode and about message on startup\n!setbot add [message] - Add a custom status message\n!setbot remove [message] - Remove a custom status message\n!setbot list - List all status messages\n!setbot reset - Reset status messages to default`,
      });
    } catch (error) {
      console.error("Bot profile update error:", error);
      await Javix.sendMessage(jid, {
        text: "*An error occurred while updating bot profile!*",
      });
    }
  },
};

export default botProfileCommand;
export { initializeStatusMode };
