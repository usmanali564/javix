import config from "#config";
import { fetchApi } from "@nexoracle/api";
import { formatJSON } from "@nexoracle/utils";
import { urlValidator, formatBytes } from "@nexoracle/utils";

const faceBookCommand = {
  name: "facebook",
  aliases: ["fb", "fbdl"],
  description: "Download Facebook video by URL.",
  usage: config.prefix + "fb <facedbook_video_url>",
  cooldown: 5000,

  run: async ({ Javix, reply, messages: m, args, jid, botPic, react, botName }) => {
    const url = args[0];

    if (!url) {
      return reply(`Usage: ${config.prefix}fb <facebook video URL>`);
    }

    if (!urlValidator.isURL(url) || (!url.includes("facebook") && !url.includes("fb"))) {
      return reply("Invalid Facebook URL. Please provide a valid Facebook link.");
    }

    await react("⏳");

    const fb = await fetchApi.json(`${config.nex_api}/downloader/facebook`, { apikey: config.nex_key, url }, true);
    if (!fb.sd || !fb.hd) {
      return reply("Failed to fetch download link. The video might be private or invalid.");
    }

    const caption = `*${botName} Facebook Downloader*\n\n*Title:* ${fb.title || "N/A"}\n *Desc:* ${fb.desc || "N/A"}`;

    await Javix.sendMessage(jid, { video: { url: fb.hd ? fb.hd : fb.sd }, caption }, { quoted: m });
  },
};

const twitterCommand = {
  name: "twitter",
  aliases: ["xdl"],
  description: "Download X (Twitter) video by URL.",
  usage: config.prefix + "xdl <x_video_url>",
  cooldown: 5000,

  run: async ({ Javix, reply, messages: m, args, jid, botPic, react, botName }) => {
    const url = args[0];

    if (!url) {
      return reply(`Usage: ${config.prefix}xdl <x video URL>`);
    }

    if (!urlValidator.twitter(url)) {
      return reply("Invalid Twitter URL. Please provide a valid Twitter link.");
    }

    await react("⏳");

    const twitter = await fetchApi.json(`${config.nex_api}/downloader/twitter`, { apikey: config.nex_key, url }, true);
    if (!twitter.video) {
      return reply("Failed to fetch download link. The video might be private or invalid.");
    }

    await Javix.sendMessage(jid, { video: { url: twitter.video }, caption: config.caption }, { quoted: m });
  },
};

const tiktokCommand = {
  name: "tiktok",
  aliases: ["tt", "ttdl"],
  description: "Download Tiktok videos by URL.",
  usage: config.prefix + "tt <tiktok_video_url>",
  cooldown: 5000,

  run: async ({ Javix, reply, messages: m, args, jid, botPic, react, botName }) => {
    const url = args[0];

    if (!url) {
      return reply(`Usage: ${config.prefix}tt <tiktok video URL>`);
    }

    if (!urlValidator.tiktok(url)) {
      return reply("Invalid Tiktok URL. Please provide a valid Tiktok link.");
    }

    await react("⏳");

    const tt = await fetchApi.json(`${config.nex_api}/downloader/tiktok-nowm`, { apikey: config.nex_key, url }, true);
    if (!tt.url) {
      return reply("Failed to fetch download link. The video might be private or invalid.");
    }

    const caption = `*${botName} Tiktok Downloader*\n
*Title:* ${tt.title || "N/A"}
*Duration:* ${tt.duration + " sec" || "N/A"}
*Username:* ${tt.author.username || "N/A"}
*Nickname:* ${tt.author.nickname || "N/A"}
*Size:* ${formatBytes(tt?.metrics?.size) || "N/A"}
*Plays:* ${tt.metrics.play_count || "N/A"}
*Likes:* ${tt.metrics.digg_count || "N/A"}
*Comment:* ${tt.metrics.comment_count || "N/A"}
*Shares:* ${tt.metrics.share_count || "N/A"}
*Downloads:* ${tt.metrics.download_count || "N/A"}`;

    await Javix.sendMessage(jid, { video: { url: tt.url }, caption }, { quoted: m });
  },
};

const instaCommand = {
  name: "instagram",
  aliases: ["insta", "ig"],
  description: "Download Insta videos by URL.",
  usage: config.prefix + "ig insta_video_url>",
  cooldown: 5000,

  run: async ({ Javix, reply, messages: m, args, jid, botPic, react, botName }) => {
    const url = args[0];

    if (!url) {
      return reply(`Usage: ${config.prefix}ig <insta video URL>`);
    }

    if (!urlValidator.instagram(url)) {
      return reply("Invalid Instagram URL. Please provide a valid Instagram link.");
    }

    await react("⏳");

    const ig = await fetchApi.json(`${config.nex_api}/downloader/insta`, { apikey: config.nex_key, url }, true);
    if (!ig || !ig.url_list || !ig.url_list[0]) {
      return reply("Failed to fetch download link. The video might be private or invalid.");
    }

    const caption = `*${botName} Instagram Downloader*\n
*Title:* ${ig.post_info?.caption || "N/A"}
*Username:* ${ig.post_info?.owner_userame || "N/A"}
*Nickname:* ${ig.post_info?.full_name || "N/A"}
*Views:* ${ig.media_details[0]?.video_view_count || "N/A"}
*Likes:* ${ig.post_info?.likes || "N/A"}
`;

    await Javix.sendMessage(jid, { video: { url: ig.url_list[0] }, caption }, { quoted: m });
  },
};

export { faceBookCommand, twitterCommand, tiktokCommand, instaCommand };
