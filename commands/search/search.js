import config from "#config";
import { fetchApi } from "@nexoracle/api";

const imdbCommand = {
  name: "imdb",
  aliases: ["movieinfo"],
  description: "Get imdb details about movies",
  usage: `${config.prefix}imdb <movie name>`,
  cooldown: 3000,

  run: async ({ Javix, prefix, jid, query, messages, reply, botPic, react }) => {
    if (!query) {
      return await reply(`*Please provide a movie name!*\n\nExample: ${prefix}imdb kingsman`);
    }
    await react("🔍");

    const result = await fetchApi.json(`${config.nex_api}/search/imdb`, { apikey: config.nex_key, q: query }, true);
    if (typeof result === "string" || !result.Title) {
      return await reply(result || "An error occured, please try again later.");
    }

    let imdbt = "";

    imdbt += "⚍⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚍\n" + " ```     𝕀𝕄𝔻𝔹 𝕊𝔼𝔸ℝℂℍ```\n" + "⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎⚎\n";
    imdbt += "*🎬Title:* " + result.Title + "\n";
    imdbt += "*📅Year:* " + result.Year + "\n";
    imdbt += "*⭐Rated:* " + result.Rated + "\n";
    imdbt += "*📆Released:* " + result.Released + "\n";
    imdbt += "*⏳Runtime:* " + result.Runtime + "\n";
    imdbt += "*🌀Genre:* " + result.Genre + "\n";
    imdbt += "*👨🏻‍💻Director:* " + result.Director + "\n";
    imdbt += "*✍Writer:* " + result.Writer + "\n";
    imdbt += "*👨Actors:* " + result.Actors + "\n";
    imdbt += "*📃Plot:* " + result.Plot + "\n";
    imdbt += "*🌐Language:* " + result.Language + "\n";
    imdbt += "*🌍Country:* " + result.Country + "\n";
    imdbt += "*🎖️Awards:* " + result.Awards + "\n";
    imdbt += "*📦BoxOffice:* " + result.BoxOffice + "\n";
    imdbt += "*🏙️Production:* " + result.Production + "\n";
    imdbt += "*🌟imdbRating:* " + result.imdbRating + "\n";
    imdbt += "*❎imdbVotes:* " + result.imdbVotes + "\n";

    return await Javix.sendMessage(jid, { image: { url: result.Poster || botPic() }, caption: imdbt }, { quoted: messages });
  },
};

const npmCommand = {
  name: "npm",
  description: "search and get details of any npm package",
  usage: `${config.prefix}npm <package name>`,
  cooldown: 3000,

  run: async ({ prefix, query, reply, react }) => {
    if (!query) {
      return await reply(`*Please provide package name!*\n\nExample: ${prefix}npm @nexoracle/utils`);
    }
    await react("🔍");

    const result = await fetchApi.json(`${config.nex_api}/search/npm`, { apikey: config.nex_key, q: query }, true);
    if (typeof result === "string" || !Array.isArray(result) || !result[0].downloads) {
      return await reply(result || "An error occured, please try again later.");
    }

    const npm = result[0];

    const info = `*NPM Search Results*\n
*Name:* ${npm.package.name || "N/A"}
*Version:* ${npm.package.version || "N/A"}
*License:* ${npm.package.license || "N/A"}
*Description:* ${npm.package.description || "N/A"}
*Weekly Downloads:* ${npm.downloads.weekly || "N/A"}
*Monthly Downlaods:* ${npm.downloads.monthly || "N/A"}
*Publisher:* ${npm.package.publisher.username || "N/A"}
*Email:* ${npm.package.publisher.email || "N/A"}

*LINKS:*
*Npm:* ${npm.package.links.npm || "N/A"}
*HomePage:* ${npm.package.links.homepage || "N/A"}
*Repository:* ${npm.package.links.repository || "N/A"}`;

    return await reply(info);
  },
};

const imageCommand = {
  name: "image",
  aliases: ["gimg", "img"],
  description: "search google images",
  usage: `${config.prefix}image quran`,
  cooldown: 3000,

  run: async ({ prefix, query, reply, Javix, jid, caption, messages: m, react }) => {
    try {
      if (!query) {
        return await reply(`*Please provide search query!*\n\nExample: ${prefix}image awm`);
      }
      await react("🔍");

      let [args, count] = query.split("|").map((v) => v.trim());
      count = parseInt(count) || 5;

      const result = await fetchApi.json(`${config.nex_api}/search/google-image`, { apikey: config.nex_key, q: args }, true);
      if (typeof result === "string" || !result || !Array.isArray(result)) {
        return await reply(result || "An error occured, please try again later.");
      }

      if (result.length === 0) return reply("No Image Found");
      const images = result.slice(0, Math.min(count, result.length));

      for (let url of images) {
        await Javix.sendMessage(jid, { image: { url }, caption: caption }, { quoted: m });
      }
    } catch (e) {
      console.error("error in image command:", e);
      await reply(e.message || "An error occured, please try again later.");
    }
  },
};

const matchesCommand = {
  name: "matches",
  description: "get matches info",
  cooldown: 3000,

  run: async ({ prefix, query, reply, react }) => {
    const result = await fetchApi.json(`${config.nex_api}/search/cricket`, { apikey: config.nex_key, q: query }, true);

    await react("🔍");

    if (typeof result === "string" || !Array.isArray(result) || !result[0].id) {
      return await reply(result || "An error occured, please try again later.");
    }

    let info = "";
    for (let i = 0; i < result.length; i++) {
      info += `\n*_Match Details => ${i}_*`;
      info += `\n*_Match Name:_* _${result[i].name}_`;
      info += `\n*_Match Type:_* _${result[i].matchType}_`;
      info += `\n*_Match Status:_* _${result[i].status}_`;
      info += `\n*_Match Date:_* _${result[i].date}_`;
      info += `\n*_Match Started:_* _${result[i].matchStarted}_`;
      info += `\n*_Match Ended:_* _${result[i].matchEnded}_`;

      if (result[i].score && result[i].score.length > 0) {
        info += `\n*_Match Score_*`;
        for (let j = 0; j < result[i].score.length; j++) {
          info += `\n   - _${result[i].score[j].inning}: ${result[i].score[j].r}/${result[i].score[j].w} *_in_* ${result[i].score[j].o}_ *_overs_*`;
        }
      }
      info += `\n`;
    }
    return await reply(info);
  },
};

const playStoreCommand = {
  name: "playstore",
  description: "search and get details of any playstore app",
  usage: `${config.prefix}playstore <app name>`,
  cooldown: 3000,

  run: async ({ prefix, query, reply, react, Javix, jid, messages: m, botPic }) => {
    if (!query) {
      return await reply(`*Please provide app name!*\n\nExample: ${prefix}playstore pubg`);
    }
    await react("🔍");

    const result = await fetchApi.json(`${config.nex_api}/search/playstore`, { apikey: config.nex_key, q: query }, true);
    if (typeof result === "string" || !Array.isArray(result) || !result[0].name) {
      return await reply(result || "An error occured, please try again later.");
    }

    const app = result[0];
    const img = app.img.replace("=s64", "=s512");

    let info = `*_PlayStore Search Results_*\n`;

    info += `\n*_Name:_* _${app.name || "N/A"}_`;
    info += `\n*_Developer:_* _${app.developer || "N/A"}_`;
    info += `\n*_Rating:_* _${app.rate2 || "N/A"}_`;
    info += `\n*_Link:_* _${app.link || "N/A"}_`;

    return await Javix.sendMessage(jid, { image: { url: img || botPic() }, caption: info }, { quoted: m });
  },
};

const spotifySearchCommand = {
  name: "sspotify",
  description: "search spotify songs",
  usage: `${config.prefix}spotify <song name>`,
  cooldown: 3000,

  run: async ({ prefix, query, reply, react, Javix, jid, messages: m, botPic }) => {
    if (!query) {
      return await reply(`*Please provide song name!*\n\nExample: ${prefix}sspotify bella ciao`);
    }
    await react("🔍");

    const result = await fetchApi.json(`${config.nex_api}/search/spotify`, { apikey: config.nex_key, q: query }, true);
    if (typeof result === "string" || !Array.isArray(result) || !result[0].title) {
      return await reply(result || "An error occured, please try again later.");
    }

    if (result.length === 0) return reply("no results found");

    const limit = result.length > 10 ? 10 : result.length;
    const img = "https://i.pinimg.com/736x/b0/34/43/b03443d126a71a91bc459b2fc11ae058.jpg";

    let info = `*_Spotify Song Search Results_*\n`;

    for (let i = 0; i < limit; i++) {
      info += `\n*_Title:_* _${result[i].title || "N/A"}_`;
      info += `\n*_Duration:_* _${result[i].duration || "N/A"}_`;
      info += `\n*_Popularity:_* _${result[i].popularity || "N/A"}_`;
      info += `\n*_Artist:_* _${result[i].artist || "N/A"}_`;
      info += `\n*_Link:_* _${result[i].url || "N/A"}_\n`;
    }

    return await Javix.sendMessage(jid, { image: { url: img || botPic() }, caption: info }, { quoted: m });
  },
};

export { imdbCommand, npmCommand, imageCommand, matchesCommand, playStoreCommand, spotifySearchCommand };
