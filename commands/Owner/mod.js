import Role from "../../models/role.model.js";
import config from "#config";

export default {
  name: "mod",
  aliases: ["moderator"],
  description: "Manage moderators (Owner only)",
  usage: `${config.prefix}mod [add/remove/list/info] [number] [name]`,
  category: "Owner",
  ownerOnly: true,
  cooldown: 5,

  run: async ({ Javix, message, args, reply, sender, isOwner }) => {
    if (!isOwner) {
      return reply("*Owner Only!* This command is restricted to bot owners.");
    }

    const [action, number, ...nameParts] = args;
    const name = nameParts.join(" ");

    // Show menu if no action provided
    if (!action) {
      const menu =
        `*🛡️ Moderator Management*\n\n` +
        `*Commands:*\n` +
        `• \`${config.prefix}mod add <number> [name]\` - Add a moderator\n` +
        `• \`${config.prefix}mod remove <number>\` - Remove a moderator\n` +
        `• \`${config.prefix}mod list\` - List all moderators\n` +
        `• \`${config.prefix}mod info <number>\` - Show moderator info\n` +
        `• \`${config.prefix}mod update <number> [name]\` - Update moderator info\n\n` +
        `*Note:* Only bot owners can manage moderators.`;

      return reply(menu);
    }

    try {
      switch (action.toLowerCase()) {
        case "add":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod add <number> [name]\``);
          }

          // Check if number is already a moderator
          const existingMod = await role.findOne({ number, role: "moderator" });
          if (existingMod) {
            return reply("*User is already a moderator!*");
          }

          // Check if number is an owner
          const isOwner = await role.isOwner(number);
          if (isOwner) {
            return reply("*Cannot add an owner as a moderator!*");
          }

          try {
            const mod = await role.addRole(number, "moderator", sender, name);
            return reply(`✅ *Moderator Added*\n\n` + `*Number:* ${mod.number}\n` + `*Name:* ${mod.name}\n` + `*Added By:* ${mod.addedBy}\n` + `*Added At:* ${new Date(mod.addedAt).toLocaleString()}`);
          } catch (error) {
            if (error.message === "User already has a role") {
              return reply("*User already has a role!*");
            }
            throw error;
          }

        case "remove":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod remove <number>\``);
          }

          // Check if number is a moderator
          const modToRemove = await role.findOne({ number, role: "moderator" });
          if (!modToRemove) {
            return reply("*User is not a moderator!*");
          }

          const removed = await role.removeRole(number);
          if (removed) {
            return reply(`✅ *Moderator Removed*\nNumber: ${number}`);
          } else {
            return reply("*Failed to remove moderator!*");
          }

        case "list":
          const mods = await role.getUsersByRole("moderator");
          if (!mods.length) {
            return reply("*No moderators found!*");
          }

          const list = `*🛡️ Moderator List*\n\n` + mods.map((m, i) => `${i + 1}. *${m.name}*\n` + `   Number: ${m.number}\n` + `   Added: ${new Date(m.addedAt).toLocaleString()}`).join("\n\n");

          return reply(list);

        case "info":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod info <number>\``);
          }

          const modInfo = await role.findOne({ number, role: "moderator" });
          if (!modInfo) {
            return reply("*User is not a moderator!*");
          }

          const info = `*🛡️ Moderator Info*\n\n` + `*Name:* ${modInfo.name}\n` + `*Number:* ${modInfo.number}\n` + `*Added By:* ${modInfo.addedBy}\n` + `*Added At:* ${new Date(modInfo.addedAt).toLocaleString()}\n` + `*Status:* ${modInfo.isActive ? "✅ Active" : "❌ Inactive"}`;

          return reply(info);

        case "update":
          if (!number) {
            return reply(`*Invalid Usage*\nUse: \`${config.prefix}mod update <number> [name]\``);
          }

          const modToUpdate = await role.findOne({ number, role: "moderator" });
          if (!modToUpdate) {
            return reply("*User is not a moderator!*");
          }

          if (name) {
            modToUpdate.name = name;
            await modToUpdate.save();
            return reply(`✅ *Moderator Updated*\n\n` + `*Number:* ${modToUpdate.number}\n` + `*New Name:* ${modToUpdate.name}\n` + `*Updated At:* ${new Date().toLocaleString()}`);
          } else {
            return reply("*Please provide a new name!*");
          }

        default:
          return reply(`*Invalid Action*\nUse \`${config.prefix}mod\` to see available commands.`);
      }
    } catch (error) {
      console.error("Mod command error:", error);
      return reply("*An error occurred while managing moderators!*");
    }
  },
};
