import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { logger } from "logyo";
import config from "#config";
import BotMode from "../models/botmode.model.js";
import Role from "../models/role.model.js";
import AFK from "../models/afk.model.js";
import UserBan from "../models/userBan.model.js";
import PermissionManager from "../utils/permissionManager.js";
import AntiLink from "../models/antilink.model.js";
import { extractTargetUserUniversal } from "../utils/target.js";
import { toBool } from "@nexoracle/utils";
import { randomizeArray } from "@nexoracle/utils";

const cooldowns = new Map();

const commandUsage = new Map();

const performanceStats = {
  commandsExecuted: 0,
  averageResponseTime: 0,
  totalResponseTime: 0,
  errors: 0,
  startTime: Date.now(),
};

let commandCache = null;
let lastCommandLoad = 0;
const CACHE_DURATION = 5 * 60 * 1000;

const COOLDOWN_CLEANUP_INTERVAL = 30 * 60 * 1000;
const COOLDOWN_MAX_AGE = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [commandName, timestamps] of cooldowns.entries()) {
    for (const [sender, timestamp] of timestamps.entries()) {
      if (now - timestamp > COOLDOWN_MAX_AGE) {
        timestamps.delete(sender);
        cleanedCount++;
      }
    }

    if (timestamps.size === 0) {
      cooldowns.delete(commandName);
    }
  }

  if (cleanedCount > 0) {
    logger.logSystem(`Cleaned up ${cleanedCount} expired cooldown entries`, "info");
  }
}, COOLDOWN_CLEANUP_INTERVAL);

const loadCommands = async (forceReload = false) => {
  const now = Date.now();

  if (!forceReload && commandCache && now - lastCommandLoad < CACHE_DURATION) {
    return commandCache;
  }

  const commands = new Map();
  const aliases = new Map();
  const commandsPath = path.join(process.cwd(), "commands");
  let loadedCount = 0;
  let errorCount = 0;

  if (!fs.existsSync(commandsPath)) {
    logger.logSystem(`Commands directory not found: ${commandsPath}`, "warning");
    return { commands, aliases };
  }

  const loadingInterval = logger.loading("Loading commands...");

  const loadCommandsFromDir = async (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        await loadCommandsFromDir(fullPath);
      } else if (file.name.endsWith(".js")) {
        try {
          const fileURL = pathToFileURL(fullPath).href;
          const commandModule = await import(`${fileURL}?update=${now}`);

          const commandsToProcess = [];

          if (commandModule?.default?.name && commandModule.default?.run && typeof commandModule.default.run === "function") {
            commandsToProcess.push(commandModule.default);
          }

          for (const exportName in commandModule) {
            const exportedItem = commandModule[exportName];
            if (exportName !== "default" && exportedItem?.name && exportedItem?.run && typeof exportedItem.run === "function") {
              commandsToProcess.push(exportedItem);
            }
          }

          for (const command of commandsToProcess) {
            command.cooldown = Math.max(0, command.cooldown || 0);
            command.aliases = Array.isArray(command.aliases) ? command.aliases : [];
            command.description = command.description || "No description available";
            command.usage = command.usage || `${config.prefix || "!"}${command.name}`;
            command.category = command.category || path.basename(dir) || "general";
            command.hidden = command.hidden || false;

            command.ownerOnly = Boolean(command.ownerOnly);
            command.adminOnly = Boolean(command.adminOnly);
            command.groupOnly = Boolean(command.groupOnly);
            command.privateOnly = Boolean(command.privateOnly);
            command.botAdminRequired = Boolean(command.botAdminRequired);

            commands.set(command.name.toLowerCase(), command);
            loadedCount++;

            command.aliases.forEach((alias) => {
              const lowerAlias = alias.toLowerCase();
              if (aliases.has(lowerAlias)) {
                logger.logSystem(`Alias "${alias}" is already used by another command`, "warning");
              } else {
                aliases.set(lowerAlias, command.name.toLowerCase());
              }
            });
          }

          if (commandsToProcess.length === 0) {
            logger.logSystem(`Command file ${file.name} doesn't export any valid command objects`, "warning");
            errorCount++;
          }
        } catch (error) {
          logger.logError(error, { command: file.name, context: "Command Loading" });
          errorCount++;
        }
      }
    }
  };

  try {
    await loadCommandsFromDir(commandsPath);
  } catch (error) {
    logger.logError(error, { context: "Commands Directory Loading" });
  }

  clearInterval(loadingInterval);
  process.stdout.write("\r\x1b[K");

  if (loadedCount > 0) {
    logger.logSystem(`Loaded ${loadedCount} commands successfully`, "success");
  }
  if (errorCount > 0) {
    logger.logSystem(`Failed to load ${errorCount} commands`, "error");
  }

  commandCache = { commands, aliases };
  lastCommandLoad = now;

  return commandCache;
};

const getGroupAdmins = (participants) => {
  return participants.filter((participant) => ["admin", "superadmin"].includes(participant.admin)).map((participant) => participant.id);
};

const parseMessage = (message) => {
  if (!message) return { type: "unknown", content: "", raw: null };

  const types = {
    conversation: "text",
    extendedTextMessage: "text",
    buttonsMessage: "button",
    listMessage: "list",
    templateMessage: "template",
    interactiveMessage: "interactive",
    contactMessage: "contact",
    contactsArrayMessage: "contacts",

    imageMessage: "image",
    videoMessage: "video",
    audioMessage: "audio",
    stickerMessage: "sticker",
    documentMessage: "document",
    viewOnceMessage: "viewOnce",
    viewOnceMessageV2: "viewOnce",
    locationMessage: "location",
    liveLocationMessage: "liveLocation",

    protocolMessage: "protocol",
    senderKeyDistributionMessage: "keyDistribution",
    ephemeralMessage: "ephemeral",
    reactionMessage: "reaction",
    pollUpdateMessage: "pollUpdate",
    pollCreationMessage: "poll",
    groupInviteMessage: "groupInvite",
    callLogMessage: "callLog",
  };

  const type = Object.keys(message).find((key) => types[key]);

  let content = "";
  if (type === "conversation") {
    content = message[type];
  } else if (type === "extendedTextMessage") {
    content = message[type].text;
  } else if (message[type]?.caption) {
    content = message[type].caption;
  } else if (type === "viewOnceMessage" || type === "viewOnceMessageV2") {
    const viewOnceContent = message[type].message;
    const viewOnceType = Object.keys(viewOnceContent).find((key) => types[key]);
    if (viewOnceType) {
      content = viewOnceContent[viewOnceType]?.caption || "";
    }
  }

  return {
    type: types[type] || "unknown",
    content: content || "",
    raw: message[type] || message,
    hasMedia: ["image", "video", "document", "audio", "sticker", "viewOnce"].includes(types[type]),
    isQuoted: Boolean(message[type]?.contextInfo?.quotedMessage),
    isViewOnce: type === "viewOnceMessage" || type === "viewOnceMessageV2",
    isEphemeral: type === "ephemeralMessage",
    isReaction: type === "reactionMessage",
    isPoll: type === "pollCreationMessage" || type === "pollUpdateMessage",
    isLocation: type === "locationMessage" || type === "liveLocationMessage",
    isGroupInvite: type === "groupInviteMessage",
    isCallLog: type === "callLogMessage",
  };
};

const checkCooldown = (command, sender, isOwner = false, isAdmin = false) => {
  if (!command.cooldown) return false;

  let cooldownAmount = command.cooldown;
  if (isOwner) cooldownAmount = Math.floor(cooldownAmount * 0.1);
  else if (isAdmin) cooldownAmount = Math.floor(cooldownAmount * 0.5);

  const now = Date.now();
  const timestamps = cooldowns.get(command.name) || new Map();

  if (timestamps.has(sender)) {
    const expirationTime = timestamps.get(sender) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }

  timestamps.set(sender, now);
  cooldowns.set(command.name, timestamps);
  return false;
};

const validateCommandArgs = (command, args) => {
  const errors = [];

  if (command.minArgs && args.length < command.minArgs) {
    errors.push(`Minimum ${command.minArgs} argument(s) required`);
  }

  if (command.maxArgs && args.length > command.maxArgs) {
    errors.push(`Maximum ${command.maxArgs} argument(s) allowed`);
  }

  if (command.requiredArgs && Array.isArray(command.requiredArgs)) {
    command.requiredArgs.forEach((argInfo, index) => {
      if (!args[index] && argInfo.required) {
        errors.push(`Argument "${argInfo.name}" is required`);
      }
    });
  }

  if (errors.length > 0) {
    return `*Invalid arguments!*\n${errors.join("\n")}\n\n*Usage:* ${command.usage}`;
  }

  return null;
};

const trackCommandUsage = (commandName, executionTime = 0) => {
  const usage = commandUsage.get(commandName) || { count: 0, totalTime: 0, errors: 0 };
  usage.count++;
  usage.totalTime += executionTime;
  commandUsage.set(commandName, usage);

  performanceStats.commandsExecuted++;
  performanceStats.totalResponseTime += executionTime;
  performanceStats.averageResponseTime = performanceStats.totalResponseTime / performanceStats.commandsExecuted;
};

const rateLimits = new Map();
const checkRateLimit = (sender, isOwner = false) => {
  if (isOwner) return false;

  const now = Date.now();
  const userLimits = rateLimits.get(sender) || { count: 0, lastReset: now };

  if (now - userLimits.lastReset > 60000) {
    userLimits.count = 0;
    userLimits.lastReset = now;
  }

  const maxCommands = config.rateLimit?.maxCommands || 10;
  if (userLimits.count >= maxCommands) {
    return true;
  }

  userLimits.count++;
  rateLimits.set(sender, userLimits);
  return false;
};

const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000;
const RATE_LIMIT_MAX_AGE = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sender, limits] of rateLimits.entries()) {
    if (now - limits.lastReset > RATE_LIMIT_MAX_AGE) {
      rateLimits.delete(sender);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.logSystem(`Cleaned up ${cleanedCount} expired rate limit entries`, "info");
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

const BAN_CLEANUP_INTERVAL = 60 * 60 * 1000;

setInterval(async () => {
  try {
    const sessionId = global.sessionId || "default";
    const cleanedCount = await UserBan.cleanupExpiredBans(sessionId);

    if (cleanedCount > 0) {
      logger.logSystem(`Cleaned up ${cleanedCount} expired bans`, "info");
    }
  } catch (error) {
    logger.logError(error, { context: "Ban Cleanup" });
  }
}, BAN_CLEANUP_INTERVAL);

const handleAFKMentions = async (Javix, messageObj, context) => {
  try {
    const { jid, sender, isOwner, senderName, isGroup, groupName, isAdmin } = context;

    if (isOwner || !messageObj?.message) return;

    const mentionedUsers = messageObj.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentionedUsers.length) return;

    let messageText = "";
    let messageType = "text";

    if (messageObj.message?.conversation) {
      messageText = messageObj.message.conversation;
    } else if (messageObj.message?.extendedTextMessage?.text) {
      messageText = messageObj.message.extendedTextMessage.text;
    } else if (messageObj.message?.imageMessage?.caption) {
      messageText = messageObj.message.imageMessage.caption;
      messageType = "image";
    } else if (messageObj.message?.videoMessage?.caption) {
      messageText = messageObj.message.videoMessage.caption;
      messageType = "video";
    } else if (messageObj.message?.stickerMessage) {
      messageType = "sticker";
    } else if (messageObj.message?.documentMessage) {
      messageType = "document";
    } else if (messageObj.message?.audioMessage) {
      messageType = "audio";
    }

    for (const mentionedUser of mentionedUsers) {
      try {
        if (!mentionedUser || typeof mentionedUser !== "string") {
          logger.logSystem(`Invalid mentioned user ID: ${mentionedUser}`, "warning");
          continue;
        }

        const mentionedUserId = mentionedUser.includes("@") ? mentionedUser : `${mentionedUser.replace(/\D/g, "")}@s.whatsapp.net`;

        if (!mentionedUserId.includes("@s.whatsapp.net")) {
          logger.logSystem(`Invalid WhatsApp ID format: ${mentionedUserId}`, "warning");
          continue;
        }

        logger.logSystem(`Checking AFK status for user: ${mentionedUserId}`, "info");

        const afkStatus = await AFK.getAFKStatus(mentionedUserId);

        logger.logSystem(`AFK status: ${afkStatus ? "Found" : "Not found"}`, "info");

        if (afkStatus) {
          const settings = afkStatus.settings || {};
          const shouldNotify = (isGroup && settings.notifyOnGroup) || (!isGroup && settings.notifyOnDM) || settings.notifyOnMention;

          logger.logSystem(`Should notify: ${shouldNotify}`, "info");

          if (shouldNotify) {
            try {
              await AFK.addMention(mentionedUserId, {
                userId: sender,
                userName: senderName || "Unknown User",
                message: messageText,
                messageType,
                chatId: jid,
                chatName: isGroup ? groupName || "Group Chat" : "Private Chat",
                isGroup,
                groupRole: isAdmin ? "admin" : "member",
              });

              const timeAway = new Date() - afkStatus.timestamp;
              const timeString = formatTimeDuration(timeAway);

              const replyMessage = settings.customReply || `*${afkStatus.userName} is AFK* 🚶\n\n` + `📝 *Reason:* ${afkStatus.reason}\n` + `⏱️ *Time away:* ${timeString}`;

              logger.logSystem(`Sending AFK reply: ${replyMessage}`, "info");

              if (settings.autoReply) {
                await Javix.sendMessage(jid, { text: replyMessage }, { quoted: messageObj });
              }
            } catch (mentionError) {
              logger.logError(mentionError, {
                context: "AFK Mention Add",
                userId: mentionedUserId,
                sender: sender,
              });
            }
          }
        }
      } catch (error) {
        logger.logError(error, {
          context: "AFK Status Check",
          mentionedUser,
          sender: sender,
        });
      }
    }
  } catch (error) {
    logger.logError(error, { context: "AFK Mention Handler" });
  }
};

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

const handleAntiLink = async (Javix, m, groupMetadata, isAdmins, isSenderAdmin, isSenderOwner) => {
  try {
    if (!m.isGroup || !m.body || typeof m.body !== "string" || !m.chat) return;

    const sessionId = Javix.user?.id ? Javix.user.id.split(":")[0] : "default";
    const antiLinkSettings = await AntiLink.getGroupSettings(sessionId, m.chat);
    if (!antiLinkSettings?.enabled) return;

    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);
    const senderNumber = m.sender.split("@")[0].split(":")[0];
    const isBotOwner = ownerNumbers.includes(senderNumber);
    if (isBotOwner) return;

    if (isSenderAdmin || isSenderOwner) {
      // console.log("Sender is group admin, skipping anti-link action");
      return;
    }

    const messageText = m.body.toLowerCase();
    // const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*)/gi;
    // const urls = messageText.match(urlRegex);
    // if (!urls) return;

    // const containsBlockedLink = antiLinkSettings.linkPatterns?.some(pattern =>
    //     urls.some(url => url.includes(pattern.toLowerCase()))
    // );
    // if (!containsBlockedLink) return;

    const containsBlockedLink = antiLinkSettings.linkPatterns?.some((pattern) => messageText.includes(pattern.toLowerCase()));

    if (!containsBlockedLink) {
      // console.log("No blocked patterns found in message");
      return;
    }

    const participants = groupMetadata?.participants || [];
    const botId = Javix.user.id;
    const bareBotId = botId.includes(":") ? botId.split(":")[0] + "@s.whatsapp.net" : botId;
    const botParticipant = participants.find((p) => p.id === bareBotId);
    const isBotAdmin = !!botParticipant && (botParticipant.admin === "admin" || botParticipant.admin === "superadmin");

    // console.log("🚨 Taking action with mode:", antiLinkSettings.mode);

    switch (antiLinkSettings.mode) {
      case "delete":
        try {
          if (isBotAdmin) {
            await Javix.sendMessage(m.chat, { delete: m.key });
            await AntiLink.updateSettings(sessionId, m.chat, {
              $inc: { "stats.linksDeleted": 1 },
              lastAction: new Date(),
            });
          } else {
            await Javix.sendMessage(m.chat, {
              text: "❌ *AntiLink Alert*\nI need to be admin to delete messages!",
            });
          }
        } catch (error) {
          console.error("Error in delete action:", error);
        }
        break;

      case "kick":
        try {
          if (isBotAdmin) {
            await Javix.sendMessage(m.chat, { delete: m.key });
            await Javix.groupParticipantsUpdate(m.chat, [m.sender], "remove");
            await AntiLink.updateSettings(sessionId, m.chat, {
              $inc: { "stats.usersKicked": 1 },
              lastAction: new Date(),
            });
          } else {
            await Javix.sendMessage(m.chat, {
              text: "❌ *AntiLink Alert*\nI need to be admin to kick users!",
            });
          }
        } catch (error) {
          console.error("Error in kick action:", error);
        }
        break;

      case "warn":
        try {
          await Javix.sendMessage(m.chat, { delete: m.key });
          await Javix.sendMessage(m.chat, {
            text: `⚠️ *Link Detected!*\n@${m.sender.split("@")[0]}, please avoid sending links in this group.`,
            mentions: [m.sender],
          });
          await AntiLink.updateSettings(sessionId, m.chat, {
            $inc: { "stats.warningsSent": 1 },
            lastAction: new Date(),
          });
        } catch (error) {
          console.error("Error in warn action:", error);
        }
        break;
    }
  } catch (error) {
    console.error("Critical error in anti-link:", error);
  }
};

const checkBotMode = async (Javix, senderNumber, isGroup) => {
  try {
    const sessionId = Javix.user.id.split(":")[0];
    const botmode = await BotMode.getCurrentMode(sessionId);

    const isOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber.includes(senderNumber) : config.ownerNumber === senderNumber;

    const isModerator = await Role.isModerator(sessionId, senderNumber);

    if (!isOwner) {
      const userId = `${senderNumber}@s.whatsapp.net`;
      const banStatus = await UserBan.isUserBanned(sessionId, userId);

      if (banStatus) {
        logger.logSystem(`Blocked banned user: ${senderNumber}`, "warning");
        return false;
      }
    }

    if (botmode.mode === "private" && isOwner) {
      return true;
    }

    if (botmode.groupOnly && !isGroup) {
      return false;
    }

    switch (botmode.mode) {
      case "public":
        return true;

      case "private":
        return isOwner;

      case "restricted":
        return isOwner || isModerator;

      default:
        return true;
    }
  } catch (error) {
    logger.logError(error, { context: "Bot Mode Check" });
    return true;
  }
};

const deleteMessage = async (Javix, jid, key) => {
  try {
    await Javix.sendMessage(jid, { delete: key });
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

const editMessage = async (Javix, jid, key, content) => {
  try {
    await Javix.sendMessage(jid, {
      ...content,
      edit: key,
    });
    return true;
  } catch (error) {
    console.error("Error editing message:", error);
    return false;
  }
};

const checkGroupCommandPermissions = async (context) => {
  const { Javix, jid, isGroup, isAdmin, isBotAdmin, groupMetadata, sender, commandType } = context;

  try {
    if (!isGroup) {
      await Javix.sendMessage(jid, {
        text: "*This command can only be used in groups!*",
      });
      return false;
    }

    if (!groupMetadata || !groupMetadata.participants) {
      await Javix.sendMessage(jid, {
        text: "*Error: Could not fetch group information!*",
      });
      return false;
    }

    if (!isBotAdmin) {
      await Javix.sendMessage(jid, {
        text: "*I need to be an admin to perform this action!*",
      });
      return false;
    }

    const senderParticipant = groupMetadata.participants.find((p) => p.id === sender);
    const isUserAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";

    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);

    const senderNumber = sender.split("@")[0];
    const isOwner = ownerNumbers.some((ownerNum) => ownerNum === senderNumber || ownerNum === sender.split("@")[0]);

    if (!isOwner && !isUserAdmin) {
      await Javix.sendMessage(jid, {
        text: "*Only admins and bot owners can use this command!*",
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Permission check error:", error);
    await Javix.sendMessage(jid, {
      text: "*An error occurred while checking permissions!*",
    });
    return false;
  }
};

const getContentType = (message) => {
  if (!message) return null;
  const types = Object.keys(message);
  return types.find((type) => type !== "contextInfo") || null;
};

const handleMessage = async (Javix, messageObj, isSelf = false) => {
  const startTime = Date.now();

  try {
    if (!Javix || !messageObj) {
      logger.logSystem("Invalid parameters passed to handleMessage", "error");
      return;
    }

    const { commands, aliases } = await loadCommands();

    const { message, key, pushName } = messageObj;

    if (!key || !key.remoteJid) {
      logger.logSystem("Invalid message key structure", "warning");
      return;
    }

    const jid = key.remoteJid;
    const isGroup = jid.endsWith("@g.us");

    let m = messageObj;
    if (!m) return;

    if (m.key) {
      m.id = m.key.id;
      m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
      m.chat = m.key.remoteJid;
      m.fromMe = m.key.fromMe;
      m.isGroup = m.chat.endsWith("@g.us");

      if (m.fromMe) {
        m.sender = Javix.user.id;
      } else if (m.isGroup) {
        m.sender = m.key.participant || m.participant || null;
        if (m.sender) {
          m.participant = m.sender;
        }
      } else {
        m.sender = m.chat;
      }

      if (!m.sender) {
        logger.logSystem("Could not determine sender ID", "warning");
        return;
      }
    }

    m.isSelf = isSelf;

    if (m.message) {
      try {
        m.mtype = getContentType(m.message);
        m.msg = m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype];
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == "listResponseMessage" && m.msg.singleSelectReply.selectedRowId) || (m.mtype == "buttonsResponseMessage" && m.msg.selectedButtonId) || (m.mtype == "viewOnceMessage" && m.msg.caption) || m.text;

        m.mentionedJid = [];

        if (m.message.contextInfo?.mentionedJid) {
          m.mentionedJid.push(...m.message.contextInfo.mentionedJid);
        }
        if (m.msg.contextInfo?.mentionedJid) {
          m.mentionedJid.push(...m.msg.contextInfo.mentionedJid);
        }
        if (m.message[m.mtype]?.contextInfo?.mentionedJid) {
          m.mentionedJid.push(...m.message[m.mtype].contextInfo.mentionedJid);
        }

        m.mentionedJid = [...new Set(m.mentionedJid)];

        let quotedMsg = (m.quoted = m.message?.contextInfo?.quotedMessage || null);

        if (m.quoted) {
          let quotedType = getContentType(quotedMsg);
          m.quoted = m.quoted[quotedType];

          if (["productMessage"].includes(quotedType)) {
            quotedType = getContentType(m.quoted);
            m.quoted = m.quoted[quotedType];
          }

          if (typeof m.quoted === "string") {
            m.quoted = { text: m.quoted };
          }

          m.quoted.mtype = quotedType;
          m.quoted.id = m.message.contextInfo.stanzaId;
          m.quoted.chat = m.message.contextInfo.remoteJid || m.chat;
          m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16 : false;
          m.quoted.sender = Javix.utils.jidDecode(m.message.contextInfo.participant) || m.message.contextInfo.participant || m.message.contextInfo.participantJid || m.participant || m.key.participant || null;
          m.quoted.fromMe = m.quoted.sender === (Javix.user && Javix.user.id);
          m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || "";
          m.quoted.mentionedJid = m.message.contextInfo?.mentionedJid || [];

          m.quoted.hasMedia = ["image", "video", "document", "audio", "sticker", "viewOnce"].includes(quotedType);
          m.quoted.isViewOnce = quotedType === "viewOnceMessage" || quotedType === "viewOnceMessageV2";
          m.quoted.isEphemeral = quotedType === "ephemeralMessage";
          m.quoted.isReaction = quotedType === "reactionMessage";
          m.quoted.isPoll = quotedType === "pollCreationMessage" || quotedType === "pollUpdateMessage";
          m.quoted.isLocation = quotedType === "locationMessage" || quotedType === "liveLocationMessage";
          m.quoted.isGroupInvite = quotedType === "groupInviteMessage";
          m.quoted.isCallLog = quotedType === "callLogMessage";

          m.getQuotedObj = m.getQuotedMessage = async () => {
            if (!m.quoted.id) return false;
            try {
              let q = await Javix.loadMessage(m.chat, m.quoted.id);
              return q;
            } catch (error) {
              console.error("Error loading quoted message:", error);
              return false;
            }
          };

          let vM = (m.quoted.fakeObj = {
            key: {
              remoteJid: m.quoted.chat,
              fromMe: m.quoted.fromMe,
              id: m.quoted.id,
            },
            message: quotedMsg,
            ...(isGroup ? { participant: m.quoted.sender } : {}),
          });

          m.quoted.delete = async () => {
            try {
              await Javix.sendMessage(m.quoted.chat, { delete: vM.key });
              return true;
            } catch (error) {
              console.error("Error deleting quoted message:", error);
              return false;
            }
          };
        }

        try {
          if (typeof m !== "undefined" && m && !m.quoted && m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            m.quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
            let participantJid = m.message.extendedTextMessage.contextInfo.participant || m.message.extendedTextMessage.contextInfo.participantJid || null;
            if (typeof Javix !== "undefined" && Javix && Javix.utils && typeof Javix.utils.jidDecode === "function") {
              m.quoted.sender = Javix.utils.jidDecode(participantJid) || participantJid;
            } else {
              m.quoted.sender = participantJid;
            }
          }
        } catch (err) {
          console.error("[SAFE FALLBACK] Error extracting quoted sender:", err);
        }
      } catch (parseError) {
        logger.logError(parseError, { context: "Message Parsing" });
      }
    }

    let groupMetadata = null;
    let participants = [];
    try {
      if (isGroup) {
        groupMetadata = await Javix.groupMetadata(m.chat).catch(() => null);
        participants = groupMetadata?.participants || [];
      }
    } catch (error) {
      logger.logError(error, { context: "Group Metadata Fetch" });
    }

    const botId = Javix.user.id;
    const bareBotId = botId.includes(":") ? botId.split(":")[0] + "@s.whatsapp.net" : botId;
    const senderId = m.sender;

    const botParticipant = participants.find((p) => p.id === bareBotId);
    const senderParticipant = participants.find((p) => p.id === senderId);

    const isBotAdmin = !!botParticipant && (botParticipant.admin === "admin" || botParticipant.admin === "superadmin");
    const isBotSuperAdmin = !!botParticipant && botParticipant.admin === "superadmin";
    const isSenderAdmin = !!senderParticipant && (senderParticipant.admin === "admin" || senderParticipant.admin === "superadmin");
    const isSenderOwner = !!senderParticipant && senderParticipant.admin === "superadmin";
    const groupAdmins = participants.filter((p) => p.admin === "admin" || p.admin === "superadmin").map((p) => p.id);
    const isAdmins = isSenderAdmin;
    const groupName = isGroup ? groupMetadata?.subject || "Unknown Group" : null;
    const groupDescription = isGroup ? groupMetadata?.desc || "No description" : null;
    const groupSize = isGroup ? groupMetadata?.participants?.length || 0 : 0;

    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || "";
    const messageBody = m.text;

    const { type: messageType, content: messageContent, raw: messageContentRaw, hasMedia, isQuoted } = parseMessage(m.message);

    const cmdPrefix = config.prefix || "!";
    const isCmd = messageBody && messageBody.startsWith(cmdPrefix);
    const [command, ...args] = isCmd ? messageBody.slice(cmdPrefix.length).trim().split(/\s+/) : ["", []];
    const query = args.join(" ");

    if (m.message) {
      setImmediate(() => {
        try {
          const chatType = m.isGroup ? "group" : "private";
          const ownerNumber = String(config.ownerNumber || "").split("@")[0];
          const senderNumber = m.sender.split("@")[0];

          logger.logMessage({
            messageType: m.mtype || "text",
            body: messageBody,
            senderName: pushName || "Unknown",
            senderNumber: senderNumber,
            chatType: chatType,
            groupName: isGroup ? groupName : null,
            groupSize: isGroup ? groupSize : null,
            isOwner: senderNumber === ownerNumber,
            isAdmin: isAdmins,
            isCommand: isCmd,
            hasMedia: m.msg?.hasMedia,
            isQuoted: Boolean(m.quoted),
            executionTime: null,
          });
        } catch (logError) {}
      });
    }

    if (isCmd && m.message) {
      setImmediate(() => {
        try {
          const type = m.mtype || "text";
          logger.logCommand(command, "executing", { type });
        } catch (error) {}
      });
    }

    m.reply = (text, chatId = m.chat, options = {}) => {
      return Buffer.isBuffer(text) ? Javix.sendMedia(chatId, text, "file", "", m, { ...options }) : Javix.sendText(chatId, text, m, { ...options });
    };

    m.copy = () => {
      const messageCopy = { ...m };

      delete messageCopy.reply;
      delete messageCopy.copy;
      delete messageCopy.copyNForward;
      return messageCopy;
    };

    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => {
      return Javix.copyNForward(jid, m, forceForward, options);
    };

    const sender = m.key?.fromMe ? Javix.user.id : m.isGroup ? m.participant || m.key.participant : m.chat;
    if (!sender) {
      logger.logSystem("Could not determine sender ID", "warning");
      return;
    }

    const baseJid = sender.split("@")[0];
    const senderNumber = baseJid.includes(":") ? baseJid.split(":")[0] : baseJid;
    const senderName = pushName || m.conversation || "Unknown";

    const numberFromFormat = senderName?.match(/\((\+\d+)\)/)?.[1]?.replace("+", "");
    const finalSenderNumber = numberFromFormat || senderNumber;

    const userID = Javix.user?.id?.split("@")[0] || "";
    const botNumber = userID.includes(":") ? userID.split(":")[0] : userID;
    const botName = config.botName || "Bot";
    const ownerName = Javix.user?.name || config.ownerName || "Bot";

    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);
    const isOwner = m.key.fromMe || ownerNumbers.some((ownerNum) => ownerNum === finalSenderNumber || ownerNum === senderNumber || ownerNum === sender.split("@")[0]);

    // console.log(`sender: ${sender}\n senderNumber: ${senderNumber}\n finalSenderNumber: ${finalSenderNumber}\n
    //  botNumber: ${botNumber}\n ownerNumbers: ${ownerNumbers}\n isOwner: ${isOwner}\n
    //  m.key.fromMe: ${m.key.fromMe}
    //  `);

    // logger.logSystem(`Owner check for ${finalSenderNumber}: ${isOwner ? "Owner" : "Not Owner"}`, "info");

    try {
      await handleAntiLink(Javix, m, groupMetadata, isAdmins, isSenderAdmin, isSenderOwner);
    } catch (error) {
      console.error("Error in anti-link handler:", error);
    }

    const hasAccess = await checkBotMode(Javix, finalSenderNumber, isGroup);
    if (!hasAccess) {
      return;
    }

    await handleAFKMentions(Javix, m, {
      jid: m.chat,
      sender,
      isOwner,
      senderName,
      isGroup,
      groupName,
      isAdmin: isAdmins,
    });

    const createSendFunction =
      (defaultOptions = {}) =>
      async (content, options = {}) => {
        try {
          const mergedOptions = {
            quoted: m,
            ephemeralExpiration: config.ephemeralExpiration || 86400,
            ...defaultOptions,
            ...options,
          };
          return await Javix.sendMessage(m.chat, content, mergedOptions);
        } catch (error) {
          logger.logError(error, { context: "Send Message" });
          throw error;
        }
      };

    const reply = async (text, options = {}) => {
      if (typeof text !== "string") text = String(text);
      return createSendFunction()({ text }, options);
    };

    function botPic() {
      const defaultImage = "https://i.ibb.co/tM198b35/0d96491634eccde81a3a430b6b969209.jpg";
      const botImages = config.botImage;

      if (!botImages) return defaultImage;

      const images = botImages
        .split(",")
        .map((img) => img.trim())
        .filter((img) => img !== "");

      const botPic = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : defaultImage;

      return botPic;
    }

    const send = createSendFunction();

    const react = async (emoji) => {
      try {
        return await Javix.sendMessage(m.chat, {
          react: { text: emoji, key: m.key },
        });
      } catch (error) {
        logger.logError(error, { context: "React" });
      }
    };

    const edit = async (text, messageKey) => {
      try {
        return await Javix.sendMessage(m.chat, {
          text: String(text),
          edit: messageKey,
        });
      } catch (error) {
        logger.logError(error, { context: "Edit Message" });
      }
    };

    const deleteMsg = async (messageKey = m.key) => {
      try {
        return await Javix.sendMessage(m.chat, { delete: messageKey });
      } catch (error) {
        logger.logError(error, { context: "Delete Message" });
      }
    };

    const utils = {
      formatTime: (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
      },

      formatBytes: (bytes, decimals = 2) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
      },

      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

      isUrl: (text) => {
        try {
          new URL(text);
          return true;
        } catch {
          return false;
        }
      },

      extractUrls: (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
      },

      randomChoice: (array) => array[Math.floor(Math.random() * array.length)],

      formatNumber: (num) => new Intl.NumberFormat().format(num),

      capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),

      truncate: (str, length = 100) => (str.length > length ? str.substring(0, length) + "..." : str),

      getUptime: () => {
        const uptime = Date.now() - performanceStats.startTime;
        return utils.formatTime(uptime / 1000);
      },
    };

    const isPublicMode = config.public_mode !== false;
    if (!isPublicMode && !m.key.fromMe && !isOwner) {
      return;
    }

    if (isCmd && checkRateLimit(sender, isOwner)) {
      return reply("⏳ *Rate limit exceeded!* Please slow down and try again later.");
    }

    if (isCmd && m.message) {
      try {
        await Javix.readMessages([m.key]);
        await Javix.sendPresenceUpdate("composing", m.chat);

        setTimeout(async () => {
          try {
            await Javix.sendPresenceUpdate("paused", m.chat);
          } catch (error) {}
        }, 10000);
      } catch (error) {}
    }

    if (toBool(config.autoReaction)) {
      const emoji = randomizeArray(["❤", "💕", "😻", "🧡", "💛", "💚", "💙", "💜", "🖤", "❣", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥", "💌", "🙂", "🤗", "😌", "😉", "🤗", "😊", "🎊", "🎉", "🎁", "🎈", "👋",'🩹','💯','♨️','💢','💬','👁️‍🗨️','🗨️','🗯️','💭','💤','🌐','♠️','♥️','♦️','♣️','🃏','🀄️','🎴','🎭️','🔇','🔈️','🔉','🔊','🔔','🔕','🎼','🎵','🎶','💹','🏧','🚮','🚰','♿️','🚹️','🚺️','🚻','🚼️','🚾','🛂','🛃','🛄','🛅','⚠️','🚸','⛔️','🚫','🚳','🚭️','🚯','🚱','🚷','📵','🔞','☢️','☣️','⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔃','🔄','🔙','🔚','🔛','🔜','🔝','🛐','⚛️','🕉️','✡️','☸️','☯️','✝️','☦️','☪️','☮️','🕎','🔯','♈️','♉️','♊️','♋️','♌️','♍️','♎️','♏️','♐️','♑️','♒️','♓️','⛎','🔀','🔁','🔂','▶️','⏩️','⏭️','⏯️','◀️','⏪️','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','⏏️','🎦','🔅','🔆','📶','📳','📴','♀️','♂️','⚧','✖️','➕','➖','➗','♾️','‼️','⁉️','❓️','❔','❕','❗️','〰️','💱','💲','⚕️','♻️','⚜️','🔱','📛','🔰','⭕️','✅','☑️','✔️','❌','❎','➰','➿','〽️','✳️','✴️','❇️','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'])[0];

      if (isCmd && m.message) {
        await react(emoji);
      }
    }

    if (isCmd) {
      const cmdName = command.toLowerCase();
      const cmdHandler = commands.get(cmdName) || (aliases.has(cmdName) ? commands.get(aliases.get(cmdName)) : null);

      if (cmdHandler) {
        const commandStartTime = Date.now();

        try {
          const cooldownTime = checkCooldown(cmdHandler, sender, isOwner, isAdmins);
          if (cooldownTime) {
            return reply(`⏳ *Command on cooldown!* Please wait ${cooldownTime.toFixed(1)} seconds.`);
          }

          const hasPermission = await PermissionManager.validatePermissions({
            Javix,
            jid: m.chat,
            message: m.message,
            isGroup,
            isAdmin: isAdmins,
            isBotAdmin,
            groupMetadata,
            sender,
            command: cmdHandler,
            commandType: cmdHandler.name,
          });

          if (!hasPermission) {
            return;
          }

          const argError = validateCommandArgs(cmdHandler, args);
          if (argError) {
            return reply(argError);
          }

          const targetCommands = ["promote", "demote", "kick", "ban", "unban"];
          let targetUser, targetParticipant;
          if (isGroup && targetCommands.includes(cmdHandler.name)) {
            const extracted = extractTargetUserUniversal({ m, args, message: m.message });
            targetUser = extracted.targetJid;
            if (targetUser && groupMetadata?.participants) {
              targetParticipant = groupMetadata.participants.find((p) => p.id === targetUser);
            }
          }

          const groupContext = isGroup
            ? {
                isGroup,
                isAdmin: isSenderAdmin,
                isBotAdmin,
                isBotSuperAdmin,
                isSenderAdmin,
                isSenderOwner,
                groupMetadata,
                groupAdmins,
                groupOwner: groupAdmins.find((id) => participants.find((p) => p.id === id)?.admin === "superadmin"),
                groupName,
                groupDescription,
                groupSize,
                participants,
                botParticipant,
                senderParticipant,
              }
            : {
                isGroup: false,
              };

          const context = {
            Javix,
            config,
            capion: config.caption,

            messages: m,
            message: m.message,
            messageObj: m,
            msg: m,

            messageType,
            messageContent,
            body: messageBody,
            args,
            command: cmdName,
            query,
            hasMedia,
            isQuoted: !!m.quoted,

            isOwner,
            isAdmins,
            isBotAdmin,
            isSenderAdmin,
            isSenderOwner,
            isGroup,
            senderNumber,
            senderName,
            pushName,

            ...groupContext,

            chat: m.chat,
            sender,
            key: m.key,
            from: m.chat,
            chatId: m.chat,
            jid: m.chat,

            botNumber,
            botName,
            ownerName,
            prefix: cmdPrefix,
            botPic,

            reply,
            send,
            react,
            edit: async (text, messageKey) => {
              try {
                await Javix.sendMessage(m.chat, {
                  text: String(text),
                  edit: messageKey,
                });
                return true;
              } catch (error) {
                console.error("Error editing message:", error);
                return false;
              }
            },
            delete: deleteMsg,

            sendMessage: createSendFunction(),

            utils: {
              ...utils,
              jidDecode: (jid) => {
                if (!jid) return null;
                try {
                  const decoded = Javix.utils.jidDecode(jid);
                  return decoded || null;
                } catch (error) {
                  return null;
                }
              },
            },

            performance: {
              startTime: commandStartTime,
              getExecutionTime: () => Date.now() - commandStartTime,
            },

            commands: new Map(commands),
            aliases: new Map(aliases),

            getCommand: (name) => commands.get(name.toLowerCase()) || (aliases.has(name.toLowerCase()) ? commands.get(aliases.get(name.toLowerCase())) : null),

            cooldowns,
            commandUsage,
            performanceStats: { ...performanceStats },

            deleteMessage: (key) => deleteMessage(Javix, m.chat, key),
            editMessage: (key, content) => editMessage(Javix, m.chat, key, content),

            checkPermissions: (targetUser) =>
              PermissionManager.validatePermissions({
                Javix,
                jid: m.chat,
                message: m.message,
                isGroup,
                isAdmin: isAdmins,
                isBotAdmin,
                groupMetadata,
                targetUser,
                commandType: cmdHandler.name,
                sender,
                command: cmdHandler,
              }),

            targetUser,
            targetParticipant,
          };

          await cmdHandler.run(context);

          trackCommandUsage(cmdName, Date.now() - commandStartTime);

          logger.logCommand(cmdName, "success", {
            executionTime: Date.now() - commandStartTime,
          });
        } catch (error) {
          logger.logError(error, {
            command: cmdName,
            user: senderName,
            time: new Date().toISOString(),
          });

          await reply("*An error occurred while executing the command!*");
        }
      } else {
        let unknownMsg = `Use \`${cmdPrefix}help\` to see all available commands.`;

        await reply(unknownMsg);
      }
    }
  } catch (error) {
    logger.logError(error, { context: "Critical Handler Error" });

    try {
      await Javix.sendMessage(m.chat, {
        text: "*System Error*\nA critical error occurred. Please try again later.",
      });
    } catch (sendError) {
      logger.logError(sendError, { context: "Failed to send error message" });
    }
  } finally {
    const totalTime = Date.now() - startTime;
    if (totalTime > 3000) {
      logger.logSystem(`Slow handler execution: ${totalTime}ms`, "warning");
    }
  }
};

export const getHandlerStats = () => ({
  ...performanceStats,
  uptime: Date.now() - performanceStats.startTime,
  commandUsage: Object.fromEntries(commandUsage),
  cacheInfo: {
    cached: !!commandCache,
    lastLoad: new Date(lastCommandLoad).toLocaleString(),
    cacheAge: Date.now() - lastCommandLoad,
  },
});

export const reloadCommands = () => loadCommands(true);

export const getPerformanceSummary = () => {
  const stats = getHandlerStats();
  const uptime = stats.uptime / 1000;

  return {
    commandsExecuted: stats.commandsExecuted,
    averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
    errors: stats.errors,
    uptime: Math.round(uptime),
    commandsPerMinute: Math.round((stats.commandsExecuted / (uptime / 60)) * 100) / 100,
    errorRate: Math.round((stats.errors / stats.commandsExecuted) * 10000) / 100,
  };
};

export default handleMessage;
