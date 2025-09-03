import { fetchApi } from "@nexoracle/api";
import config from "#config";

const dareCommand = {
  name: "dare",
  description: "get a random dare question",
  cooldown: 3000,

  run: async ({ reply }) => {
    const dare = await fetchApi.json(`${config.nex_api}/misc/dare`, { apikey: config.nex_key }, true);
    return reply(dare);
  },
};

export default dareCommand;
