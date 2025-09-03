import { messages } from "./messages.js";
import config from "#config";

export async function validateGroupCommandPermissions({ Javix, jid, message, isGroup, isAdmin, isBotAdmin, groupMetadata, targetUser, commandType, sender }) {
  try {
    // console.log("Validating group permissions:", {
    //   commandType,
    //   isGroup,
    //   isAdmin,
    //   isBotAdmin,
    //   targetUser,
    //   sender,
    //   groupId: jid,
    // });

    if (!isGroup) {
      console.log("Failed: Not a group chat");
      await Javix.sendMessage(jid, {
        text: "*This command can only be used in groups!*",
      });
      return false;
    }

    if (!groupMetadata || !groupMetadata.participants) {
      console.log("Failed: Invalid group metadata");
      await Javix.sendMessage(jid, {
        text: "*Error: Could not fetch group information!*",
      });
      return false;
    }

    const userParticipant = groupMetadata.participants.find((p) => p.id === sender);
    const isUserAdmin = userParticipant?.admin === "admin" || userParticipant?.admin === "superadmin";
    const isUserOwner = userParticipant?.admin === "superadmin";

    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);

    const senderNumber = sender.split("@")[0];
    const isBotOwner = ownerNumbers.some((ownerNum) => ownerNum === senderNumber || ownerNum === sender.split("@")[0]);

    if (["promote", "demote", "kick", "tagall", "hidetag", "mute", "unmute"].includes(commandType)) {
      const botId = Javix.user.id;
      const bareBotId = botId.includes(":") ? botId.split(":")[0] + "@s.whatsapp.net" : botId;
      const botParticipant = groupMetadata.participants.find((p) => p.id === bareBotId);
      const isBotAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

      if (!isBotAdmin && !isBotOwner) {
        console.log("Failed: Bot is not admin and user is not bot owner", {
          botId,
          botParticipant,
          isBotAdmin,
          isBotOwner,
        });
        await Javix.sendMessage(jid, {
          text: "*I need to be an admin to perform this action!*",
        });
        return false;
      }
    }

    if (commandType === "promote") {
      if (!isUserAdmin && !isBotOwner) {
        console.log("Failed: User is not admin or bot owner", {
          sender,
          userParticipant,
          isUserAdmin,
          isBotOwner,
        });
        await Javix.sendMessage(jid, {
          text: "*You need to be an admin or bot owner to use this command!*",
        });
        return false;
      }

      if (targetUser) {
        const targetParticipant = groupMetadata.participants.find((p) => p.id === targetUser);
        const isTargetAdmin = targetParticipant?.admin === "admin" || targetParticipant?.admin === "superadmin";

        if (isTargetAdmin) {
          console.log("Failed: Target is already admin", {
            targetUser,
            targetParticipant,
            isTargetAdmin,
          });
          await Javix.sendMessage(jid, {
            text: "*This user is already an admin!*",
          });
          return false;
        }
      }
    }

    if (commandType === "demote") {
      if (!isUserOwner && !isBotOwner) {
        console.log("Failed: User is not owner or bot owner", {
          sender,
          userParticipant,
          isUserOwner,
          isBotOwner,
        });
        await Javix.sendMessage(jid, {
          text: "*Only the group owner or bot owner can demote admins!*",
        });
        return false;
      }

      if (targetUser) {
        const targetParticipant = groupMetadata.participants.find((p) => p.id === targetUser);
        const isTargetAdmin = targetParticipant?.admin === "admin" || targetParticipant?.admin === "superadmin";

        if (!isTargetAdmin) {
          console.log("Failed: Target is not admin", {
            targetUser,
            targetParticipant,
            isTargetAdmin,
          });
          await Javix.sendMessage(jid, {
            text: "*Target user is not an admin!*",
          });
          return false;
        }

        if (targetParticipant.admin === "superadmin") {
          console.log("Failed: Cannot demote owner", {
            targetUser,
            targetParticipant,
          });
          await Javix.sendMessage(jid, {
            text: "*Cannot demote the group owner!*",
          });
          return false;
        }
      }
    }

    if (!targetUser) {
      console.log("No target user needed, proceeding");
      return true;
    }

    const targetParticipant = groupMetadata.participants.find((p) => p.id === targetUser);
    if (!targetParticipant) {
      console.log("Failed: Target not in group", {
        targetUser,
        groupParticipants: groupMetadata.participants.map((p) => ({ id: p.id, admin: p.admin })),
      });
      await Javix.sendMessage(jid, {
        text: "*The target user is not in this group!*",
      });
      return false;
    }

    if (targetUser === sender) {
      console.log("Failed: Self-action attempt", {
        targetUser,
        sender,
      });
      await Javix.sendMessage(jid, {
        text: "*You cannot perform this action on yourself!*",
      });
      return false;
    }

    if (targetParticipant.admin === "superadmin") {
      console.log("Failed: Action on group owner", {
        targetUser,
        targetParticipant,
      });
      await Javix.sendMessage(jid, {
        text: "*You cannot perform this action on the group owner!*",
      });
      return false;
    }

    console.log("Target extraction for debugging", {
      targetUser,
      targetParticipant: {
        id: targetParticipant.id,
        admin: targetParticipant.admin,
      },
    });

    // console.log("Permission validation successful");
    return true;
  } catch (error) {
    console.error("Permission validation error:", {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    await Javix.sendMessage(jid, {
      text: "*An error occurred while validating permissions!*",
    });
    return false;
  }
}

async function isBotOwnerCheck(sender) {
  try {
    const senderNumber = sender.split("@")[0];
    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber].filter(Boolean);

    return ownerNumbers.some((ownerNum) => ownerNum === senderNumber || ownerNum === sender.split("@")[0]);
  } catch (error) {
    console.error("Owner check error:", error);
    return false;
  }
}
