import { requireGroupPermissions } from "../../utils/groupChecks.js";

const groupInviteCommand = {
  name: "groupinvite",
  aliases: ["invite", "invitelink", "link"],
  description: "Generate and send the group invite link",
  usage: "!groupinvite",
  cooldown: 5000,

  run: async (ctx) => {
    const { Javix, messages: m, jid, groupMetadata } = ctx;
    if (!(await requireGroupPermissions(ctx))) return;

    try {
      await Javix.sendMessage(jid, { react: { text: "🪄", key: m.key } });

      const response = await Javix.groupInviteCode(jid);

      await Javix.sendMessage(
        jid,
        {
          text: `*Group Name:* *${groupMetadata.subject}*\n\n*Group Link:*\nhttps://chat.whatsapp.com/${response}`,
          contextInfo: {
            forwardingScore: 1000000000,
            isForwarded: true,
          },
        },
        { quoted: m, detectLink: true }
      );
    } catch (error) {
      console.error("Group invite command error:", error);
      await Javix.sendMessage(
        jid,
        {
          text: "*Failed to generate invite link!* Please try again later.",
        },
        { quoted: m }
      );
    }
  },
};

export default groupInviteCommand;
