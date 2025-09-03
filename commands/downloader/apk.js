import { downloader } from "@nexoracle/api";
import { getRandom } from "@nexoracle/utils";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import axios from "axios";
import path from "path";
import config from "#config";

const apkCommand = {
  name: "apk",
  aliases: ["apkdl"],
  description: "Search and download Apps",
  usage: `${config.prefix}apk <app name>`,
  cooldown: 3000,
  minArgs: 1,
  requiredArgs: [{ name: "query", required: true }],

  run: async ({ args, reply, react, botPic, Javix, jid, messages: m, chat, botName, prefix }) => {
    const query = args.join(" ").trim();
    let filePath = null;

    if (!query) {
      return reply(`*Please provide a apk name to search.*\n\n*Usage:* ${prefix}apk <app name>`);
    }

    try {
      await react("🔍");
      const apk = await downloader.apk({ query }, true);

      if (!apk.name || !apk.dllink) {
        return reply(apk || "No APK found with that name.");
      }

      const cap = `*${botName} Apk Downloader*\n\n*Name:* ${apk.name}\n*Size:* ${apk.size}\n*Update:* ${apk.lastup}\n*Package:* ${apk.package}\n*Icon:* ${apk.icon}`;
      const tempDir = path.join(process.cwd(), "temp");

      const Message = {
        image: { url: apk.icon || botPic() },
        caption: cap,
      };
      await Javix.sendMessage(chat, Message, { quoted: m });

      const fileName = `${getRandom({ fileExtension: ".apk", attachFileExtension: true })}`;
      filePath = path.join(tempDir, fileName);

      try {
        const response = await axios({
          method: "GET",
          url: apk.dllink,
          responseType: "stream",
        });

        const writer = createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
          response.data.on("error", reject);
        });

        const fileBuffer = await fs.readFile(filePath);

        const document = {
          document: fileBuffer,
          caption: `*📦 Downloaded ${apk.name}*\n*📊 Size:* ${apk.size}`,
          fileName: `${apk.name}.apk`,
          mimetype: "application/vnd.android.package-archive",
        };

        await Javix.sendMessage(chat, document, { quoted: m });

        await fs.unlink(filePath);
        console.log("File deleted successfully");
        await react("✅");
      } catch (downloadError) {
        console.log("APK download/send error:", downloadError);

        if (filePath) {
          try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log("Cleaned up incomplete download");
          } catch (cleanupError) {}
        }

        await react("❌");
        reply("*❌ Failed to download or send the APK. Please try again.*");
      }
    } catch (error) {
      console.error("Error in APK command:", error);

      await react("❌");
      reply("*❌ An error occurred while searching for the APK.*");
    }
  },
};

export default apkCommand;
