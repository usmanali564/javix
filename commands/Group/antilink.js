import AntiLink from "../../models/antilink.model.js";

const antilinkCommand = {
  name: "antilink",
  aliases: ["antilinks", "linkguard"],
  description: "Manage anti-link protection in groups",
  usage: "antilink <on/off/delete/kick/warn/status/add/remove/list>",
  groupOnly: true,
  adminOnly: true,
  ownerOnly: true,
  cooldown: 3000,

  run: async ({ Javix, jid, reply, args, isAdmins, isOwner, prefix }) => {
    if (!isAdmins && !isOwner) {
      return reply("❌ *Permission Denied*\nOnly admins can manage anti-link settings.");
    }

    const action = args[0]?.toLowerCase();
    const linkToModify = args[1]?.toLowerCase();

    try {
      const sessionId = Javix.user?.id ? Javix.user.id.split(":")[0] : "default";
      let antiLinkSettings = await AntiLink.getGroupSettings(sessionId, jid);

      if (!action || action === "status") {
        const status = antiLinkSettings.enabled ? `✅ *Enabled* (Mode: ${antiLinkSettings.mode})` : `❌ *Disabled*`;

        const stats = antiLinkSettings.stats
          ? `
📊 *Statistics:*
• Links Deleted: ${antiLinkSettings.stats.linksDeleted || 0}
• Users Kicked: ${antiLinkSettings.stats.usersKicked || 0}
• Warnings Sent: ${antiLinkSettings.stats.warningsSent || 0}
        `
          : "";

        const customPatterns = antiLinkSettings.linkPatterns?.filter((pattern) => !["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"].includes(pattern)) || [];

        const customPatternsText = customPatterns.length > 0 ? `\n🔗 *Custom Blocked Patterns:*\n${customPatterns.map((p) => `• ${p}`).join("\n")}` : "";

        return reply(`🔗 *AntiLink Settings*\n\nStatus: ${status}${stats}${customPatternsText}\n\n*Usage:*\n• ${prefix}antilink on/off - Enable/disable\n• ${prefix}antilink delete/kick/warn - Set mode\n• ${prefix}antilink add <link> - Add custom pattern\n• ${prefix}antilink remove <link> - Remove custom pattern\n• ${prefix}antilink list - Show custom patterns`);
      }

      switch (action) {
        case "on":
        case "enable":
          await AntiLink.updateSettings(sessionId, jid, { enabled: true });
          return reply("✅ *AntiLink Enabled*\nLinks will now be automatically monitored and action taken.");

        case "off":
        case "disable":
          await AntiLink.updateSettings(sessionId, jid, { enabled: false });
          return reply("❌ *AntiLink Disabled*\nLink monitoring has been turned off.");

        case "delete":
          await AntiLink.updateSettings(sessionId, jid, { enabled: true, mode: "delete" });
          return reply("🗑️ *Mode Set to Delete*\nLinks will be automatically deleted.");

        case "kick":
          await AntiLink.updateSettings(sessionId, jid, { enabled: true, mode: "kick" });
          return reply("👢 *Mode Set to Kick*\nLink senders will be kicked from the group.");

        case "warn":
          await AntiLink.updateSettings(sessionId, jid, { enabled: true, mode: "warn" });
          return reply("⚠️ *Mode Set to Warn*\nLink senders will receive warnings.");

        case "add":
          if (!linkToModify) {
            return reply("❌ *Please provide a link pattern to add*\nExample: `.antilink add example.com`");
          }

          if (antiLinkSettings.linkPatterns.includes(linkToModify)) {
            return reply(`❌ *Pattern already exists*\n"${linkToModify}" is already in the blocked list.`);
          }

          const updatedPatternsAdd = [...antiLinkSettings.linkPatterns, linkToModify];
          await AntiLink.updateSettings(sessionId, jid, { linkPatterns: updatedPatternsAdd });
          return reply(`✅ *Pattern Added*\n"${linkToModify}" will now be blocked.`);

        case "remove":
          if (!linkToModify) {
            return reply("❌ *Please provide a link pattern to remove*\nExample: `.antilink remove example.com`");
          }

          if (!antiLinkSettings.linkPatterns.includes(linkToModify)) {
            return reply(`❌ *Pattern not found*\n"${linkToModify}" is not in the blocked list.`);
          }

          const defaultPatterns = ["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"];

          const updatedPatternsRemove = antiLinkSettings.linkPatterns.filter((pattern) => pattern !== linkToModify || defaultPatterns.includes(pattern));

          await AntiLink.updateSettings(sessionId, jid, { linkPatterns: updatedPatternsRemove });
          return reply(`✅ *Pattern Removed*\n"${linkToModify}" will no longer be blocked.`);

        case "list":
          const customPatterns = antiLinkSettings.linkPatterns?.filter((pattern) => !["https://", "http://", "www.", ".com", ".net", ".org", ".io", "youtube.com", "youtu.be", "instagram.com", "fb.com", "facebook.com", "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "chat.whatsapp.com", "telegram.me", "t.me", "discord.gg"].includes(pattern)) || [];

          if (customPatterns.length === 0) {
            return reply("📝 *No custom patterns*\nUse `.antilink add <pattern>` to add custom patterns.");
          }

          return reply(`🔗 *Custom Blocked Patterns:*\n${customPatterns.map((p) => `• ${p}`).join("\n")}`);

        default:
          return reply("❌ *Invalid Option*\nUse: on, off, delete, kick, warn, add, remove, list");
      }
    } catch (error) {
      console.error("Anti-link command error:", error);
      return reply("❌ *Error processing anti-link command*\nPlease try again.");
    }
  },
};

export { antilinkCommand };
