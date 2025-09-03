import { requireGroupPermissions } from "../../utils/groupChecks.js";
import config from "#config";

const unmuteCommand = {
  name: "unmute",
  aliases: ["unsilent"],
  description: "Change group settings back to allow all participants to send messages",
  usage: "!unmute",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, jid, messages: m } = ctx;
    if (!(await requireGroupPermissions(ctx, { admin: true, botAdmin: true }))) return;

    await Javix.sendMessage(jid, { react: { text: "🔊", key: m.key } });

    await Javix.groupSettingUpdate(jid, "not_announcement")
      .then(async () => {
        await Javix.sendMessage(jid, { text: "🔊 *Group has been unmuted!*\nAll participants can send messages now." });
      })
      .catch(async (err) => {
        console.error("Unmute error:", err);
        await Javix.sendMessage(jid, { text: "*Failed to unmute group!* Please try again later." });
      });
  },
};

export default unmuteCommand;
