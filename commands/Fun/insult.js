import { fetchApi } from "@nexoracle/api";
import config from "#config";

const insultCommand = {
  name: "insult",
  description: "get a random insult line",
  cooldown: 3000,

  run: async ({ reply }) => {
    const insult = await fetchApi.json(`${config.nex_api}/misc/insult-lines`, { apikey: config.nex_key }, true);
    return reply(insult);
  },
};

export default insultCommand;
