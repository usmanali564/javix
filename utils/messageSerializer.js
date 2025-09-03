/** @format */
import pkg from "baileys";
const { proto, jidDecode, getContentType, downloadMediaMessage, jidNormalizedUser } = pkg;
import { logger } from "logyo";
import config from "#config";

/**
 * Check if message is a system message btw optional file.
 * @param {Object} message - Message object
 * @returns {boolean} True if system message
 */
const isSystemMessage = (message) => {
  if (!message) return false;
  return message.type === "presence" || message.type === "system" || message.update?.presence || message.update?.connection || message.update?.chat || message.update?.status || message.connection || message.chat || message.messageStatus || message.presence;
};

/**
 * Serialize message for easier handling
 * @param {Object} Javix - Javix instance
 * @param {Object} message - Message object
 * @param {Object} store - Message store for loading referenced messages
 * @returns {Object} Serialized message
 */
export const serializeMessage = async (Javix, message, store = null) => {
  try {
    // Basic validation
    if (!message || typeof message !== "object") {
      return null;
    }

    // Check for system messages
    if (isSystemMessage(message)) {
      return null;
    }

    // Validate key and remoteJid
    if (!message.key || !message.key.remoteJid) {
      return null;
    }

    // Skip empty messages
    if (!message.message) {
      return null;
    }

    const m = { ...message };
    m.key = message.key ?? undefined;
    m.jid = message.key?.remoteJid ?? undefined;
    m.id = m.key?.id ?? undefined;
    m.isGroup = m.jid?.endsWith("@g.us");
    const jidOwner = jidNormalizedUser(Javix?.user?.id);
    const lidOwner = jidNormalizedUser(Javix?.user?.lid);
    m.sender = m.isGroup ? jidNormalizedUser(message.key?.participant) : jidNormalizedUser(m.jid);
    m.fromMe = [jidOwner, lidOwner].includes(m.sender);
    m.pushName = message.pushName || "unknown";
    m.user = jidOwner;
    m.prefix = config.PREFIX;
    const content = message.message || null;
    m.type = getContentType(content) || "";

    // Get message body based on type
    if (m.type === "conversation") {
      m.body = content?.conversation ?? undefined;
    } else if (m.type === "extendedTextMessage") {
      m.body = content?.extendedTextMessage?.text ?? undefined;
    } else if (m.type === "imageMessage") {
      m.body = content?.imageMessage?.caption ?? undefined;
    } else if (m.type === "videoMessage") {
      m.body = content?.videoMessage?.caption ?? undefined;
    } else if (m.type === "documentMessage") {
      m.body = content?.documentMessage?.fileName ?? undefined;
    } else if (m.type === "audioMessage") {
      m.body = content?.audioMessage?.fileName ?? undefined;
    } else if (m.type === "stickerMessage") {
      m.body = content?.stickerMessage?.fileName ?? undefined;
    } else if (m.type === "locationMessage") {
      m.body = content?.locationMessage?.name ?? undefined;
    } else if (m.type === "contactMessage") {
      m.body = content?.contactMessage?.displayName ?? undefined;
    } else if (m.type === "buttonsResponseMessage") {
      m.body = content?.buttonsResponseMessage?.selectedDisplayText ?? undefined;
    } else if (m.type === "listResponseMessage") {
      m.body = content?.listResponseMessage?.title ?? undefined;
    } else if (m.type === "templateButtonReplyMessage") {
      m.body = content?.templateButtonReplyMessage?.selectedDisplayText ?? undefined;
    } else if (m.type === "reactionMessage") {
      m.body = content?.reactionMessage?.text ?? undefined;
    } else {
      m.body = "";
    }

    m.raw = message;
    m.content = content;
    m.quoted = null;

    // Handle quoted messages
    const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      const quotedType = getContentType(quoted);
      const contextInfo = content?.extendedTextMessage?.contextInfo;
      const quotedSender = contextInfo?.participant ? jidNormalizedUser(contextInfo.participant) : null;

      const quotedMsg = {
        key: {
          remoteJid: m.jid ?? "",
          fromMe: [jidOwner, lidOwner].includes(quotedSender),
          id: contextInfo?.stanzaId ?? "",
          participant: quotedSender,
        },
        message: quoted,
      };

      m.quoted = {
        type: quotedType,
        content: quoted[quotedType],
        message: quoted,
        sender: quotedSender,
        pushname: contextInfo?.pushName || "Unknown",
        text: quotedType === "conversation" ? quoted.conversation : quotedType === "extendedTextMessage" ? quoted.extendedTextMessage?.text : quotedType === "imageMessage" ? quoted.imageMessage?.caption : quotedType === "videoMessage" ? quoted.videoMessage?.caption : "",
        key: quotedMsg.key,
        isVV: Boolean(quoted?.viewOnceMessageV2 || quoted?.viewOnceMessage || quoted?.imageMessage?.viewOnce || quoted?.videoMessage?.viewOnce),
        raw: quotedMsg,
        download: async () => {
          if (!quoted || !["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(quotedType)) {
            return null;
          }

          try {
            const buffer = await downloadMediaMessage(
              quotedMsg,
              "buffer",
              {},
              {
                reuploadRequest: Javix.updateMediaMessage,
              }
            );
            return buffer;
          } catch (error) {
            logger.logError(error, { context: "Media Download" });
            return null;
          }
        },
        forward: async (jid, options = {}) => {
          try {
            const forwardMsg = {
              key: quotedMsg.key,
              message: quotedMsg.message,
            };

            return await Javix.sendMessage(jid ?? m.jid ?? "", { forward: forwardMsg }, { quoted: options.quoted || null });
          } catch (error) {
            logger.logError(error, { context: "Message Forward" });
            return null;
          }
        },
      };
    }

    // Handle mentions
    m.mentions = content?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    m.mentions = m.mentions.map((jid) => jidNormalizedUser(jid));

    // Add message methods
    m.reply = async (text) => {
      return await Javix.sendMessage(m.key.remoteJid ?? "", { text }, { quoted: message });
    };

    m.send = async (text) => {
      return await Javix.sendMessage(m.key.remoteJid ?? "", { text });
    };

    m.react = async (emoji) => {
      return await Javix.sendMessage(m.jid ?? "", {
        react: {
          text: emoji,
          key: m.key,
        },
      });
    };

    // Add message flags
    m.hasMedia = ["imageMessage", "videoMessage", "documentMessage", "audioMessage", "stickerMessage"].includes(m.type);
    m.isQuoted = !!m.quoted;
    m.isForwarded = message.message?.extendedTextMessage?.contextInfo?.isForwarded || false;
    m.isEphemeral = message.message?.ephemeralMessage !== undefined;
    m.isViewOnce = message.message?.viewOnceMessage !== undefined;
    m.isPoll = message.message?.pollCreationMessage !== undefined || message.message?.pollUpdateMessage !== undefined;
    m.isReaction = m.type === "reactionMessage";
    m.isLocation = m.type === "locationMessage";
    m.isContact = m.type === "contactMessage";
    m.isButton = ["buttonsResponseMessage", "listResponseMessage", "templateButtonReplyMessage"].includes(m.type);
    m.isList = m.type === "listResponseMessage";
    m.isTemplate = m.type === "templateButtonReplyMessage";
    m.isProtocol = m.type === "protocolMessage";
    m.isSenderKeyDistribution = m.type === "senderKeyDistributionMessage";
    m.isDeviceSent = m.type === "deviceSentMessage";
    m.isDeviceSync = m.type === "deviceSyncMessage";
    m.isRevoked = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.REVOKE;
    m.isEdited = message.message?.editedMessage !== undefined;
    m.isDeleted = message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.REVOKE;
    m.isStatus = message.key.remoteJid === "status@broadcast";
    m.isBroadcast = message.key.remoteJid?.endsWith("@broadcast") || false;
    m.isNewsletter = message.key.remoteJid?.endsWith("@newsletter") || false;
    m.isChannel = message.key.remoteJid?.endsWith("@channel") || false;
    m.isBot = message.key.remoteJid?.endsWith("@bot") || false;
    m.isUser = !message.key.remoteJid?.endsWith("@g.us") && !message.key.remoteJid?.endsWith("@broadcast") && !message.key.remoteJid?.endsWith("@newsletter") && !message.key.remoteJid?.endsWith("@channel") && !message.key.remoteJid?.endsWith("@bot");

    // Handle owner check
    const botNumber = Javix.user.id.split("@")[0];
    m.isOwner = [botNumber, ...(config.ownerNumber || [])].includes(m.sender);

    // Group-related flags
    m.isAdmin = false; // This will be set by the handler
    m.isBotAdmin = false; // This will be set by the handler
    m.isGroupAdmin = false; // This will be set by the handler
    m.isGroupOwner = false; // This will be set by the handler
    m.isGroupCreator = false; // This will be set by the handler
    m.isGroupModerator = false; // This will be set by the handler
    m.isGroupParticipant = m.isGroup;
    m.isGroupMember = m.isGroup;
    m.isGroupInvite = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_INVITE;
    m.isGroupJoin = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_JOIN;
    m.isGroupLeave = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_LEAVE;
    m.isGroupUpdate = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_UPDATE;
    m.isGroupDelete = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_DELETE;
    m.isGroupCreate = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_CREATE;
    m.isGroupModify = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_MODIFY;
    m.isGroupParticipantAdd = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_ADD;
    m.isGroupParticipantRemove = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_REMOVE;
    m.isGroupParticipantPromote = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_PROMOTE;
    m.isGroupParticipantDemote = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_DEMOTE;
    m.isGroupParticipantUpdate = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_UPDATE;
    m.isGroupParticipantLeave = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_LEAVE;
    m.isGroupParticipantJoin = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_JOIN;
    m.isGroupParticipantDelete = m.type === "protocolMessage" && message.message?.protocolMessage?.type === proto.ProtocolMessage?.ProtocolMessageType?.GROUP_PARTICIPANT_DELETE;

    return m;
  } catch (error) {
    logger.logError(error, { context: "Message Serialization" });
    return null;
  }
};
