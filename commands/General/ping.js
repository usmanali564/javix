const pingCommand = {
  name: "ping",
  aliases: ["latency", "speed"],
  description: "Check bot's response time",
  usage: "!ping",
  cooldown: 3000,
  minArgs: 0,
  maxArgs: 0,

  run: async ({ Javix, jid, messages, reply, edit }) => {
    try {
      const startTime = Date.now();

      const sentMsg = await reply("Pinging...");

      const responseTime = Date.now() - startTime;

      await edit(`🏓 *Pong!*\n\n*Response Time:* ${responseTime}ms`, sentMsg.key);
    } catch (error) {
      console.error("Error in ping command:", error);
      await reply("*Error checking ping*");
    }
  },
};

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export default pingCommand;
