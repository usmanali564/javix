import { fetchApi } from "@nexoracle/api";
import config from "#config";

const factcommand = {
  name: "fact",
  description: "get a random fact",
  cooldown: 3000,

  run: async ({ reply }) => {
    const api = await fetchApi.json(`${config.nex_api}/misc/facts`, { apikey: config.nex_key }, true);
    return reply(api.fact);
  },
};

export default factcommand;
