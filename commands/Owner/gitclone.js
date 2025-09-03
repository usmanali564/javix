import { exec } from "child_process";
import { promisify } from "util";
import config from "#config";

const execAsync = promisify(exec);

const gitCloneCommand = {
  name: "gitclone",
  aliases: ["githubdl", "gitdownload"],
  description: "Download a GitHub repository as ZIP",
  usage: "!gitclone <github-repo-url>",
  cooldown: 5000,
  minArgs: 1,
  maxArgs: 1,

  run: async ({ Javix, jid, message, args, reply, react }) => {
    try {
      if (!args[0]) {
        return reply(`Usage: !gitclone <github-repo-url>`);
      }

      if (!args[0].includes("github.com")) {
        return reply(`Invalid or non-GitHub repository link provided. Please use a valid GitHub repository link.`);
      }

      await react("⏳");

      let splitURL = args[0].split("github.com/");
      if (splitURL.length < 2) {
        throw new Error("Invalid GitHub URL");
      }

      let [githubUser, githubRepo] = splitURL[1].split("/");
      githubRepo = githubRepo.replace(".git", "");

      let gitZipUrl = `https://api.github.com/repos/${githubUser}/${githubRepo}/zipball`;

      await reply(`Please wait, downloading repository...`);

      await Javix.sendMessage(jid, {
        document: {
          url: gitZipUrl,
        },
        fileName: `${githubRepo}.zip`,
        mimetype: "application/zip",
      });

      await react("✅");
    } catch (error) {
      console.error("Error in gitclone command:", error);
      await react("❌");
      await reply(`Failed to fetch the repository contents. Please ensure the GitHub link is correct and accessible. Use the format: 'https://github.com/username/repository'`);
    }
  },
};

export default gitCloneCommand;
