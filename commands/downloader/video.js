import axios from "axios";
import config from "#config"

const videoCommand = {
  name: "video",
  aliases: ["ytvideo", "ytv"],
  description: "Search and download YouTube videos",
  usage: "!video <video name> [360/480/720/1080]",
  cooldown: 5000,
  minArgs: 1,
  requiredArgs: [{ name: "query", required: true }],

  run: async ({ args, reply, react, utils, senderName, isSelf, Javix, jid, messages }) => {
    const query = args.slice(0, -1).join(" ").trim();
    const format = args[args.length - 1]?.toLowerCase() || "720";

    if (!query) {
      return reply(`*Please provide a video name to search.*\n\n*Usage:* ${config.prefix}video <video name> [360/480/720/1080]`);
    }

    const validFormats = ["360", "480", "720", "1080"];
    if (!validFormats.includes(format)) {
      return reply("*Invalid format. Please use one of: 360, 480, 720, 1080*");
    }

    try {
      await react("🔍");

      const apiBaseUrl = `${config.apiBaseUrl}`;

      const apiUrl = `${apiBaseUrl.replace(/\/$/, "")}/dl/yt`;
      console.log(`Making request to: ${apiUrl}`);

      const { data } = await axios.get(apiUrl, {
        params: {
          query,
          format,
        },
        timeout: 60000,
        validateStatus: (status) => status < 500,
      });

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to process request");
      }

      await react("✨");

      await Javix.sendMessage(jid, {
        video: { url: data.download.downloadUrl },
        caption: `*🎥 ${data.video.title}*\n*Duration:* ${data.video.duration}\n*Format:* ${format}p`,
        quoted: messages,
      });
    } catch (error) {
      await react("❌");
      console.error("Video command error:", error.message);
      return reply("*Error:* Failed to process your request. Please try again later.");
    }
  },
};

export default videoCommand;
