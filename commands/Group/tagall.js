import { requireGroupPermissions } from "../../utils/groupChecks.js";
import config from "#config";

const tagallCommand = {
  name: "tagall",
  aliases: ["all", "everyone"],
  description: "Tag all group members with visible mentions",
  usage: "!tagall <message>",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, jid, messages: m, groupMetadata, text } = ctx;
    if (!(await requireGroupPermissions(ctx, { admin: true }))) return;

    await Javix.sendMessage(jid, { react: { text: "📣", key: m.key } });

    const members = groupMetadata.participants;
    const ownerJid = groupMetadata.owner?.toLowerCase();
    const botJid = Javix.user.id.toLowerCase();
    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber];
    const mentionText = members
      .map((member) => {
        const id = member.id;
        const number = id.split("@")[0];
        let emoji = "👤";
        if (id.toLowerCase() === ownerJid) emoji = "👑";
        else if (id.toLowerCase() === botJid) emoji = "🤖";
        else if (ownerNumbers.includes(number)) emoji = "⭐";
        else if (member.admin === "admin") emoji = "🛡️";
        return `${emoji} @${number}`;
      })
      .join("\n");
    const mentions = members.map((member) => member.id);

    await Javix.sendMessage(jid, {
      text: `📣 *Group Members*${text ? `\n\n${text}\n\n` : "\n\n"}${mentionText}`,
      mentions,
    }).catch(async (err) => {
      console.error("Tagall error:", err);
      await Javix.sendMessage(jid, { text: "*Failed to tag members!* Please try again later." });
    });
  },
};

export default tagallCommand;
