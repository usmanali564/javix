import { requireGroupPermissions } from "../../utils/groupChecks.js";
import config from "#config";

const muteCommand = {
  name: "mute",
  aliases: ["silent"],
  description: "Change group settings to admin-only messages",
  usage: "!mute",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, jid, messages: m } = ctx;
    if (!(await requireGroupPermissions(ctx, { admin: true, botAdmin: true }))) return;

    await Javix.sendMessage(jid, { react: { text: "🔇", key: m.key } });

    await Javix.groupSettingUpdate(jid, "announcement")
      .then(async () => {
        await Javix.sendMessage(jid, { text: "🔇 *Group has been muted!*\nOnly admins can send messages now." });
      })
      .catch(async (err) => {
        console.error("Mute error:", err);
        await Javix.sendMessage(jid, { text: "*Failed to mute group!* Please try again later." });
      });
  },
};

export default muteCommand;
