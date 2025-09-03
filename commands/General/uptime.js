import config from "#config";

const uptimeCommand = {
  name: "uptime",
  aliases: ["runtime"],
  description: "Show bot's uptime",
  usage: "!uptime",
  cooldown: 3000,

  run: async ({ Javix, jid, messages }) => {
    try {
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      const message = `🤖 *Uptime of ${config.botName}:*\n\n` + `📅 ${days} days\n` + `⏰ ${hours} hours\n` + `⏳ ${minutes} minutes\n` + `⌛ ${seconds} seconds`;

      await Javix.sendMessage(jid, { text: message }, { quoted: messages });
    } catch (error) {
      console.error("Uptime command error:", error);
      await Javix.sendMessage(jid, { text: "*Failed to get uptime!*" }, { quoted: messages });
    }
  },
};

export default uptimeCommand;
