import BotMode from "../../models/botmode.model.js";
import config from "#config";

export default {
  name: "botmode",
  aliases: ["mode"],
  description: "Manage bot access modes",
  usage: `${config.prefix}botmode [public/private/restricted/grouponly/info]`,
  ownerOnly: true,
  cooldown: 5,
  run: async ({ Javix, reply, args, isOwner, isSelf }) => {
    try {
      if (!isOwner && !isSelf) {
        return reply("*Access Denied*\nThis command is restricted to bot owners only.");
      }

      const [action, ...rest] = args;
      const sessionId = Javix.user.id.split(":")[0];
      const { mode, groupOnly, sessionInfo } = await BotMode.getCurrentMode(sessionId);

      if (!action) {
        const menu =
          `*🤖 Bot Mode Menu*\n\n` +
          `*Current Mode:* ${mode.toUpperCase()}\n` +
          `*Group Only:* ${groupOnly ? "✅" : "❌"}\n\n` +
          `*Available Modes:*\n` +
          `1. \`${config.prefix}botmode public\` - Everyone can use\n` +
          `2. \`${config.prefix}botmode private\` - Only owners\n` +
          `3. \`${config.prefix}botmode restricted\` - Owners & mods\n` +
          `4. \`${config.prefix}botmode grouponly\` - Toggle group only\n` +
          `5. \`${config.prefix}botmode info\` - Show detailed info`;

        return reply(menu);
      }

      switch (action.toLowerCase()) {
        case "public":
        case "private":
        case "restricted":
          try {
            await BotMode.updateMode(sessionId, action.toLowerCase());
            return reply(`✅ *Mode Updated*\n` + `Bot is now in ${action.toUpperCase()} mode.\n\n` + `*Access:* ${getModeDescription(action.toLowerCase())}`);
          } catch (error) {
            if (error.name === "ValidationError") {
              return reply(`*Invalid Mode*\n` + `The mode "${action}" is not valid.\n` + `Use \`${config.prefix}botmode\` to see available modes.`);
            }
            throw error;
          }

        case "grouponly":
          const newMode = await BotMode.toggleGroupOnly(sessionId);
          return reply(`✅ *Group Only Mode ${newMode.groupOnly ? "Enabled" : "Disabled"}*\n` + `Bot will ${newMode.groupOnly ? "only" : "now"} work in groups.\n\n` + `*Note:* ${newMode.groupOnly ? "The bot will ignore all private messages." : "The bot will work in both groups and private chats."}`);

        case "info":
          const info =
            `*🤖 Bot Mode Info*\n\n` +
            `*Current Mode:* ${mode.toUpperCase()}\n` +
            `*Group Only:* ${groupOnly ? "✅" : "❌"}\n` +
            `*Group Only Status:* ${groupOnly ? "Bot only works in groups" : "Bot works everywhere"}\n\n` +
            `*Access Hierarchy:*\n` +
            `1. 👑 Owner - Full access in all modes\n` +
            `2. 🛡️ Moderator - Access based on mode\n` +
            `3. 👤 User - Access based on mode\n\n` +
            `*Mode Description:*\n${getModeDescription(mode)}\n\n` +
            `*Last Updated:* ${sessionInfo?.updatedAt ? new Date(sessionInfo.updatedAt).toLocaleString() : "Never"}\n` +
            `*Last Mode Change:* ${sessionInfo?.lastModeChange ? new Date(sessionInfo.lastModeChange).toLocaleString() : "Never"}\n` +
            `*Last Group Only Change:* ${sessionInfo?.lastGroupOnlyChange ? new Date(sessionInfo.lastGroupOnlyChange).toLocaleString() : "Never"}`;

          return reply(info);

        default:
          return reply(`*Invalid Mode*\nUse \`${config.prefix}botmode\` to see available modes.`);
      }
    } catch (error) {
      console.error("BotMode command error:", error);
      return reply("*An error occurred while updating the bot mode!*");
    }
  },
};

function getModeDescription(mode) {
  switch (mode) {
    case "public":
      return "• Everyone can use the bot\n" + "• All commands are available\n" + "• No restrictions on usage";
    case "private":
      return "• ONLY owners can use the bot\n" + "• No response to anyone else\n" + "• Complete silence for non-owners";
    case "restricted":
      return "• ONLY owners and moderators can use\n" + "• No response to admins or users\n" + "• Complete silence for unauthorized users";
    default:
      return "• Unknown mode";
  }
}
