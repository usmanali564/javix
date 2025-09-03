const setCooldownCommand = {
  name: "cooldown",
  aliases: ["cd"],
  description: "Dynamically update cooldown for a specific command. Owner only.",
  usage: "!setcooldown <command> <milliseconds>",
  run: async ({ Javix, message, args, senderNumber, config, m }) => {
    const isOwner = config.ownerNumber?.includes(senderNumber);
    if (!isOwner) {
      await Javix.sendMessage(m.key.remoteJid, { text: "Only the bot owner can update cooldowns." }, { quoted: m });
      return;
    }

    const [cmdName, cdValue] = args;
    if (!cmdName || isNaN(cdValue)) {
      await Javix.sendMessage(
        m.key.remoteJid,
        {
          text: `❗ Usage: *${config.prefix}setcooldown <command> <milliseconds>*\nExample: *${config.prefix}setcooldown ping 5000*`,
        },
        { quoted: m }
      );
      return;
    }

    const targetCommand = global.commands.get(cmdName.toLowerCase()) || [...global.commands.values()].find((cmd) => cmd.aliases?.includes(cmdName.toLowerCase()));

    if (!targetCommand) {
      await Javix.sendMessage(
        m.key.remoteJid,
        {
          text: `Command not found: *${cmdName}*`,
        },
        { quoted: m }
      );
      return;
    }

    targetCommand.cooldown = parseInt(cdValue);
    await Javix.sendMessage(
      m.key.remoteJid,
      {
        text: `✅ Cooldown for *${targetCommand.name}* updated to *${cdValue}ms*!`,
      },
      { quoted: m }
    );
  },
};

export default setCooldownCommand;
