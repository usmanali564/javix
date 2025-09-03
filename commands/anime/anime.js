import { fetchApi } from "@nexoracle/api";
import config from "#config";
import { urlValidator } from "@nexoracle/utils";

const gojoCommand = {
  name: "gojo",
  description: "sends gojo anime edit shorts",
  cooldown: 2000,

  run: async ({ reply, Javix, messages, jid }) => {
    const url = await fetchApi.json(`${config.nex_api}/anime/gojo`, { apikey: config.nex_key }, true);

    if (!urlValidator.isURL(url)) return reply(url || "Failed to send video");

    return await Javix.sendMessage(jid, { video: { url: url }, caption: config.caption }, { quoted: messages });
  },
};

const gokuCommand = {
  name: "goku",
  description: "sends goku anime edit shorts",
  cooldown: 2000,

  run: async ({ reply, Javix, messages, jid }) => {
    const url = await fetchApi.json(`${config.nex_api}/anime/goku`, { apikey: config.nex_key }, true);

    if (!urlValidator.isURL(url)) return reply(url || "Failed to send video");

    return await Javix.sendMessage(jid, { video: { url: url }, caption: config.caption }, { quoted: messages });
  },
};

const yujiCommand = {
  name: "yuji",
  description: "sends yuji anime edit shorts",
  cooldown: 2000,

  run: async ({ reply, Javix, messages, jid }) => {
    const url = await fetchApi.json(`${config.nex_api}/anime/yuji`, { apikey: config.nex_key }, true);

    if (!urlValidator.isURL(url)) return reply(url || "Failed to send video");

    return await Javix.sendMessage(jid, { video: { url: url }, caption: config.caption }, { quoted: messages });
  },
};

const yutaCommand = {
  name: "yuta",
  description: "sends yuta anime edit shorts",
  cooldown: 2000,

  run: async ({ reply, Javix, messages, jid }) => {
    const url = await fetchApi.json(`${config.nex_api}/anime/yuta`, { apikey: config.nex_key }, true);

    if (!urlValidator.isURL(url)) return reply(url || "Failed to send video");

    return await Javix.sendMessage(jid, { video: { url: url }, caption: config.caption }, { quoted: messages });
  },
};

export { gojoCommand, gokuCommand, yujiCommand, yutaCommand };
