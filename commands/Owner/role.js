import Role from "../../models/role.model.js";
import config from "#config";
import { extractTargetUserUniversal } from "../../utils/target.js";

export default {
  name: "role",
  aliases: ["roles", "addrole", "delrole", "removerole", "roleadd", "roledel"],
  description: "Manage user roles (Owner and Moderator)",
  usage: `${config.prefix}role [add/remove/list/info/owners/mods] [number/@user] [role] [name]`,
  category: "Owner",
  ownerOnly: true,
  cooldown: 5,

  run: async ({ Javix, message, args, reply, sender, isOwner, messages: m }) => {
    if (!isOwner) {
      return reply("*Owner Only!* This command is restricted to bot owners.");
    }

    const sessionId = Javix.user.id.split(":")[0];

    const [action, ...restArgs] = args;

    if (!action) {
      const menu =
        `*👑 Role Management*\n\n` +
        `*Commands:*\n` +
        `• \`${config.prefix}role add <number/@user/reply> <role> [name]\` - Add a role\n` +
        `• \`${config.prefix}role remove <number/@user/reply>\` - Remove a role\n` +
        `• \`${config.prefix}role list\` - List all roles\n` +
        `• \`${config.prefix}role info <number/@user/reply>\` - Show role info\n` +
        `• \`${config.prefix}role owners\` - List all owners\n` +
        `• \`${config.prefix}role mods\` - List all moderators\n\n` +
        `*Available Roles:*\n` +
        `• owner - Full access to all commands\n` +
        `• moderator - Access to moderator commands\n\n` +
        `*Shortcuts:*\n` +
        `• \`${config.prefix}addrole <number/@user/reply> <role> [name]\` - Quick add role\n` +
        `• \`${config.prefix}delrole <number/@user/reply>\` - Quick remove role`;

      return reply(menu);
    }

    try {
      switch (action.toLowerCase()) {
        case "add":
          return await handleRoleAdd({ Javix, message, args: restArgs, reply, sender, sessionId, m });

        case "remove":
        case "delete":
        case "del":
          return await handleRoleRemove({ Javix, message, args: restArgs, reply, sender, sessionId, m });

        case "list":
          return await handleRoleList({ reply, sessionId });

        case "info":
          return await handleRoleInfo({ Javix, message, args: restArgs, reply, sender, sessionId, m });

        case "owners":
        case "owner":
          return await handleRoleOwners({ reply, sessionId });

        case "mods":
        case "moderators":
        case "moderator":
          return await handleRoleMods({ reply, sessionId });

        default:
          return reply(`*Invalid Action*\nUse \`${config.prefix}role\` to see available commands.`);
      }
    } catch (error) {
      console.error("Role command error:", error);
      return reply("*An error occurred while managing roles!*");
    }
  },
};

// Handle role add
async function handleRoleAdd({ Javix, message, args, reply, sender, sessionId, m }) {
  const { targetNumber, targetJid } = extractTargetUserUniversal({ m, args, message });

  if (!targetJid) {
    return reply(`*Invalid Usage*\nUse: \`${config.prefix}role add <number/@user/reply> <role> [name]\``);
  }

  const commandArgs = m.quoted?.sender ? args : args.slice(1);
  const roleType = commandArgs[0];
  const name = commandArgs.slice(1).join(" ");

  if (!roleType || !["owner", "moderator"].includes(roleType.toLowerCase())) {
    return reply(`*Invalid Role!*\nAvailable roles: owner, moderator\n\n*Usage:* \`${config.prefix}role add <target> <role>\``);
  }

  try {
    let userRole;
    if (roleType.toLowerCase() === "moderator") {
      userRole = await Role.addModerator(sessionId, targetJid, targetNumber, sender);
    } else {
      userRole = await Role.addAdmin(sessionId, targetJid, targetNumber, sender);
    }

    return reply(`✅ *Role Added*\n\n` + `*Number:* ${userRole.number}\n` + `*Role:* ${userRole.role.toUpperCase()}\n` + `*Added By:* ${userRole.addedBy}\n` + `*Added At:* ${new Date(userRole.addedAt).toLocaleString()}`);
  } catch (error) {
    if (error.message === "User already has a role in this session") {
      return reply("*User already has a role!*");
    }
    throw error;
  }
}

// Handle role remove
async function handleRoleRemove({ Javix, message, args, reply, sender, sessionId, m }) {
  const { targetNumber, targetJid } = extractTargetUserUniversal({ m, args, message });

  if (!targetJid) {
    return reply(`*Invalid Usage*\nUse: \`${config.prefix}role remove <number/@user/reply>\``);
  }

  const removed = await Role.removeRole(sessionId, targetJid);
  if (removed) {
    return reply(`✅ *Role Removed*\nNumber: ${targetNumber}`);
  } else {
    return reply("*User not found or has no role!*");
  }
}

// Handle role list
async function handleRoleList({ reply, sessionId }) {
  const { roles } = await Role.getAllRoles(sessionId);
  if (!roles.length) {
    return reply("*No roles found!*");
  }

  const list = `*📋 Role List*\n\n` + roles.map((r, i) => `${i + 1}. *${r.number}*\n` + `   Role: ${r.role.toUpperCase()}\n` + `   Added: ${new Date(r.addedAt).toLocaleString()}`).join("\n\n");

  return reply(list);
}

// Handle role info
async function handleRoleInfo({ Javix, message, args, reply, sender, sessionId, m }) {
  const { targetNumber, targetJid } = extractTargetUserUniversal({ m, args, message });

  if (!targetJid) {
    return reply(`*Invalid Usage*\nUse: \`${config.prefix}role info <number/@user/reply>\``);
  }

  const userRole = await Role.getRoleInfo(sessionId, targetJid);
  if (!userRole) {
    return reply("*User not found!*");
  }

  const info =
    `*👤 Role Info*\n\n` +
    `*Number:* ${userRole.number}\n` +
    `*Role:* ${userRole.role.toUpperCase()}\n` +
    `*Added By:* ${userRole.addedBy}\n` +
    `*Added At:* ${new Date(userRole.addedAt).toLocaleString()}\n` +
    `*Status:* ${userRole.isActive ? "✅ Active" : "❌ Inactive"}\n` +
    `*Permissions:*\n` +
    Object.entries(userRole.permissions)
      .map(([perm, value]) => `• ${perm}: ${value ? "✅" : "❌"}`)
      .join("\n");

  return reply(info);
}

// Handle role owners
async function handleRoleOwners({ reply, sessionId }) {
  const owners = await Role.getAllAdmins(sessionId);
  if (!owners.length) {
    return reply("*No owners found!*");
  }

  const ownersList = `*👑 Owner List*\n\n` + owners.map((o, i) => `${i + 1}. *${o.number}*\n` + `   Added: ${new Date(o.addedAt).toLocaleString()}`).join("\n\n");

  return reply(ownersList);
}

// Handle role moderators
async function handleRoleMods({ reply, sessionId }) {
  const mods = await Role.getAllModerators(sessionId);
  if (!mods.length) {
    return reply("*No moderators found!*");
  }

  const modsList = `*🛡️ Moderator List*\n\n` + mods.map((m, i) => `${i + 1}. *${m.number}*\n` + `   Added: ${new Date(m.addedAt).toLocaleString()}`).join("\n\n");

  return reply(modsList);
}
