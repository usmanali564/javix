import { sleep } from "@nexoracle/utils";

const planeCommand = {
  name: "plane",
  description: "Shows edits of a plane moving across the screen",
  cooldown: 3000,

  run: async ({ senderName, reply, edit }) => {
    const planeFrames = [
      "---------------\n✈-------------\n---------------",
      "---------------\n-✈------------\n---------------",
      "---------------\n--✈-----------\n---------------",
      "---------------\n---✈----------\n---------------",
      "---------------\n----✈---------\n---------------",
      "---------------\n-----✈--------\n---------------",
      "---------------\n------✈-------\n---------------",
      "---------------\n-------✈------\n---------------",
      "---------------\n--------✈-----\n---------------",
      "---------------\n---------✈----\n---------------",
      "---------------\n----------✈---\n---------------",
      "---------------\n-----------✈--\n---------------",
      "---------------\n------------✈-\n---------------",
      "---------------\n-------------✈\n---------------",
    ];

    try {
      const sentMsg = await reply(planeFrames[0]);

      for (let i = 1; i < planeFrames.length; i++) {
        await sleep(800);
        await edit(planeFrames[i], sentMsg.key);
      }
    } catch (error) {
      console.error("Error in plane command:", error);
      await reply("*failed!*");
    }
  },
};

export default planeCommand;
