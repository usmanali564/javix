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

const afkCommand = {
  name: "afk",
  aliases: ["away"],
  description: "Set your AFK status with an optional reason (Owner Only)",
  usage: "!afk [reason] | !afk settings [option] [value]",
  cooldown: 1000,
  ownerOnly: true,

  run: async (context) => {
    try {
      const { Javix, jid, messages, args, reply, sender, isOwner, senderName } = context;

      const senderNumber = sender.split("@")[0];

      const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);

      if (!isOwner) {
        return await reply("*Owner Only!* This command is restricted to bot owners.");
      }

      if (!senderName) {
        return await reply("*Error:* Could not detect your name. Please try again.");
      }

      if (args[0]?.toLowerCase() === "settings") {
        return await handleSettings(context, args.slice(1));
      }

      const currentAFK = await AFK.getAFKStatus(sender);

      if (currentAFK) {
        // If user is already AFK, remove AFK status
        await AFK.removeAFKStatus(sender);

        const timeAway = new Date() - currentAFK.timestamp;
        const timeString = formatTimeDuration(timeAway);

        const stats = await AFK.getMentionStats(sender);
        let mentionDetails = "";

        if (stats && stats.totalMentions > 0) {
          mentionDetails = "\n\n*Mention Statistics:*\n" + `👥 *Total Mentions:* ${stats.totalMentions}\n` + `👤 *Unique Mentioners:* ${stats.uniqueMentioners}\n` + `💬 *Chats Mentioned In:* ${stats.uniqueChats}\n\n` + "*Recent Mentions:*\n";

          const recentMentions = currentAFK.mentionedBy.slice(-5).reverse();
          for (const mention of recentMentions) {
            const mentionTime = new Date(mention.timestamp).toLocaleString();
            mentionDetails += `• *${mention.userName}* (${mention.userNumber})\n` + `  📅 ${mentionTime}\n` + `  💬 ${mention.message || "No message"}\n\n`;
          }
        }

        const welcomeBack = `*Welcome back ${senderName}!* 👋\n\n` + `⏱️ *Time away:* ${timeString}\n` + `📝 *Status:* ${currentAFK.reason}` + mentionDetails;

        await reply(welcomeBack);
        return;
      }

      const reason = args.length ? args.join(" ").trim() : "AFK";
      if (reason.length > 500) {
        return await reply("*Error:* Reason is too long. Maximum 500 characters allowed.");
      }

      await AFK.setAFKStatus(sender, { userName: senderName }, reason);

      const afkMessage = `*${senderName} is now AFK* 🚶\n\n` + `📝 *Reason:* ${reason}\n` + `⏰ *Time:* ${new Date().toLocaleString()}\n\n` + `_You will be notified when you return._\n\n` + `_Use !afk settings to configure notifications_`;

      await reply(afkMessage);
    } catch (error) {
      console.error("AFK command error:", error);
      await context.reply("*An error occurred while setting AFK status!* Please try again later.");
    }
  },
};

async function handleSettings(context, args) {
  const { reply, sender } = context;

  if (!args.length) {
    const afkStatus = await AFK.getAFKStatus(sender);
    if (!afkStatus) {
      return await reply("*You are not currently AFK* 🤔");
    }

    const settings = afkStatus.settings;
    const settingsList =
      `*AFK Settings* ⚙️\n\n` +
      `🔔 *Notifications:*\n` +
      `• Mentions: ${settings.notifyOnMention ? "✅" : "❌"}\n` +
      `• Direct Messages: ${settings.notifyOnDM ? "✅" : "❌"}\n` +
      `• Group Messages: ${settings.notifyOnGroup ? "✅" : "❌"}\n\n` +
      `💬 *Auto Reply:* ${settings.autoReply ? "✅" : "❌"}\n` +
      (settings.customReply ? `📝 *Custom Reply:* ${settings.customReply}\n` : "") +
      `\n⏰ *Auto Return:* ${settings.autoReturn.enabled ? "✅" : "❌"}\n` +
      (settings.autoReturn.enabled ? `• Duration: ${settings.autoReturn.duration} minutes\n` : "") +
      `\n🔢 *Mention Limit:* ${settings.mentionLimit.enabled ? "✅" : "❌"}\n` +
      (settings.mentionLimit.enabled ? `• Max Mentions: ${settings.mentionLimit.maxMentions}\n` : "") +
      `\n_Use !afk settings [option] [value] to change settings_\n` +
      `_Options: notify, dm, group, reply, custom, autoreturn, limit_`;

    return await reply(settingsList);
  }

  const option = args[0].toLowerCase();
  const value = args[1]?.toLowerCase();

  if (!value) {
    return await reply("*Error:* Please provide a value for the setting.");
  }

  const validOptions = {
    notify: "notifyOnMention",
    dm: "notifyOnDM",
    group: "notifyOnGroup",
    reply: "autoReply",
    autoreturn: "autoReturn",
    limit: "mentionLimit",
  };

  if (option === "custom") {
    const customReply = args.slice(1).join(" ");
    if (customReply.length > 500) {
      return await reply("*Error:* Custom reply is too long. Maximum 500 characters allowed.");
    }

    await AFK.findOneAndUpdate({ userId: sender, isAFK: true }, { "settings.customReply": customReply });

    return await reply(`*Custom reply updated:*\n${customReply}`);
  }

  if (option === "autoreturn") {
    const duration = parseInt(value);
    if (isNaN(duration) || duration < 1) {
      return await reply("*Error:* Please provide a valid duration in minutes (minimum 1).");
    }

    await AFK.findOneAndUpdate(
      { userId: sender, isAFK: true },
      {
        "settings.autoReturn.enabled": true,
        "settings.autoReturn.duration": duration,
      }
    );

    return await reply(`*Auto return enabled:* Will return after ${duration} minutes ✅`);
  }

  if (option === "limit") {
    const limit = parseInt(value);
    if (isNaN(limit) || limit < 1) {
      return await reply("*Error:* Please provide a valid mention limit (minimum 1).");
    }

    await AFK.findOneAndUpdate(
      { userId: sender, isAFK: true },
      {
        "settings.mentionLimit.enabled": true,
        "settings.mentionLimit.maxMentions": limit,
      }
    );

    return await reply(`*Mention limit enabled:* Maximum ${limit} mentions ✅`);
  }

  if (!validOptions[option]) {
    return await reply("*Error:* Invalid setting. Use: notify, dm, group, reply, custom, autoreturn, or limit");
  }

  const settingValue = value === "on";
  const settingName = validOptions[option];

  await AFK.findOneAndUpdate({ userId: sender, isAFK: true }, { [`settings.${settingName}`]: settingValue });

  return await reply(`*${option} setting ${settingValue ? "enabled" : "disabled"}* ✅`);
}

export const handleAFKMentions = async (context) => {
  try {
    const { Javix, jid, messages, sender, isOwner, senderName, isGroup, groupName } = context;

    if (isOwner || !messages?.message) return;

    // Check if mentioned user is AFK
    const mentionedUsers = messages.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentionedUsers.length) return;

    // Get message text and type
    let messageText = "";
    let messageType = "text";

    if (messages.message?.conversation) {
      messageText = messages.message.conversation;
    } else if (messages.message?.extendedTextMessage?.text) {
      messageText = messages.message.extendedTextMessage.text;
    } else if (messages.message?.imageMessage?.caption) {
      messageText = messages.message.imageMessage.caption;
      messageType = "image";
    } else if (messages.message?.videoMessage?.caption) {
      messageText = messages.message.videoMessage.caption;
      messageType = "video";
    } else if (messages.message?.stickerMessage) {
      messageType = "sticker";
    } else if (messages.message?.documentMessage) {
      messageType = "document";
    } else if (messages.message?.audioMessage) {
      messageType = "audio";
    }

    for (const mentionedUser of mentionedUsers) {
      const afkStatus = await AFK.getAFKStatus(mentionedUser);

      if (afkStatus) {
        const settings = afkStatus.settings;
        const shouldNotify = (isGroup && settings.notifyOnGroup) || (!isGroup && settings.notifyOnDM) || settings.notifyOnMention;

        await AFK.addMention(mentionedUser, {
          userId: sender,
          userName: senderName || "Unknown User",
          message: messageText,
          messageType,
          chatId: jid,
          chatName: isGroup ? groupName || "Group Chat" : "Private Chat",
          isGroup,
          groupRole: context.isAdmin ? "admin" : "member",
        });

        const timeAway = new Date() - afkStatus.timestamp;
        const timeString = formatTimeDuration(timeAway);

        const replyMessage = settings.customReply || `*${afkStatus.userName} is AFK* 🚶\n\n` + `📝 *Reason:* ${afkStatus.reason}\n` + `⏱️ *Time away:* ${timeString}`;

        if (settings.autoReply) {
          await Javix.sendMessage(jid, { text: replyMessage }, { quoted: messages });
        }

        // Send DM to the AFK user if notifications are enabled
        if (shouldNotify) {
          const dmNotice = `*You were mentioned while AFK* 📱\n\n` + `👤 *By:* ${senderName || "Unknown User"}\n` + `💬 *In:* ${isGroup ? groupName || "Group Chat" : "Private Chat"}\n` + `📝 *Message:* ${messageText || "No message"}\n` + `📎 *Type:* ${messageType}`;

          await Javix.sendMessage(mentionedUser, { text: dmNotice });
        }
      }
    }
  } catch (error) {
    console.error("AFK mention handler error:", error);
    console.error("Error details:", {
      context: {
        jid,
        sender,
        senderName,
        isGroup,
        groupName,
      },
      message: messages?.message,
    });
  }
};

export default afkCommand;
