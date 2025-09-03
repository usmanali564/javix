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

const afkBackCommand = {
  name: "afkback",
  aliases: ["back", "return"],
  description: "Return from AFK status (Owner Only)",
  usage: "!afkback",
  cooldown: 1000,
  ownerOnly: true,

  run: async (context) => {
    try {
      const { reply, sender, isOwner, senderName } = context;

      if (!isOwner) {
        return await reply("*Owner Only!* This command is restricted to the bot owner.");
      }

      if (!senderName) {
        return await reply("*Error:* Could not detect your name. Please try again.");
      }

      const currentAFK = await AFK.getAFKStatus(sender);

      if (!currentAFK) {
        return await reply("*You are not currently AFK* 🤔");
      }

      const timeAway = new Date() - currentAFK.timestamp;
      const timeString = formatTimeDuration(timeAway);

      const stats = currentAFK.stats;
      let mentionDetails = "";

      if (stats && stats.totalMentions > 0) {
        mentionDetails = "\n\n*Mention Statistics:*\n" + `👥 *Total Mentions:* ${stats.totalMentions}\n` + `👤 *Unique Mentioners:* ${stats.uniqueMentioners}\n` + `💬 *Chats Mentioned In:* ${stats.uniqueChats}\n\n` + "*Recent Mentions:*\n";

        const sortedMentions = [...currentAFK.mentionedBy].sort((a, b) => b.timestamp - a.timestamp);

        const recentMentions = sortedMentions.slice(0, 5);
        for (const mention of recentMentions) {
          const mentionTime = new Date(mention.timestamp).toLocaleString();
          mentionDetails += `• *${mention.userName}* (${mention.userNumber})\n` + `  📅 ${mentionTime}\n` + `  💬 ${mention.message || "No message"}\n` + `  📎 Type: ${mention.messageType}\n\n`;
        }

        if (sortedMentions.length > 5) {
          const olderMentions = sortedMentions.slice(5);
          const olderMentioners = new Set(olderMentions.map((m) => `${m.userName} (${m.userNumber})`));

          mentionDetails += `*And ${olderMentions.length} more mentions from:*\n` + Array.from(olderMentioners).slice(0, 5).join(", ") + (olderMentioners.size > 5 ? " and more..." : "");
        }
      }

      await AFK.removeAFKStatus(sender);

      const welcomeBack = `*Welcome back ${senderName}!* 👋\n\n` + `⏱️ *Time away:* ${timeString}\n` + `📝 *Status:* ${currentAFK.reason}` + mentionDetails;

      await reply(welcomeBack);
    } catch (error) {
      console.error("AFK back command error:", error);
      await context.reply("*An error occurred while returning from AFK!* Please try again later.");
    }
  },
};

export default afkBackCommand;
