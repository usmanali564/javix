import UserBan from "../../models/userBan.model.js";
import config from "#config";
import { extractTargetUserUniversal } from "../../utils/target.js";

export default {
  name: "ban",
  aliases: ["banuser", "addban", "banlist", "baninfo", "banstats"],
  description: "Manage user bans",
  usage: `${config.prefix}ban [add/list/info/stats] [args]`,
  category: "Owner",
  ownerOnly: true,
  cooldown: 5,

  run: async ({ Javix, message, args, reply, sender, isOwner, messages: m }) => {
    if (!isOwner) {
      return reply("*Owner Only!* This command is restricted to bot owners.");
    }

    const sessionId = Javix.user.id.split(":")[0];
    const [action, ...restArgs] = args;

    try {
      const isSubCommand = ["list", "info", "stats", "massunban", "clean"].includes(action?.toLowerCase());

      if (!action || !isSubCommand) {
        return await handleBanUser({ Javix, message, args, reply, sender, sessionId, m });
      }

      switch (action.toLowerCase()) {
        case "list":
          return await handleBanList({ reply, sessionId });

        case "info":
          return await handleBanInfo({ Javix, message, args: restArgs, reply, sender, sessionId, m });

        case "stats":
        case "statistics":
          return await handleBanStats({ reply, sessionId });

        case "massunban":
        case "mass-unban":
        case "unbanall":
          return await handleMassUnban({ reply, sessionId });

        case "clean":
        case "cleanup":
          return await handleCleanExpired({ reply, sessionId });

        default:
          const menu =
            `*🔨 Ban Management*\n\n` +
            `*Commands:*\n` +
            `• \`${config.prefix}ban <@user/reply> [duration] [reason]\` - Ban a user\n` +
            `• \`${config.prefix}unban <@user/reply>\` - Unban a user\n` +
            `• \`${config.prefix}ban list\` - List all banned users\n` +
            `• \`${config.prefix}ban info <@user/reply>\` - Show ban info\n` +
            `• \`${config.prefix}ban stats\` - Show ban statistics\n` +
            `• \`${config.prefix}ban massunban\` - Unban all users\n` +
            `• \`${config.prefix}ban clean\` - Clean expired bans\n\n`;
          return reply(menu);
      }
    } catch (error) {
      console.error("Ban command error:", error);
      return reply("*An error occurred while managing bans!*");
    }
  },
};

async function handleBanUser({ Javix, message, args, reply, sender, sessionId, m }) {
  const { targetNumber, targetJid } = extractTargetUserUniversal({ m, args, message });

  if (!targetJid) {
    const menu =
      `*🔨 Ban Management*\n\n` +
      `*Commands:*\n` +
      `• \`${config.prefix}ban <@user/reply> [duration] [reason]\` - Ban a user\n` +
      `• \`${config.prefix}unban <@user/reply>\` - Unban a user\n` +
      `• \`${config.prefix}ban list\` - List all banned users\n` +
      `• \`${config.prefix}ban info <@user/reply>\` - Show ban info\n` +
      `• \`${config.prefix}ban stats\` - Show ban statistics\n` +
      `• \`${config.prefix}ban massunban\` - Unban all users\n` +
      `• \`${config.prefix}ban clean\` - Clean expired bans\n\n`;
    return reply(menu);
  }

  const commandArgs = m.quoted?.sender ? args : args.slice(1);

  try {
    const duration = commandArgs[0] || "permanent";
    const reason = commandArgs.slice(1).join(" ") || "No reason provided";

    if (duration !== "permanent" && !/^\d+(m|h|d|w|y)$/.test(duration)) {
      return reply(`*Invalid duration format!*\n\n` + `*Valid formats:*\n` + `• \`1m\` - 1 minute\n` + `• \`1h\` - 1 hour\n` + `• \`1d\` - 1 day\n` + `• \`1w\` - 1 week\n` + `• \`1m\` - 1 month\n` + `• \`1y\` - 1 year\n` + `• \`permanent\` - Permanent ban\n\n` + `*Example:* \`${config.prefix}ban 919876543210 24h Spam\``);
    }

    let durationMinutes = null;
    let expiresAt = null;
    let banType = "permanent";

    if (duration !== "permanent") {
      const match = duration.match(/^(\d+)(h|d|w|m|y)$/);
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case "m":
          durationMinutes = value;
          break;
        case "h":
          durationMinutes = value * 60;
          break;
        case "d":
          durationMinutes = value * 1440;
          break;
        case "w":
          durationMinutes = value * 10080;
          break;
        case "y":
          durationMinutes = value * 525600;
          break;
      }
      banType = "temporary";
      expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    }

    const banData = {
      sessionId,
      userId: targetJid,
      userNumber: targetNumber,
      userName: targetNumber,
      bannedBy: sender,
      bannedByNumber: sender.split("@")[0],
      bannedByName: sender.split("@")[0],
      reason: reason,
      banType: banType,
      duration: durationMinutes,
      expiresAt: expiresAt,
      isActive: true,
      banLevel: "ban",
      chatId: m.key.remoteJid,
      chatName: "Group Chat",
      $inc: { __v: 1 }, // Increment version key
    };

    const updatedBan = await UserBan.findOneAndUpdate({ sessionId: sessionId, userId: targetJid }, { $set: banData }, { new: true, upsert: true, setDefaultsOnInsert: true });

    const expiryText = updatedBan.expiresAt ? `*Expires:* ${new Date(updatedBan.expiresAt).toLocaleString()}` : "*Expires:* Never (Permanent)";

    return reply(`*User Banned Successfully!* 🔨\n\n` + `👤 *User:* ${updatedBan.userNumber}\n` + `⏰ *Banned At:* ${new Date(updatedBan.createdAt).toLocaleString()}\n` + `⏳ *Duration:* ${duration}\n` + `${expiryText}\n` + `📝 *Reason:* ${updatedBan.reason}\n` + `👮 *Banned By:* ${updatedBan.bannedByName}`);
  } catch (error) {
    console.error("Error in handleBanUser:", error);
    return reply("*An error occurred while banning the user.* Please check the logs.");
  }
}

async function handleBanList({ reply, sessionId }) {
  const { bans } = await UserBan.getActiveBans(sessionId, 1, 50);
  if (!bans.length) {
    return reply("*No banned users found!*");
  }

  let list = `*🔨 Ban List*\n\n`;

  bans.forEach((ban, i) => {
    const expiryText = ban.expiresAt ? `Expires: ${new Date(ban.expiresAt).toLocaleString()}` : "Permanent";
    list += `${i + 1}. *${ban.userNumber}*\n` + `   Reason: ${ban.reason}\n` + `   ${expiryText}\n\n`;
  });

  return reply(list);
}

async function handleBanInfo({ Javix, message, args, reply, sender, sessionId, m }) {
  const { targetNumber, targetJid } = extractTargetUserUniversal({ m, args, message });

  if (!targetJid) {
    return reply(`*Invalid Usage*\nUse: \`${config.prefix}ban info <number/@user/reply>\``);
  }

  const banInfo = await UserBan.isUserBanned(sessionId, targetJid);
  if (!banInfo) {
    return reply("*User not found or not banned!*");
  }

  const status = banInfo.isActive ? "🔨 Active" : "✅ Expired";
  const expiryText = banInfo.expiresAt ? `*Expires:* ${new Date(banInfo.expiresAt).toLocaleString()}` : "*Expires:* Never (Permanent)";

  let info = `*🔨 Ban Information*\n\n` + `👤 *User:* ${banInfo.userNumber}\n` + `📊 *Status:* ${status}\n` + `⏰ *Banned At:* ${new Date(banInfo.createdAt).toLocaleString()}\n` + `⏳ *Type:* ${banInfo.banType}\n` + `${expiryText}\n` + `📝 *Reason:* ${banInfo.reason}\n` + `👮 *Banned By:* ${banInfo.bannedByName}`;

  if (banInfo.unbannedAt) {
    info += `\n🔄 *Unbanned At:* ${new Date(banInfo.unbannedAt).toLocaleString()}`;
    if (banInfo.unbannedByName) {
      info += `\n👮 *Unbanned By:* ${banInfo.unbannedByName}`;
    }
  }

  return reply(info);
}

async function handleBanStats({ reply, sessionId }) {
  const stats = await UserBan.getBanStats(sessionId);

  const statsText =
    `*📊 Ban Statistics*\n\n` +
    `🔨 *Total Bans:* ${stats.totalBans}\n` +
    `✅ *Active Bans:* ${stats.activeBans}\n` +
    `⏰ *Permanent Bans:* ${stats.permanentBans}\n` +
    `⏳ *Temporary Bans:* ${stats.temporaryBans}\n` +
    `📊 *Ban Levels:*\n` +
    Object.entries(stats.bansByLevel)
      .map(([level, data]) => `   • ${level}: ${data.active}/${data.total}`)
      .join("\n");

  return reply(statsText);
}

async function handleMassUnban({ reply, sessionId }) {
  const { bans } = await UserBan.getActiveBans(sessionId, 1, 1000);

  if (!bans.length) {
    return reply("*No active bans to remove!*");
  }

  let unbannedCount = 0;
  for (const ban of bans) {
    try {
      await UserBan.unbanUser(sessionId, ban.userId, "System (Mass Unban)", "System");
      unbannedCount++;
    } catch (error) {
      console.error(`Failed to unban ${ban.userNumber}:`, error);
    }
  }

  return reply(`✅ *Mass Unban Complete!*\n\n` + `🔄 *Unbanned Users:* ${unbannedCount}\n` + `📊 *Total Processed:* ${bans.length}`);
}

async function handleCleanExpired({ reply, sessionId }) {
  const cleanedCount = await UserBan.cleanupExpiredBans(sessionId);

  if (cleanedCount === 0) {
    return reply("*No expired bans to clean!*");
  }

  return reply(`🧹 *Cleanup Complete!*\n\n` + `🗑️ *Cleaned Bans:* ${cleanedCount}`);
}
