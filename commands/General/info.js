import os from "os";

const infoCommand = {
  name: "info",
  description: "Show bot system info.",
  aliases: ["status", "sys"],
  usage: "!info",
  cooldown: 3000,

  run: async ({ Javix, jid, key, reply }) => {
    try {
      const uptime = process.uptime();
      const formatTime = (s) => {
        const days = Math.floor(s / 86400);
        const hours = Math.floor((s % 86400) / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const seconds = Math.floor(s % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      };

      const infoText =
        `🤖 *Bot System Information*\n\n` +
        `⏱️ *Uptime:* ${formatTime(uptime)}\n` +
        `💻 *Platform:* ${os.platform()} ${os.release()}\n` +
        `🔄 *Node.js:* ${process.version}\n` +
        `💾 *Memory:*\n` +
        `  • Total: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `  • Free: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `  • Used: ${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `🖥️ *CPU:* ${os.cpus()[0].model}\n` +
        `📊 *CPU Cores:* ${os.cpus().length}\n` +
        `🏠 *Home Directory:* ${os.homedir()}\n\n` +
        `⏰ *Last Updated:* ${new Date().toLocaleString()}`;

      await reply(infoText);
    } catch (error) {
      console.error("Info command error:", error);
      await reply("*Failed to get system information!*");
    }
  },
};

export default infoCommand;
