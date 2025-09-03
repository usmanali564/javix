const dateCommand = {
  name: "date",
  aliases: ["time", "calendar"],
  description: "Show current date and time",
  usage: "!date",
  cooldown: 3000,

  run: async ({ Javix, jid, reply }) => {
    try {
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      };

      const dateStr = now.toLocaleDateString("en-US", options);
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });

      const message = `📅 *Date & Time*\n\n` + `📆 *Date:* ${dateStr}\n` + `⏰ *Time:* ${timeStr}\n` + `🌍 *Timezone:* ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

      await Javix.sendMessage(jid, { text: message });
    } catch (error) {
      console.error("Date command error:", error);
      await reply("*Failed to get date and time!*");
    }
  },
};

export default dateCommand;
