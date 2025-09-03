const controlCommand = {
  name: "control",
  aliases: ["botctl", "botcontrol"],
  description: "Owner-only bot process control: restart, shutdown, reload.",
  usage: `!control <restart|shutdown|reload>`,
  ownerOnly: true,
  run: async ({ Javix, jid, args, reply, isOwner }) => {
    if (!isOwner) {
      return reply("Only the bot owner can use this command.");
    }
    const sub = (args[0] || "").toLowerCase();
    if (["restart", "reboot", "reloadbot"].includes(sub)) {
      await reply("♻️ Restarting bot process...\nIf the bot does not come back online, please restart it manually.");
      setTimeout(() => process.exit(0), 1200);
      return;
    }
    if (["shutdown", "stopbot", "poweroff"].includes(sub)) {
      await reply("🛑 Shutting down bot process...\nYou will need to start it manually.");
      setTimeout(() => process.exit(1), 1200);
      return;
    }
    if (["reload", "reloadcmds", "reloadcommands"].includes(sub)) {
      try {
        if (typeof global.reloadCommands === "function") {
          await global.reloadCommands();
          await reply("🔄 Commands reloaded successfully!");
        } else if (Javix?.reloadCommands) {
          await Javix.reloadCommands();
          await reply("🔄 Commands reloaded successfully!");
        } else {
          await reply("⚠️ Live reload not supported in this build. Use !control restart instead.");
        }
      } catch (err) {
        console.error("Reload command error:", err);
        await reply("❌ Failed to reload commands. Please restart the bot.");
      }
      return;
    }
    // Help message
    await reply(`*Bot Control Commands (Owner Only)*\n\n` + `• !control restart — Restart the bot\n` + `• !control shutdown — Stop the bot\n` + `• !control reload — Reload commands (if supported)\n` + `\nAliases: reboot, reloadbot, stopbot, poweroff, reloadcmds, reloadcommands`);
  },
};

export default controlCommand;
