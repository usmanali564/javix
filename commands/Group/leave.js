const leaveCommand = {
  name: "leave",
  aliases: ["leavegroup", "exit"],
  description: "Leave the current group (owner/self only)",
  usage: "!leave",
  cooldown: 10000,
  ownerOnly: true,

  run: async ({ Javix, messages: m, jid, isOwner, isSelf, isGroup, react }) => {
    if (!isGroup) {
      (await react) && react("❌");
      return await Javix.sendMessage(
        jid,
        {
          text: "*This command can only be used in groups!*",
        },
        { quoted: m }
      );
    }
    if (!isOwner && !isSelf) {
      (await react) && react("❌");
      return await Javix.sendMessage(
        jid,
        {
          text: "*Access Denied!* Only the bot owner can use this command.",
        },
        { quoted: m }
      );
    }
    try {
      (await react) && react("🫡");
      await Javix.sendMessage(
        jid,
        {
          text: "👋 Leaving the group...",
        },
        { quoted: m }
      );
      await Javix.groupLeave(jid);
      (await react) && react("✅");
    } catch (error) {
      (await react) && react("❌");
      await Javix.sendMessage(
        jid,
        {
          text: "*Failed to leave the group!*",
        },
        { quoted: m }
      );
    }
  },
};

export default leaveCommand;
