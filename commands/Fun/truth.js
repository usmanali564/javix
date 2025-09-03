import { fetchApi } from "@nexoracle/api";
import config from "#config";

const truthCommand = {
  name: "truth",
  description: "get a random truth question",
  cooldown: 3000,

  run: async ({ reply }) => {
    const truth = await fetchApi.json(`${config.nex_api}/misc/truth`, { apikey: config.nex_key }, true);
    return reply(truth);
  },
};

export default truthCommand;
