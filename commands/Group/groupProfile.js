import { requireGroupPermissions } from "../../utils/groupChecks.js";
import { extractTargetUserUniversal } from "../../utils/target.js";
import config from "#config";

const groupProfileCommand = {
  name: "groupprofile",
  aliases: ["gprofile", "gp"],
  description: "View or change group profile picture",
  usage: "!groupprofile [image]",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, messages: m, jid } = ctx;
    if (!(await requireGroupPermissions(ctx, { admin: true, botAdmin: true }))) return;
    try {
      await Javix.sendMessage(jid, { react: { text: "🖼️", key: m.key } });

      const quoted = m.quoted;
      if (!quoted || !quoted.message?.imageMessage) {
        return await Javix.sendMessage(jid, { text: "*Please reply to an image to set as group profile!*" });
      }

      const media = await Javix.downloadAndSaveMediaMessage(quoted);

      await Javix.updateProfilePicture(jid, { url: media })
        .then(async () => {
          await Javix.sendMessage(jid, { text: "🖼️ *Group profile picture updated successfully!*" });
        })
        .catch(async (err) => {
          console.error("Group profile update error:", err);
          await Javix.sendMessage(jid, { text: "*Failed to update group profile!* Please try again later." });
        });
    } catch (error) {
      console.error("Group profile command error:", error);
      await Javix.sendMessage(jid, { text: "*An error occurred!* Please try again later." });
    }
  },
};

export default groupProfileCommand;
