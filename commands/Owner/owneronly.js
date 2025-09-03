const owneronlyCommand = {
  name: "owneronly",
  aliases: ["owner", "adminonly"],
  description: "Toggle owner-only mode for commands",
  usage: "!owneronly",
  cooldown: 5000,

  run: async ({ Javix, jid, reply, sender, isOwner, isSelf }) => {
    if (!isOwner && !isSelf) {
      return reply("*This command can only be used by the bot owner!*");
    }

    try {
      global.ownerOnly = !global.ownerOnly;

      const message = `🔒 *Owner-Only Mode*\n\n` + `Status: ${global.ownerOnly ? "✅ Enabled" : "❌ Disabled"}\n` + `Commands will ${global.ownerOnly ? "only" : "not"} be restricted to owner.`;

      await Javix.sendMessage(jid, { text: message });
    } catch (error) {
      console.error("Owneronly command error:", error);
      await reply("*Failed to toggle owner-only mode!*");
    }
  },
};

export default owneronlyCommand;
