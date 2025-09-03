import { fetchApi } from "@nexoracle/api";
import config from "#config";

const jokeCommand = {
  name: "joke",
  description: "get a random joke",
  usage: `${config.prefix}`,
  cooldown: 3000,

  run: async ({ reply }) => {
    const api = await fetchApi.json(`${config.nex_api}/misc/jokes2`, { apikey: config.nex_key }, true);
    return reply(api.joke);
  },
};

export default jokeCommand;
