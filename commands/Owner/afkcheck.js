import AFK from "../../models/afk.model.js";
import config from "#config";

const formatTimeDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  let timeString = "";
  if (days > 0) {
    timeString += `${days} day${days > 1 ? "s" : ""} `;
  }
  if (remainingHours > 0) {
    timeString += `${remainingHours} hour${remainingHours > 1 ? "s" : ""} `;
  }
  if (remainingMinutes > 0) {
    timeString += `${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
  }

  return timeString.trim() || "less than a minute";
};

const afkCheckCommand = {
  name: "afkcheck",
  aliases: ["checkafk", "whosafk"],
  description: "Check who is currently AFK (Owner Only)",
  usage: "!afkcheck",
  cooldown: 1000,
  ownerOnly: true,

  run: async (context) => {
    try {
      const { reply, isOwner } = context;

      if (!isOwner) {
        return await reply("*Owner Only!* This command is restricted to the bot owner.");
      }

      const afkUsers = await AFK.getAllAFKUsers();

      if (!afkUsers.length) {
        return await reply("*No one is currently AFK* 🎉");
      }

      afkUsers.sort((a, b) => b.timestamp - a.timestamp);

      let response = `*Current AFK Users* 🚶\n\n`;

      for (const user of afkUsers) {
        const timeAway = new Date() - user.timestamp;
        const timeString = formatTimeDuration(timeAway);

        response += `👤 *${user.userName}* (${user.userNumber})\n` + `📝 *Reason:* ${user.reason}\n` + `⏱️ *Time away:* ${timeString}\n` + `📅 *Since:* ${new Date(user.timestamp).toLocaleString()}\n`;

        if (user.stats) {
          response += `\n📊 *Mention Statistics:*\n` + `• Total Mentions: ${user.stats.totalMentions}\n` + `• Unique Mentioners: ${user.stats.uniqueMentioners}\n` + `• Chats Mentioned In: ${user.stats.uniqueChats}\n`;

          if (user.mentionedBy?.length > 0) {
            const recentMentions = user.mentionedBy.slice(-3).reverse();
            response += `\n🔄 *Recent Mentions:*\n`;

            for (const mention of recentMentions) {
              const mentionTime = new Date(mention.timestamp).toLocaleString();
              response += `• *${mention.userName}* (${mention.userNumber})\n` + `  📅 ${mentionTime}\n` + `  💬 ${mention.message || "No message"}\n` + `  📎 Type: ${mention.messageType}\n`;
            }
          }
        }

        response += `\n⚙️ *Settings:*\n` + `• Notifications: ${user.settings.notifyOnMention ? "✅" : "❌"}\n` + `• Auto Reply: ${user.settings.autoReply ? "✅" : "❌"}\n`;

        response += "\n" + "─".repeat(30) + "\n\n";
      }

      await reply(response);
    } catch (error) {
      console.error("AFK check command error:", error);
      await context.reply("*An error occurred while checking AFK status!* Please try again later.");
    }
  },
};

export default afkCheckCommand;
