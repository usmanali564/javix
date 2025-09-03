import { formatISODate } from "@nexoracle/utils";
import githubstalk from "../../lib/scrape/githubstalk.js";
import axios from "axios";

const githubCommand = {
  name: "github",
  aliases: ["gitstalk", "ghstalk"],
  description: "Get GitHub user information",
  usage: "!github <username>",
  cooldown: 5000,
  minArgs: 1,
  maxArgs: 1,

  run: async ({ Javix, jid, args, reply, react, prefix }) => {
    try {
      const username = args[0];
      if (!username) {
        return reply(`Please provide a GitHub username.\nExample: *${prefix}github maherxubair*`);
      }

      await react("🔍");

      const gitdata = await githubstalk(username);

      const response =
        `*ㅤㅤㅤ|ㅤㅤㅤGithub Info ㅤㅤㅤ|*\n\n` +
        `🚩 *Id:* ${gitdata.id}\n` +
        `🔖 *Nickname:* ${gitdata.nickname}\n` +
        `🔖 *Username:* ${gitdata.username}\n` +
        `✨ *Bio:* ${gitdata.bio}\n` +
        `🏢 *Company:* ${gitdata.company}\n` +
        `📍 *Location:* ${gitdata.location}\n` +
        `📧 *Email:* ${gitdata.email}\n` +
        `🔓 *Public Repo:* ${gitdata.public_repo}\n` +
        `🔐 *Public Gists:* ${gitdata.public_gists}\n` +
        `💕 *Followers:* ${gitdata.followers}\n` +
        `👉 *Following:* ${gitdata.following}`;

      await Javix.sendMessage(jid, {
        image: { url: gitdata.profile_pic },
        caption: response,
      });
    } catch (error) {
      console.error("Error in github command:", error);
      await reply("*Error fetching GitHub information*\nPlease check if the username is valid and try again.");
    }
  },
};

const githubRepoCommand = {
  name: "gitrepo",
  aliases: ["githubrepo"],
  description: "Get GitHub repository information",
  usage: "gitrepo <repo_name>",
  cooldown: 5000,

  run: async ({ Javix, jid, messages, query, reply, react, prefix, botPic }) => {
    try {
      if (!query) {
        return reply(`Please provide a GitHub username.\nExample: *${prefix}gitrepo nexoracle/utils*`);
      }

      await react("🔍");

      const data = await axios.get(`https://api.github.com/repos/${query.replace(/^https?:\/\/github\.com\//, "")}`);
      const result = data.data;

      if (data.status !== 200) {
        return await reply("An error occured, please try again later");
      }

      let info = "";

      info += `*_Repo Name:_* _${result.name || "N/A"}_`;
      info += `\n*_Full Name:_* _${result.full_name || "N/A"}_`;
      info += `\n*_Owner:_* _${result.owner.login || "N/A"}_`;
      info += `\n*_Description:_* _${result.description || "N/A"}_`;
      info += `\n*_Stars:_* _${result.stargazers_count || "0"}_`;
      info += `\n*_Forks:_* _${result.forks_count || "0"}_`;
      info += `\n*_Issues:_* _${result.open_issues || "0"}_`;
      info += `\n*_Watchers:_* _${result.watchers_count || "0"}_`;
      info += `\n*_Language:_* _${result.language || "N/A"}_`;
      info += `\n*_License_* _${result.license?.name || "N/A"}_`;

      info += `\n\n*_Created At_*`;
      info += `\n   *_Date:_* _${formatISODate(result.created_at).split(",")[0] || "N/A"}_`;
      info += `\n   *_Time:_* _${formatISODate(result.created_at).split(",")[1].trim() || "N/A"}_`;

      info += `\n*_Updated At_*`;
      info += `\n   *_Date:_* _${formatISODate(result.updated_at).split(",")[0] || "N/A"}_`;
      info += `\n   *_Time:_* _${formatISODate(result.updated_at).split(",")[1].trim() || "N/A"}_`;

      info += `\n\n*_Links_*`;
      info += `\n   *_Homepage:_* _${result.homepage || "N/A"}_`;
      info += `\n   *_GitHub:_* _${result.html_url || "N/A"}_`;

      const img = result.owner.avatar_url;

      await Javix.sendMessage(jid, { image: { url: img || botPic() }, caption: info }, { quoted: messages });
    } catch (error) {
      console.error("Error in github command:", error);
      await reply("*Error fetching GitHub information*\nPlease check if the repo name is valid and try again.");
    }
  },
};

export { githubCommand, githubRepoCommand };
