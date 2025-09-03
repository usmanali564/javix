import Role from "../../models/role.model.js";
import config from "#config";

export default {
  name: "moderator",
  aliases: ["mod"],
  description: "Manage bot moderators",
  usage: `${config.prefix}moderator [add/remove/list] [number] [name]`,
  category: "Owner",
  ownerOnly: true,
  cooldown: 5,

  run: async ({ client, message, args, reply, sender, isOwner, sessionId }) => {
    if (!isOwner) {
      return reply("*Owner Only!* This command is restricted to bot owners.");
    }

    const [action, number, ...nameParts] = args;
    const name = nameParts.join(" ");

    if (!action) {
      const menu =
        `*🤖 Moderator Management*\n\n` +
        `*Commands:*\n` +
        `• \`${config.prefix}mod add <number> [name]\` - Add a moderator\n` +
        `• \`${config.prefix}mod remove <number>\` - Remove a moderator\n` +
        `• \`${config.prefix}mod list\` - List all moderators\n` +
        `• \`${config.prefix}mod info <number>\` - Show moderator info\n\n` +
        `*Note:* Moderators can use the bot in restricted mode\n` +
        `Only owners can manage moderators`;

      return reply(menu);
    }

    try {
      switch (action.toLowerCase()) {
        case "add":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod add <number> [name]\``);
          }

          try {
            const moderator = await Role.addModerator(sessionId, number, number, sender);
            return reply(`✅ *Moderator Added*\n\n` + `*Number:* ${moderator.number}\n` + `*Added By:* ${moderator.addedBy}\n` + `*Added At:* ${new Date(moderator.addedAt).toLocaleString()}`);
          } catch (error) {
            if (error.message === "User already has a role in this session") {
              return reply("*Moderator already exists!*");
            }
            throw error;
          }

        case "remove":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod remove <number>\``);
          }

          const removed = await Role.removeRole(sessionId, number);
          if (removed) {
            return reply(`✅ *Moderator Removed*\nNumber: ${number}`);
          } else {
            return reply("*Moderator not found!*");
          }

        case "list":
          const moderators = await Role.getAllModerators(sessionId);
          if (!moderators.length) {
            return reply("*No moderators found!*");
          }

          const list = `*📋 Moderator List*\n\n` + moderators.map((mod, i) => `${i + 1}. *${mod.number}*\n` + `   Added: ${new Date(mod.addedAt).toLocaleString()}`).join("\n\n");

          return reply(list);

        case "info":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod info <number>\``);
          }

          const mod = await Role.getRoleInfo(sessionId, number);
          if (!mod) {
            return reply("*Moderator not found!*");
          }

          const info =
            `*👤 Moderator Info*\n\n` +
            `*Number:* ${mod.number}\n` +
            `*Added By:* ${mod.addedBy}\n` +
            `*Added At:* ${new Date(mod.addedAt).toLocaleString()}\n` +
            `*Status:* ${mod.isActive ? "✅ Active" : "Inactive"}\n` +
            `*Permissions:*\n` +
            Object.entries(mod.permissions)
              .map(([perm, value]) => `• ${perm}: ${value ? "✅" : "❌"}`)
              .join("\n");

          return reply(info);

        default:
          return reply(`*Invalid Action*\nUse \`${config.prefix}mod\` to see available commands.`);
      }
    } catch (error) {
      console.error("Moderator command error:", error);
      return reply("*An error occurred while managing moderators!*");
    }
  },
};
