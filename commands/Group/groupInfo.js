import { requireGroupPermissions } from "../../utils/groupChecks.js";

const groupInfoCommand = {
  name: "groupinfo",
  aliases: ["ginfo", "gi"],
  description: "View detailed information about the group",
  usage: "!groupinfo",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, messages: m, jid, groupMetadata } = ctx;
    if (!(await requireGroupPermissions(ctx))) return;
    try {
      await Javix.sendMessage(jid, { react: { text: "ℹ️", key: m.key } });

      const totalMembers = groupMetadata.participants.length;
      const admins = groupMetadata.participants.filter((p) => p.admin).length;
      const members = totalMembers - admins;

      const settings = await Javix.groupMetadata(jid);
      const isAnnounce = settings.announce ? "🔒 Admin Only" : "🔓 All Members";
      const isRestrict = settings.restrict ? "✅ Active" : "❌ Inactive";
      const welcomeEnabled = settings.welcome ? "✅ Active" : "❌ Inactive";

      const createdAt = new Date(settings.creation * 1000);
      const formattedDate = createdAt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const infoMessage =
        `*📊 Group Information*\n\n` +
        `*🏷️ Name:* ${groupMetadata.subject}\n` +
        `*🆔 ID:* ${jid}\n` +
        `*📅 Created:* ${formattedDate}\n` +
        `*👑 Owner:* @${settings.owner?.split("@")[0] || "Unknown"}\n\n` +
        `*👥 Members:*\n` +
        `• Total: ${totalMembers}\n` +
        `• Admins: ${admins}\n` +
        `• Regular: ${members}\n\n` +
        `*⚙️ Settings:*\n` +
        `• Messages: ${isAnnounce}\n` +
        `• Restrictions: ${isRestrict}\n` +
        `• Welcome: ${welcomeEnabled}\n\n` +
        `*📝 Description:*\n${groupMetadata.desc || "No description set"}`;

      await Javix.sendMessage(jid, {
        text: infoMessage,
        mentions: settings.owner ? [settings.owner] : [],
      }).catch(async (err) => {
        console.error("Group info error:", err);
        await Javix.sendMessage(jid, { text: "*Failed to fetch group info!* Please try again later." });
      });
    } catch (error) {
      console.error("Group info command error:", error);
      await Javix.sendMessage(jid, { text: "*An error occurred!* Please try again later." });
    }
  },
};

export default groupInfoCommand;
